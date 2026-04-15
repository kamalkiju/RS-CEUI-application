import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDocs, generateDocId } from '../../context/DocContext.jsx'
import {
  extractDocumentId,
  hasChangeIntent,
  inferSimulatedPocPatches,
  defaultChatSummary,
  delay,
  wantsPocChangeSummary,
  formatPocChangesForChat,
  buildChatWorkflowExtrasFromDoc,
  formatKmtReviewerContext,
} from '../../utils/chatWorkflowMock.js'

const PHASES = {
  idle: 'idle',
  init: 'initializing',
  analyze: 'analyzing',
  update: 'updating',
  done: 'done',
}

function ProgressPill({ phase }) {
  if (phase === PHASES.idle || phase === 'done') return null
  const labels = {
    [PHASES.init]: 'Initializing…',
    [PHASES.analyze]: 'Analyzing request…',
    [PHASES.update]: 'Updating changes…',
  }
  return (
    <div className="workflow-chat__progress" role="status" aria-live="polite">
      <span className="workflow-chat__progress-dot" />
      {labels[phase] || 'Working…'}
    </div>
  )
}

function BubbleText({ text }) {
  const lines = String(text || '').split('\n')
  return lines.map((line, li) => (
    <p key={li}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  ))
}

export default function WorkflowChatPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { docs, addDoc, updateDoc } = useDocs()
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      id: 'welcome',
      content:
        user?.role === 'POC'
          ? 'Pick a document and describe what to change (e.g. “K-5031 — update payment terms”). After you confirm, the chat lists only those wizard areas, **Open document** shows them highlighted, then **Save as draft** or **Submit for approval** (also available on the document page).'
          : user?.role === 'BUFM'
            ? 'Pick a document (or type an ID like K-5031). Ask to **show POC changes** — the chat lists **sections and fields** from the document metadata, then links to the review page with highlights.'
            : 'Pick a document and ask to see **POC updates** — sections, fields, resubmission note, plus BUFM/KMT context. Then open the document to view highlights.',
    },
  ])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState(PHASES.idle)
  const [attachedName, setAttachedName] = useState(null)
  const [voiceNote, setVoiceNote] = useState(null)
  const [selectedDocId, setSelectedDocId] = useState('')
  /** POC: pending confirm before simulated apply */
  const pendingPocRef = useRef(null)
  /** After confirm: last inferred patch (for Save draft / Submit from chat). */
  const lastPocChatPatchRef = useRef(null)
  const listEndRef = useRef(null)

  const role = user?.role || 'POC'

  const docOptions = useMemo(
    () =>
      [...docs]
        .filter(d => d.sub || d.id)
        .sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')))
        .slice(0, 40),
    [docs],
  )

  const resolveDoc = useCallback(
    id => {
      if (!id) return null
      return docs.find(d => d.id === id) || null
    },
    [docs],
  )

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

  const pushAssistant = (content, extra = {}) => {
    setMessages(prev => [...prev, { role: 'assistant', id: `a-${Date.now()}`, content, ...extra }])
  }
  const pushUser = content => {
    setMessages(prev => [...prev, { role: 'user', id: `u-${Date.now()}`, content }])
  }

  const runProgress = async () => {
    setPhase(PHASES.init)
    await delay(520)
    setPhase(PHASES.analyze)
    await delay(780)
    setPhase(PHASES.update)
    await delay(900)
    setPhase(PHASES.idle)
  }

  const navigateToDocPoc = (doc, extras) => {
    navigate('/poc/editor', {
      state: {
        doc,
        mode: 'view',
        fromChatWorkflow: extras,
      },
    })
  }

  const navigateToDocBufm = (docId, extras) => {
    navigate(`/bufm/document/${encodeURIComponent(docId)}`, {
      state: extras ? { fromChatWorkflow: extras } : {},
    })
  }

  const navigateToDocKmt = (docId, extras) => {
    navigate(`/kmt/document/${encodeURIComponent(docId)}`, {
      state: { ...(extras ? { fromChatWorkflow: extras } : {}), kmtEdit: false },
    })
  }

  const handleCloneDocument = () => {
    const src = resolveDoc(selectedDocId || extractDocumentId(input, docs))
    if (!src) {
      pushAssistant('Select a document in the dropdown first, or include a document ID like K-5031.')
      return
    }
    const newDoc = {
      ...src,
      id: generateDocId(),
      sub: `Copy of ${src.sub || src.id}`,
      status: 'draft',
      tabs: ['draft', 'all'],
      rejection_comment_BUFM: undefined,
      rejection_comment_KMT: undefined,
      rejection_highlight_sections: undefined,
      rejection_highlight_fields: undefined,
      rejection_feedback_items: undefined,
      poc_updated_sections: undefined,
      poc_updated_fields: undefined,
      pocResubmissionNote: undefined,
      updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }
    addDoc(newDoc)
    pushAssistant(`Created draft **${newDoc.id}**. Open it from Knowledge Documents → Draft.`)
  }

  const executePocPipeline = async (doc, text) => {
    const patches = inferSimulatedPocPatches(text)
    const summary = defaultChatSummary(doc)
    await runProgress()
    const extras = {
      sections: patches.sections,
      fields: patches.fields,
      summary,
    }
    lastPocChatPatchRef.current = {
      docId: doc.id,
      sections: patches.sections,
      fields: patches.fields,
    }
    const detail =
      patches.sections.length || patches.fields.length
        ? `**Sections to review**\n${patches.sections.length ? patches.sections.map(x => `• ${x}`).join('\n') : '• —'}\n\n**Fields to review**\n${patches.fields.length ? patches.fields.map(x => `• ${x}`).join('\n') : '• —'}`
        : '**Sections to review**\n• — (no keywords matched; open the document and edit the wizard, or describe a specific area such as fees or payment terms.)'
    pushAssistant(
      `**Summary (demo)**\n\n${summary}\n\n${detail}\n\nOpen the document to see only these areas highlighted in the wizard. Save as draft or submit for BUFM review from here or from the document toolbar.`,
      {
        actions: [
          { type: 'openDoc', label: 'Open document', doc, extras },
          { type: 'pocChatSaveDraft', label: 'Save as draft', docId: doc.id },
          { type: 'pocChatSubmitApproval', label: 'Submit for approval', docId: doc.id },
        ],
      },
    )
    pendingPocRef.current = null
  }

  const handleConfirmPoc = async () => {
    const p = pendingPocRef.current
    if (!p) return
    await executePocPipeline(p.doc, p.text)
  }

  const handleSend = async () => {
    const text = [input, voiceNote].filter(Boolean).join('\n').trim()
    if (!text && !attachedName) return
    const userLine = [text, attachedName ? `[attachment: ${attachedName}]` : ''].filter(Boolean).join('\n')
    pushUser(userLine)
    setInput('')
    setAttachedName(null)
    setVoiceNote(null)

    const docId = selectedDocId || extractDocumentId(userLine, docs)
    const doc = resolveDoc(docId)

    if (role === 'POC') {
      if (!docId || !doc) {
        pushAssistant(
          'I could not match a document. Pick one from **Document** above, or type an ID like **K-5031**, optionally with your requested changes.',
        )
        return
      }
      if (!hasChangeIntent(userLine)) {
        pushAssistant(
          `Found **${doc.sub || doc.id}** (${doc.id}). What changes would you like to make?\n\nYou can also **clone** this document to start a new draft with the same baseline.`,
          {
            actions: [
              { type: 'clone', label: 'Clone this document' },
              { type: 'hint', label: 'Example: “Update Payment & Billing — clarify payment terms”' },
            ],
          },
        )
        return
      }
      const patches = inferSimulatedPocPatches(userLine)
      const pend = { doc, text: userLine, patches }
      pendingPocRef.current = pend
      const preview =
        patches.sections.length || patches.fields.length
          ? `**Sections**\n${patches.sections.map(x => `• ${x}`).join('\n')}\n\n**Fields**\n${patches.fields.map(x => `• ${x}`).join('\n')}`
          : '**Sections / fields**\n• No wizard areas were inferred — try phrasing like “update fees” or “K-5031 — change payment terms”. You can still confirm to continue and edit in the document.'
      pushAssistant(
        `**Confirm updates (demo)** — only these wizard areas will be highlighted after you confirm:\n\n${preview}\n\nConfirm to continue, or edit your message and send again.`,
        {
          actions: [{ type: 'confirmPoc', label: 'Confirm & apply (demo)' }],
        },
      )
      return
    }

    if (role === 'BUFM') {
      if (!doc) {
        pushAssistant(
          'Select a document above or type an ID (e.g. **K-5031**), then ask to **show POC changes** to list sections and fields updated by the POC.',
        )
        return
      }
      if (!wantsPocChangeSummary(userLine)) {
        pushAssistant(
          `Matched **${doc.sub || doc.id}** (\`${doc.id}\`). To see **what the POC changed** (sections & fields from the system), say e.g. “show POC changes” or “need to see updates after resubmission”.`,
          {
            actions: [
              {
                type: 'openBufm',
                label: 'Open document anyway',
                docId: doc.id,
                extras: buildChatWorkflowExtrasFromDoc(doc),
              },
            ],
          },
        )
        return
      }
      await runProgress()
      const extras = buildChatWorkflowExtrasFromDoc(doc)
      const body = formatPocChangesForChat(doc, { roleLabel: 'POC' })
      pushAssistant(body, {
        actions: [
          {
            type: 'openBufm',
            label: extras ? 'View document (POC highlights)' : 'Open BUFM document review',
            docId: doc.id,
            extras,
          },
        ],
      })
      return
    }

    if (role === 'KMT') {
      if (!doc) {
        pushAssistant(
          'Select a document or type an ID, then ask to **show POC changes** to list section- and field-level updates plus reviewer context.',
        )
        return
      }
      if (!wantsPocChangeSummary(userLine)) {
        pushAssistant(
          `Matched **${doc.sub || doc.id}** (\`${doc.id}\`). Ask to **show POC changes** or **list POC updates** to analyze metadata; or open the document below.`,
          {
            actions: [
              {
                type: 'openKmt',
                label: 'Open document',
                docId: doc.id,
                extras: buildChatWorkflowExtrasFromDoc(doc),
              },
              { type: 'delegate', label: 'Release to another BUFM (demo)' },
              { type: 'history', label: 'View change history (demo)' },
            ],
          },
        )
        return
      }
      await runProgress()
      const extras = buildChatWorkflowExtrasFromDoc(doc)
      const body =
        formatPocChangesForChat(doc, { roleLabel: 'POC' }) + formatKmtReviewerContext(doc)
      pushAssistant(body, {
        actions: [
          {
            type: 'openKmt',
            label: extras ? 'View document (POC highlights)' : 'Open KMT document review',
            docId: doc.id,
            extras,
          },
          { type: 'delegate', label: 'Release to another BUFM (demo)' },
          { type: 'history', label: 'View change history (demo)' },
        ],
      })
    }
  }

  const onAction = (action, msg) => {
    if (action.type === 'openDoc' && action.doc) {
      navigateToDocPoc(action.doc, action.extras)
      return
    }
    if (action.type === 'openBufm' && action.docId) {
      navigateToDocBufm(action.docId, action.extras)
      return
    }
    if (action.type === 'openKmt' && action.docId) {
      navigateToDocKmt(action.docId, action.extras)
      return
    }
    if (action.type === 'clone') {
      handleCloneDocument()
      return
    }
    if (action.type === 'confirmPoc') {
      handleConfirmPoc()
      return
    }
    if (action.type === 'pocChatSaveDraft' && action.docId) {
      const st = lastPocChatPatchRef.current
      if (!st || st.docId !== action.docId) {
        pushAssistant(
          'Confirm your update on the previous assistant message (**Confirm & apply**), then use Save as draft again.',
        )
        return
      }
      updateDoc(action.docId, {
        status: 'draft',
        tabs: ['draft', 'all'],
        poc_updated_sections: st.sections,
        poc_updated_fields: st.fields,
      })
      const d = resolveDoc(action.docId)
      pushAssistant(
        `**${d?.sub || action.docId}** (\`${action.docId}\`) is saved as a **draft**. Open **Knowledge Documents** → **Draft Documents** to continue editing.`,
      )
      return
    }
    if (action.type === 'pocChatSubmitApproval' && action.docId) {
      const st = lastPocChatPatchRef.current
      if (!st || st.docId !== action.docId) {
        pushAssistant(
          'Confirm your update on the previous assistant message (**Confirm & apply**), then use Submit for approval again.',
        )
        return
      }
      const today = new Date().toISOString().slice(0, 10)
      updateDoc(action.docId, {
        status: 'Pending_BUFM',
        tabs: ['approval', 'all'],
        submittedDate: today,
        poc_updated_sections: st.sections,
        poc_updated_fields: st.fields,
      })
      const d = resolveDoc(action.docId)
      pushAssistant(
        `**${d?.sub || action.docId}** (\`${action.docId}\`) is **submitted for BUFM review**. It appears under **Awaiting Approval** for POC and in the BUFM review queue.`,
      )
      return
    }
    if (action.type === 'hint') {
      setInput('K-5031 — update document title and contract activation date')
      return
    }
    if (action.type === 'delegate') {
      window.alert('Demo: task would be reassigned in BUFM queue (no backend).')
      return
    }
    if (action.type === 'history') {
      window.alert('Demo: opens version history — use “View Version History” on the document page.')
      return
    }
  }

  const onFile = e => {
    const f = e.target.files?.[0]
    if (f) setAttachedName(f.name)
    e.target.value = ''
  }

  const onVoice = () => {
    setVoiceNote('Voice transcript (demo): please update fees section to match regional schedule.')
    pushAssistant('Voice captured (demo). Transcript was added to your next message — press Send to continue.')
  }

  return (
    <Layout>
      <main className="workflow-chat">
        <header className="workflow-chat__head">
          <div>
            <h1 className="workflow-chat__title">Workflow chat</h1>
            <p className="workflow-chat__sub">
              {role === 'POC' && 'Create and edit knowledge documents with guided steps and highlights.'}
              {role === 'BUFM' && 'Review POC changes with links into BUFM document detail.'}
              {role === 'KMT' && 'Final oversight: POC deltas, BUFM context, and KMT review links.'}
            </p>
          </div>
          <div className="workflow-chat__doc-pick">
            <label className="workflow-chat__pick-label" htmlFor="chat-doc-select">
              Document
            </label>
            <select
              id="chat-doc-select"
              className="workflow-chat__select"
              value={selectedDocId}
              onChange={e => setSelectedDocId(e.target.value)}
            >
              <option value="">— Optional: select document —</option>
              {docOptions.map(d => (
                <option key={d.id} value={d.id}>
                  {d.id} · {d.sub?.slice(0, 48) || '—'}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="workflow-chat__panel">
          <aside className="workflow-chat__aside">
            <h3 className="workflow-chat__aside-title">How it works</h3>
            <ul className="workflow-chat__aside-list">
              {role === 'POC' && (
                <>
                  <li>Include document ID (e.g. K-5031) and describe changes after an em dash.</li>
                  <li>Confirm, then open the document — only inferred sections/fields are highlighted.</li>
                  <li>Save as draft or submit for approval from the chat or the document toolbar.</li>
                  <li>Submit sends the doc to Awaiting Approval and the BUFM queue.</li>
                </>
              )}
              {role === 'BUFM' && (
                <>
                  <li>Select a document, then send to load POC update summary.</li>
                  <li>Open review shows POC (green) and reviewer (orange) highlights.</li>
                  <li>Approve / Reject from the document page as usual.</li>
                </>
              )}
              {role === 'KMT' && (
                <>
                  <li>Select a document for stacked POC + BUFM context (demo).</li>
                  <li>Open KMT review uses read-only highlights (use View, not Edit, for full highlights).</li>
                  <li>Delegate / history actions are demo placeholders.</li>
                </>
              )}
            </ul>
          </aside>

          <div className="workflow-chat__main">
            <div className="workflow-chat__messages">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`workflow-chat__msg workflow-chat__msg--${m.role}`}
                >
                  <div className="workflow-chat__bubble">
                    <div className="workflow-chat__markdown">
                      <BubbleText text={m.content} />
                    </div>
                    {m.actions?.length > 0 && (
                      <div className="workflow-chat__actions">
                        {m.actions.map((a, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`btn ${a.type === 'confirmPoc' ? 'btn-primary' : 'btn-outline'} btn-sm`}
                            onClick={() => onAction(a, m)}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <ProgressPill phase={phase} />
              <div ref={listEndRef} />
            </div>

            <div className="workflow-chat__composer">
              <div className="workflow-chat__composer-tools">
                <label className="workflow-chat__file-btn">
                  <input type="file" className="workflow-chat__file-input" onChange={onFile} accept=".pdf,.doc,.docx,.txt,.csv" />
                  Attach file
                </label>
                <button type="button" className="btn btn-text btn-sm" onClick={onVoice}>
                  Voice (demo)
                </button>
                {attachedName && <span className="workflow-chat__attach-name">{attachedName}</span>}
                {voiceNote && <span className="workflow-chat__attach-name">Voice ready</span>}
              </div>
              <textarea
                className="workflow-chat__input"
                rows={3}
                placeholder={
                  role === 'POC'
                    ? 'e.g. K-5031 — update Payment & Billing Terms: clarify Net 30…'
                    : 'e.g. K-5048 — show POC updates for final review'
                }
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <div className="workflow-chat__composer-foot">
                <span className="workflow-chat__hint">⌘/Ctrl + Enter to send</span>
                <button type="button" className="btn btn-primary" disabled={phase !== PHASES.idle} onClick={handleSend}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  )
}

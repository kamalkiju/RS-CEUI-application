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
  const { docs, addDoc } = useDocs()
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      id: 'welcome',
      content:
        user?.role === 'POC'
          ? 'Describe the document and what to change — for example: “K-5031 — update Basic Information: set contract activation date to next quarter.” You can also attach a file or use voice (demo).'
          : user?.role === 'BUFM'
            ? 'Enter a document ID or paste a title to see POC changes, BUFM context, and open the review detail page with highlights.'
            : 'Enter a document ID or title to see POC updates, BUFM comments, routing options, and open the KMT review view with highlights.',
    },
  ])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState(PHASES.idle)
  const [attachedName, setAttachedName] = useState(null)
  const [voiceNote, setVoiceNote] = useState(null)
  const [selectedDocId, setSelectedDocId] = useState('')
  /** POC: pending confirm before simulated apply */
  const pendingPocRef = useRef(null)
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
      state: { fromChatWorkflow: extras },
    })
  }

  const navigateToDocKmt = (docId, extras) => {
    navigate(`/kmt/document/${encodeURIComponent(docId)}`, {
      state: { fromChatWorkflow: extras, kmtEdit: false },
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
    pushAssistant(
      `**Summary of changes (demo)**\n\n${summary}\n\n• Sections: ${patches.sections.join(', ')}\n• Fields: ${patches.fields.join(', ')}\n\nOpen the document to review highlighted areas.`,
      {
        actions: [{ type: 'openDoc', label: 'Open document (highlights)', doc, extras }],
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
      pushAssistant(
        `**Confirm updates (demo)** — I will apply the following highlights for your review:\n\n• Sections: ${patches.sections.join(', ')}\n• Fields: ${patches.fields.join(', ')}\n\nConfirm to continue, or edit your message and send again.`,
        {
          actions: [{ type: 'confirmPoc', label: 'Confirm & apply (demo)' }],
        },
      )
      return
    }

    if (role === 'BUFM') {
      if (!doc) {
        pushAssistant('Select or name a document (ID in message or dropdown) to load BUFM review context.')
        return
      }
      await runProgress()
      const patches = inferSimulatedPocPatches(userLine)
      const extras = { sections: patches.sections, fields: patches.fields, summary: 'POC-submitted updates (simulated)' }
      pushAssistant(
        `**${doc.sub || doc.id}** — Simulated POC changes pending your review.\n\n• ${doc.pocResubmissionNote || 'No resubmission note on file.'}\n\nOpen the document to see **green** highlights for POC updates and **orange** for reviewer flags.`,
        {
          actions: [{ type: 'openBufm', label: 'Open BUFM document review', docId: doc.id, extras }],
        },
      )
      return
    }

    if (role === 'KMT') {
      if (!doc) {
        pushAssistant('Select or name a document to load KMT oversight context.')
        return
      }
      await runProgress()
      const patches = inferSimulatedPocPatches(userLine)
      const extras = { sections: patches.sections, fields: patches.fields, summary: 'Stack: POC + BUFM + KMT (demo)' }
      pushAssistant(
        `**${doc.sub || doc.id}**\n\n• **POC changes (simulated):** ${patches.sections.slice(0, 2).join(', ') || '—'}\n• **BUFM:** ${doc.rejection_comment_BUFM || doc.approved_by_BUFM ? 'Approved by BUFM' : '—'}\n• **Comments:** ${doc.rejection_comment_KMT || '—'}\n\nUse **Open KMT review** for highlighted read-only steps. **Release to another BUFM** is a demo handoff; **Version history** is in the document drawer.`,
        {
          actions: [
            { type: 'openKmt', label: 'Open KMT document review', docId: doc.id, extras },
            { type: 'delegate', label: 'Release to another BUFM (demo)' },
            { type: 'history', label: 'View change history (demo)' },
          ],
        },
      )
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
    if (action.type === 'hint') {
      setInput('K-5031 — update Basic Information: set document title and contract activation date')
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
                  <li>Include document ID (e.g. K-5031) and describe changes.</li>
                  <li>Confirm the simulated patch, then open the document with highlights.</li>
                  <li>Document name only → we ask what to change; you can clone.</li>
                  <li>Rejected docs: open from Rejected tab — highlights show reviewer fields.</li>
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

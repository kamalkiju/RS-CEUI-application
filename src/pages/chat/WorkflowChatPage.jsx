import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
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

const POC_CHAT_STORAGE_KEY = 'rs-poc-workflow-chat-v1'
const POC_CHAT_PATH = '/poc/chat'

function pocWelcomeMessages(user) {
  return [
    {
      role: 'assistant',
      id: 'welcome',
      content:
        'Welcome to **document chat**. Pick a document (sidebar or dropdown), describe changes (e.g. “K-5031 — update payment terms”), then **Confirm & apply**. You will see **what changed**, then **Open document** for highlights. Use **Save as draft** or **Submit for approval** when ready.',
    },
  ]
}

function serializeSessions(sessions) {
  return sessions.map(s => ({
    ...s,
    messages: s.messages.map(m => ({
      ...m,
      actions: m.actions?.map(a => {
        if (a.doc) {
          const { doc, ...rest } = a
          return { ...rest, docId: doc.id }
        }
        return { ...a, doc: undefined }
      }),
    })),
  }))
}

function hydrateSessions(sessions, docs) {
  return sessions.map(s => ({
    ...s,
    messages: s.messages.map(m => ({
      ...m,
      actions: m.actions?.map(a => {
        if (a.type === 'openDoc' && a.docId && !a.doc) {
          const doc = docs.find(d => d.id === a.docId)
          return doc ? { ...a, doc } : a
        }
        return a
      }),
    })),
  }))
}

function loadPocChatState(user) {
  try {
    const raw = localStorage.getItem(POC_CHAT_STORAGE_KEY)
    if (!raw) throw new Error('empty')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.sessions) || !parsed.sessions.length) throw new Error('bad')
    let activeSessionId = parsed.activeSessionId || parsed.sessions[0].id
    if (!parsed.sessions.some(s => s.id === activeSessionId)) activeSessionId = parsed.sessions[0].id
    return { sessions: parsed.sessions, activeSessionId }
  } catch {
    const id = `s-${Date.now()}`
    return {
      sessions: [
        {
          id,
          docId: null,
          title: 'New document chat',
          updatedAt: Date.now(),
          messages: pocWelcomeMessages(user),
        },
      ],
      activeSessionId: id,
    }
  }
}

function ProgressPill({ phase }) {
  if (phase === PHASES.idle || phase === PHASES.done) return null
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
  const location = useLocation()
  const { docs, addDoc, updateDoc } = useDocs()

  const role = user?.role || 'POC'

  const pocInit = useMemo(() => loadPocChatState(user), [user?.id])
  const [pocSessions, setPocSessions] = useState(() =>
    pocInit.sessions.map(s => ({ ...s, messages: s.messages.map(m => ({ ...m })) })),
  )
  const [pocActiveSessionId, setPocActiveSessionId] = useState(() => pocInit.activeSessionId)
  const [submitModalDocId, setSubmitModalDocId] = useState(null)
  const [uploadPct, setUploadPct] = useState(0)

  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      id: 'welcome',
      content:
        user?.role === 'POC'
          ? ''
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
  const pendingPocRef = useRef(null)
  const lastPocChatPatchRef = useRef(null)
  const listEndRef = useRef(null)
  const pocActiveSessionIdRef = useRef(pocActiveSessionId)

  useEffect(() => {
    pocActiveSessionIdRef.current = pocActiveSessionId
  }, [pocActiveSessionId])

  const pocMessages = useMemo(
    () => pocSessions.find(s => s.id === pocActiveSessionId)?.messages ?? [],
    [pocSessions, pocActiveSessionId],
  )

  useEffect(() => {
    if (role !== 'POC' || !docs.length) return
    setPocSessions(prev => hydrateSessions(prev, docs))
  }, [docs, role])

  useEffect(() => {
    if (role !== 'POC') return
    try {
      localStorage.setItem(
        POC_CHAT_STORAGE_KEY,
        JSON.stringify({
          sessions: serializeSessions(pocSessions),
          activeSessionId: pocActiveSessionId,
        }),
      )
    } catch {
      /* ignore quota */
    }
  }, [pocSessions, pocActiveSessionId, role])

  useEffect(() => {
    if (role !== 'POC') return
    const focus = location.state?.chatSessionFocus
    if (!focus) return
    if (!pocSessions.some(s => s.id === focus)) return
    setPocActiveSessionId(focus)
    navigate(POC_CHAT_PATH, { replace: true, state: {} })
  }, [location.state, role, navigate, pocSessions])

  useEffect(() => {
    if (!attachedName || role !== 'POC') {
      setUploadPct(0)
      return
    }
    setUploadPct(8)
    const t0 = window.setInterval(() => {
      setUploadPct(p => {
        if (p >= 100) {
          window.clearInterval(t0)
          return 100
        }
        return Math.min(100, p + 12 + Math.round(Math.random() * 8))
      })
    }, 220)
    return () => window.clearInterval(t0)
  }, [attachedName, role])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [pocMessages, messages, phase, pocActiveSessionId])

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

  const pushAssistantPoc = useCallback((content, extra = {}) => {
    const sid = pocActiveSessionIdRef.current
    setPocSessions(prev =>
      prev.map(s =>
        s.id !== sid
          ? s
          : {
              ...s,
              messages: [...s.messages, { role: 'assistant', id: `a-${Date.now()}`, content, ...extra }],
              updatedAt: Date.now(),
            },
      ),
    )
  }, [])

  const pushUserPoc = useCallback(content => {
    const sid = pocActiveSessionIdRef.current
    setPocSessions(prev =>
      prev.map(s =>
        s.id !== sid
          ? s
          : {
              ...s,
              messages: [...s.messages, { role: 'user', id: `u-${Date.now()}`, content }],
              updatedAt: Date.now(),
            },
      ),
    )
  }, [])

  const updatePocSessionMeta = useCallback((docId, docObj) => {
    const sid = pocActiveSessionIdRef.current
    setPocSessions(prev =>
      prev.map(s => {
        if (s.id !== sid) return s
        const nextDoc = docId || s.docId
        const d = docObj || (nextDoc ? resolveDoc(nextDoc) : null)
        return {
          ...s,
          docId: nextDoc,
          title: d ? `${d.id} · ${(d.sub || '').slice(0, 38)}` : s.title,
          updatedAt: Date.now(),
        }
      }),
    )
  }, [resolveDoc])

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
        returnToChat: POC_CHAT_PATH,
        pocChatSessionId: pocActiveSessionIdRef.current,
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

  const startNewPocChat = () => {
    const id = `s-${Date.now()}`
    pendingPocRef.current = null
    lastPocChatPatchRef.current = null
    setPocSessions(prev => [
      {
        id,
        docId: null,
        title: 'New document chat',
        updatedAt: Date.now(),
        messages: pocWelcomeMessages(user),
      },
      ...prev,
    ])
    setPocActiveSessionId(id)
    setSelectedDocId('')
    setAttachedName(null)
    setVoiceNote(null)
  }

  const handleCloneDocument = () => {
    const src = resolveDoc(selectedDocId || extractDocumentId(input, docs))
    if (!src) {
      if (role === 'POC') {
        pushAssistantPoc('Select a document in the dropdown first, or include a document ID like K-5031.')
      } else {
        pushAssistant('Select a document in the dropdown first, or include a document ID like K-5031.')
      }
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
    if (role === 'POC') {
      pushAssistantPoc(`Created draft **${newDoc.id}**. Open it from Knowledge Documents → Draft.`)
    } else {
      pushAssistant(`Created draft **${newDoc.id}**. Open it from Knowledge Documents → Draft.`)
    }
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
        ? `**What we will highlight (demo)**\n\n**Sections**\n${patches.sections.length ? patches.sections.map(x => `• ${x}`).join('\n') : '• —'}\n\n**Fields**\n${patches.fields.length ? patches.fields.map(x => `• ${x}`).join('\n') : '• —'}`
        : '**What we will highlight**\n• No wizard areas were inferred — open the document to edit manually, or describe fees, payment, title, etc.'
    pushAssistantPoc(
      `${detail}\n\n---\n\n**Summary (demo)**\n${summary}\n\nOpen the document to see these areas in **green** in the wizard. Then **Save as draft** or **Submit for approval** below or on the document page.`,
      {
        actions: [
          { type: 'openDoc', label: 'Open document', docId: doc.id, doc, extras },
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

  const confirmSubmitToBufm = () => {
    const docId = submitModalDocId
    if (!docId) return
    const st = lastPocChatPatchRef.current
    if (!st || st.docId !== docId) {
      setSubmitModalDocId(null)
      pushAssistantPoc('Confirm your update (**Confirm & apply**) before submitting for approval.')
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    updateDoc(docId, {
      status: 'Pending_BUFM',
      tabs: ['approval', 'all'],
      submittedDate: today,
      poc_updated_sections: st.sections,
      poc_updated_fields: st.fields,
    })
    const d = resolveDoc(docId)
    pushAssistantPoc(
      `**${d?.sub || docId}** (\`${docId}\`) has been **sent to BUFM for approval**. It appears under **Awaiting Approval** and in the BUFM review queue.`,
    )
    setSubmitModalDocId(null)
  }

  const handleSend = async () => {
    const text = [input, voiceNote].filter(Boolean).join('\n').trim()
    if (!text && !attachedName) return
    const userLine = [text, attachedName ? `[attachment: ${attachedName}]` : ''].filter(Boolean).join('\n')

    if (role === 'POC') {
      pushUserPoc(userLine)
      const docId = selectedDocId || extractDocumentId(userLine, docs)
      const doc = resolveDoc(docId)
      updatePocSessionMeta(docId, doc)
    } else {
      pushUser(userLine)
    }

    setInput('')
    setAttachedName(null)
    setVoiceNote(null)

    const docId = selectedDocId || extractDocumentId(userLine, docs)
    const doc = resolveDoc(docId)

    if (role === 'POC') {
      if (!docId || !doc) {
        pushAssistantPoc(
          'I could not match a document. Choose one in the **Document** dropdown or type an ID like **K-5031**, then describe your changes.',
        )
        return
      }
      if (!hasChangeIntent(userLine)) {
        pushAssistantPoc(
          `Matched **${doc.sub || doc.id}** (\`${doc.id}\`). What would you like to change?\n\nYou can **clone** this document to start a new draft with the same baseline.`,
          {
            actions: [
              { type: 'clone', label: 'Clone this document' },
              { type: 'hint', label: 'Example prompt' },
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
          ? `**Planned highlights (demo)**\n\n**Sections**\n${patches.sections.map(x => `• ${x}`).join('\n')}\n\n**Fields**\n${patches.fields.map(x => `• ${x}`).join('\n')}`
          : '**Planned highlights**\n• No areas inferred from wording — try “update fees” or “K-5031 — change payment terms”. You can still confirm to continue.'
      pushAssistantPoc(
        `${preview}\n\nConfirm to generate the preview and actions below, or edit your message and send again.`,
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
    if (action.type === 'openDoc') {
      const d = action.doc || resolveDoc(action.docId)
      if (!d) {
        if (role === 'POC') pushAssistantPoc('Document is no longer in the catalog (demo).')
        return
      }
      navigateToDocPoc(d, action.extras)
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
        if (role === 'POC') {
          pushAssistantPoc(
            'Confirm your update on the previous assistant message (**Confirm & apply**), then use **Save as draft** again.',
          )
        }
        return
      }
      updateDoc(action.docId, {
        status: 'draft',
        tabs: ['draft', 'all'],
        poc_updated_sections: st.sections,
        poc_updated_fields: st.fields,
      })
      const d = resolveDoc(action.docId)
      if (role === 'POC') {
        pushAssistantPoc(
          `**${d?.sub || action.docId}** is saved as a **draft** with your highlighted changes. Find it under **Knowledge Documents → Draft documents**.`,
        )
      }
      return
    }
    if (action.type === 'pocChatSubmitApproval' && action.docId) {
      setSubmitModalDocId(action.docId)
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
    if (role === 'POC') {
      pushAssistantPoc('Voice captured (demo). Transcript will be included when you press **Send**.')
    } else {
      pushAssistant('Voice captured (demo). Transcript was added to your next message — press Send to continue.')
    }
  }

  const renderMessageList = (msgList, isPoc) => (
    <>
      {msgList.map(m => (
        <div key={m.id} className={`workflow-chat__msg workflow-chat__msg--${m.role}`}>
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
    </>
  )

  if (role === 'POC') {
    const sortedSessions = [...pocSessions].sort((a, b) => b.updatedAt - a.updatedAt)
    return (
      <Layout>
        <main className="workflow-chat workflow-chat--poc">
          {submitModalDocId && (
            <div
              className="workflow-chat-poc-modal-backdrop"
              role="presentation"
              onClick={() => setSubmitModalDocId(null)}
            >
              <div
                className="workflow-chat-poc-modal"
                role="dialog"
                aria-labelledby="poc-submit-modal-title"
                onClick={e => e.stopPropagation()}
              >
                <h2 id="poc-submit-modal-title" className="workflow-chat-poc-modal__title">
                  Send to BUFM for approval?
                </h2>
                <p className="workflow-chat-poc-modal__body">
                  This document will move to <strong>Awaiting approval</strong> and appear in the BUFM review queue. You can return here from the document using <strong>Back</strong>.
                </p>
                <div className="workflow-chat-poc-modal__actions">
                  <button type="button" className="btn btn-outline" onClick={() => setSubmitModalDocId(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={confirmSubmitToBufm}>
                    Send to BUFM
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="workflow-chat-poc__shell">
            <aside className="workflow-chat-poc__sidebar" aria-label="Chat history">
              <Link to="/poc" className="workflow-chat-poc__back-link">
                ← Knowledge documents
              </Link>

              <div className="workflow-chat-poc__nav-section">
                <button type="button" className="workflow-chat-poc__nav-head" aria-expanded="true">
                  <span>Document chat</span>
                  <span className="workflow-chat-poc__chevron" aria-hidden>
                    ▾
                  </span>
                </button>
                <button type="button" className="workflow-chat-poc__new-chat btn btn-primary btn-sm" onClick={startNewPocChat}>
                  + New chat
                </button>
                <ul className="workflow-chat-poc__history">
                  {sortedSessions.map(s => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`workflow-chat-poc__history-item${s.id === pocActiveSessionId ? ' workflow-chat-poc__history-item--active' : ''}`}
                        onClick={() => {
                          setPocActiveSessionId(s.id)
                          pendingPocRef.current = null
                          lastPocChatPatchRef.current = null
                        }}
                      >
                        <span className="workflow-chat-poc__history-title">{s.title}</span>
                        <span className="workflow-chat-poc__history-meta">
                          {s.messages.length} message{s.messages.length === 1 ? '' : 's'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="workflow-chat-poc__sidebar-foot">
                <p className="workflow-chat-poc__hint-block">
                  Demo only — attachments are not uploaded to a server.
                </p>
              </div>
            </aside>

            <div className="workflow-chat-poc__main">
              <div className="workflow-chat-poc__main-scroll">
                <div className="workflow-chat-poc__hero">
                  <h1 className="workflow-chat-poc__hero-title">Document chat</h1>
                  <p className="workflow-chat-poc__hero-sub">
                    Pick a document, describe your updates, then confirm. Opening the document shows matching sections and fields highlighted in green.
                  </p>
                </div>

                <div className="workflow-chat-poc__doc-bar">
                  <label className="workflow-chat-poc__doc-label" htmlFor="chat-doc-select-poc">
                    Active document
                  </label>
                  <select
                    id="chat-doc-select-poc"
                    className="workflow-chat-poc__doc-select"
                    value={selectedDocId}
                    onChange={e => setSelectedDocId(e.target.value)}
                  >
                    <option value="">Select a document…</option>
                    {docOptions.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.id} · {d.sub?.slice(0, 48) || '—'}
                      </option>
                    ))}
                  </select>
                </div>

                {attachedName && (
                  <div className="workflow-chat-poc__upload-card">
                    <div className="workflow-chat-poc__upload-row">
                      <span className="workflow-chat-poc__upload-name">{attachedName}</span>
                      <button
                        type="button"
                        className="workflow-chat-poc__upload-dismiss"
                        aria-label="Remove attachment"
                        onClick={() => setAttachedName(null)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="workflow-chat-poc__upload-bar" role="progressbar" aria-valuenow={uploadPct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="workflow-chat-poc__upload-bar-fill" style={{ width: `${uploadPct}%` }} />
                    </div>
                    <p className="workflow-chat-poc__upload-status">Uploading — {uploadPct}%</p>
                  </div>
                )}

                <div className="workflow-chat-poc__messages">{renderMessageList(pocMessages, true)}</div>
              </div>

              <div className="workflow-chat-poc__composer-wrap">
                <div className="workflow-chat-poc__composer-tools">
                  <label className="workflow-chat-poc__icon-btn workflow-chat-poc__icon-btn--text" title="Attach file">
                    <input type="file" className="workflow-chat__file-input" onChange={onFile} accept=".pdf,.doc,.docx,.txt,.csv" />
                    Attach
                  </label>
                  <button type="button" className="workflow-chat-poc__icon-btn workflow-chat-poc__icon-btn--text" onClick={onVoice} title="Voice (demo)">
                    Voice
                  </button>
                </div>
                <div className="workflow-chat-poc__input-row">
                  <input
                    type="text"
                    className="workflow-chat-poc__input"
                    placeholder="Describe your request (document ID + changes)…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (phase === PHASES.idle) handleSend()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="workflow-chat-poc__send"
                    disabled={phase !== PHASES.idle}
                    aria-label="Send"
                    onClick={handleSend}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
                <p className="workflow-chat-poc__composer-hint">Enter to send · Demo workflow (no live AI)</p>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    )
  }

  return (
    <Layout>
      <main className="workflow-chat">
        <header className="workflow-chat__head">
          <div>
            <h1 className="workflow-chat__title">Workflow chat</h1>
            <p className="workflow-chat__sub">
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
            <div className="workflow-chat__messages">{renderMessageList(messages, false)}</div>

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
                placeholder={role === 'BUFM' ? 'e.g. K-5048 — show POC updates for final review' : 'e.g. K-5048 — show POC updates for final review'}
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

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDocs, generateDocId } from '../../context/DocContext.jsx'
import {
  resolveChatDocumentId,
  inferSimulatedPocPatches,
  ensurePocChatPatches,
  defaultChatSummary,
  delay,
  formatPocChangesForChat,
  buildChatWorkflowExtrasFromDoc,
  buildNavigationExtrasForReviewer,
  formatKmtReviewerContext,
} from '../../utils/chatWorkflowMock.js'

const CHAT_PROMPT_NONE = '__none__'

function WorkflowChatPromptSelect({ id, role, onPick }) {
  const opts =
    role === 'POC'
      ? [
          [CHAT_PROMPT_NONE, 'Quick prompt…'],
          ['K-5031 — update document title and contract activation date', 'Title & contract date'],
          ['K-5031 — update fees and standard fee schedule', 'Fees'],
          ['K-5031 — update payment terms and billing', 'Payment terms'],
        ]
      : role === 'BUFM'
        ? [
            [CHAT_PROMPT_NONE, 'Quick prompt…'],
            ['K-5031 — summarize POC updates for approval', 'Summarize POC updates'],
            ['K-5031 — list sections and fields changed by POC', 'Sections & fields'],
            ['K-5031 — need highlights for BUFM review', 'Review highlights'],
          ]
        : [
            [CHAT_PROMPT_NONE, 'Quick prompt…'],
            ['K-5031 — summarize POC and BUFM context', 'POC & BUFM context'],
            ['K-5031 — final KMT review before publish', 'Final review'],
          ]
  return (
    <select
      id={id}
      className="workflow-chat-poc__prompt-select"
      aria-label="Insert sample prompt"
      defaultValue={CHAT_PROMPT_NONE}
      onChange={e => {
        const v = e.target.value
        if (v && v !== CHAT_PROMPT_NONE) onPick(v)
        e.target.value = CHAT_PROMPT_NONE
      }}
    >
      {opts.map(([value, label]) => (
        <option key={label} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
}

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
        'Welcome to **document chat**. Choose a document next to **Attach**, or mention its title or ID in your message. Send to preview planned highlights, then **Confirm & apply**. **Open document** to see them in green. Use **Save as draft** or **Submit for approval** when ready.',
    },
  ]
}

function bufmWelcomeMessages() {
  return [
    {
      role: 'assistant',
      id: 'welcome',
      content:
        'Welcome to **BUFM document chat**. Select a document next to **Attach** (or type its ID or title in your message), then send any note. The flow runs **Initializing → Processing → Completed** and summarizes **sections and fields the POC recorded** on the document. **Open document** to see green POC highlights, flag items if needed, then **Approve** or **Reject** on the review page.',
    },
  ]
}

function kmtWelcomeMessages() {
  return [
    {
      role: 'assistant',
      id: 'welcome',
      content:
        'Welcome to **KMT document chat**. Select a document next to **Attach** (or type its ID or title), then send any message. The flow runs **Initializing → Processing → Completed** with a summary of **POC updates** plus BUFM/KMT context. **Open document** for read-only highlights and final actions.',
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
    [PHASES.analyze]: 'Processing…',
    [PHASES.update]: 'Completing…',
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

  const [messages, setMessages] = useState(() => {
    if (user?.role === 'BUFM') return bufmWelcomeMessages()
    if (user?.role === 'KMT') return kmtWelcomeMessages()
    return []
  })

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

  const startNewReviewerChat = () => {
    if (role === 'BUFM') setMessages(bufmWelcomeMessages())
    else if (role === 'KMT') setMessages(kmtWelcomeMessages())
    setSelectedDocId('')
    setAttachedName(null)
    setVoiceNote(null)
    setPhase(PHASES.idle)
  }

  const deleteReviewerConversation = () => {
    if (!window.confirm('Delete this conversation and start fresh?')) return
    startNewReviewerChat()
  }

  const deletePocSession = useCallback(
    (e, sessionId) => {
      e.stopPropagation()
      if (!window.confirm('Delete this chat from history?')) return
      setPocSessions(prev => {
        const next = prev.filter(s => s.id !== sessionId)
        if (next.length === 0) {
          const id = `s-${Date.now()}`
          setPocActiveSessionId(id)
          pendingPocRef.current = null
          lastPocChatPatchRef.current = null
          return [
            {
              id,
              docId: null,
              title: 'New document chat',
              updatedAt: Date.now(),
              messages: pocWelcomeMessages(user),
            },
          ]
        }
        if (sessionId === pocActiveSessionIdRef.current) {
          setPocActiveSessionId(next[0].id)
          pendingPocRef.current = null
          lastPocChatPatchRef.current = null
        }
        return next
      })
    },
    [user],
  )

  useEffect(() => {
    if (!attachedName || (role !== 'POC' && role !== 'BUFM' && role !== 'KMT')) {
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

  const reviewerChatBack =
    role === 'BUFM' ? { to: '/bufm/document-review', label: '← Document review' } : { to: '/kmt/documents', label: '← Documents' }

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
    const src = resolveDoc(resolveChatDocumentId(input, selectedDocId, docs))
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

  const executePocPipeline = async pend => {
    const { doc, patches } = pend
    if (!doc) return
    const { sections, fields, usedFallback } = patches
    const summary = defaultChatSummary(doc)
    await runProgress()
    const extras = {
      sections,
      fields,
      summary,
    }
    lastPocChatPatchRef.current = {
      docId: doc.id,
      sections,
      fields,
    }
    const sectionLines = sections.length ? sections.map(x => `• ${x}`).join('\n') : '• —'
    const fieldLines = fields.length ? fields.map(x => `• ${x}`).join('\n') : '• —'
    const fallbackNote = usedFallback
      ? '\n\n*(Using **Basic Information** sample highlights because your message did not match fee, payment, or basic cues.)*\n'
      : ''
    const detail = `**Planned highlights**${fallbackNote}\n\n**Sections**\n${sectionLines}\n\n**Fields**\n${fieldLines}`
    pushAssistantPoc(
      `${detail}\n\n---\n\n**Summary**\n${summary}\n\nOpen the document to see these areas in **green** in the wizard. Then **Save as draft** or **Submit for approval** below or on the document page.`,
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
    await executePocPipeline(p)
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

    const docId = resolveChatDocumentId(userLine, selectedDocId, docs)
    const doc = resolveDoc(docId)

    if (role === 'POC') {
      pushUserPoc(userLine)
      updatePocSessionMeta(docId, doc)
    } else {
      pushUser(userLine)
    }

    setInput('')
    setAttachedName(null)
    setVoiceNote(null)

    if (role === 'POC') {
      if (!docId || !doc) {
        pushAssistantPoc(
          'I could not match a document. Pick one in the **Document** menu next to Attach, type an ID like **K-5031**, or paste enough of the document title so we can match it.',
        )
        return
      }
      const patches = ensurePocChatPatches(inferSimulatedPocPatches(userLine))
      const pend = { doc, text: userLine, patches }
      pendingPocRef.current = pend
      const sectionBlock = patches.sections.map(x => `• ${x}`).join('\n')
      const fieldBlock = patches.fields.map(x => `• ${x}`).join('\n')
      const preview = patches.usedFallback
        ? `**Planned highlights (sample)**\nYour message did not match specific fee, payment, or basic wording, so **Basic Information** sample fields are used. You can still confirm.\n\n**Sections**\n${sectionBlock}\n\n**Fields**\n${fieldBlock}`
        : `**Planned highlights**\n\n**Sections**\n${sectionBlock}\n\n**Fields**\n${fieldBlock}`
      pushAssistantPoc(
        `${preview}\n\nConfirm to generate the preview and actions below, or edit your message and send again.`,
        {
          actions: [{ type: 'confirmPoc', label: 'Confirm & apply' }],
        },
      )
      return
    }

    if (role === 'BUFM') {
      if (!doc) {
        pushAssistant(
          'Select a document in the menu next to **Attach**, or type an ID such as **K-5031** and enough of the document title to match.',
        )
        return
      }
      const extrasNav = buildNavigationExtrasForReviewer(doc, userLine)
      await runProgress()
      const body = formatPocChangesForChat(doc, { roleLabel: 'POC' })
      pushAssistant(`**Completed.** Initializing → processing → finished.\n\n${body}`)
      await delay(380)
      pushAssistant(
        '**Next steps** — open the document to review POC highlights (green), flag items if needed, then approve or reject from the header when the document is awaiting BUFM approval.',
        {
          actions: [
            { type: 'openBufm', label: 'Open document', docId: doc.id, extras: extrasNav },
            { type: 'bufmApprove', label: 'Approve', docId: doc.id },
            { type: 'bufmReject', label: 'Reject', docId: doc.id, extras: extrasNav },
          ],
        },
      )
      return
    }

    if (role === 'KMT') {
      if (!doc) {
        pushAssistant(
          'Select a document in the menu next to **Attach**, or type an ID and enough of the title to match.',
        )
        return
      }
      const extrasNav = buildNavigationExtrasForReviewer(doc, userLine)
      await runProgress()
      const body = formatPocChangesForChat(doc, { roleLabel: 'POC' }) + formatKmtReviewerContext(doc)
      pushAssistant(`**Completed.** Initializing → processing → finished.\n\n${body}`)
      await delay(380)
      pushAssistant(
        '**Next steps** — open the document for read-only highlights, then publish or reject when the document is pending KMT.',
        {
          actions: [
            { type: 'openKmt', label: 'Open document', docId: doc.id, extras: extrasNav },
            { type: 'kmtApprove', label: 'Publish', docId: doc.id },
            { type: 'kmtReject', label: 'Reject', docId: doc.id, extras: extrasNav },
            { type: 'delegate', label: 'Release to another BUFM' },
            { type: 'history', label: 'View change history' },
          ],
        },
      )
    }
  }

  const onAction = (action, msg) => {
    if (action.type === 'openDoc') {
      const d = action.doc || resolveDoc(action.docId)
      if (!d) {
        if (role === 'POC') pushAssistantPoc('Document is no longer in the catalog.')
        return
      }
      navigateToDocPoc(d, action.extras)
      return
    }
    if (action.type === 'openBufm' && action.docId) {
      navigateToDocBufm(action.docId, action.extras)
      return
    }
    if (action.type === 'bufmApprove' && action.docId) {
      const d = resolveDoc(action.docId)
      if (!d || d.status !== 'Pending_BUFM') {
        pushAssistant(
          '**Approve** runs only when the document is **Awaiting BUFM approval**. Open it from the CEUI review queue, then use Approve on the document page.',
        )
        return
      }
      const today = new Date().toISOString().slice(0, 10)
      updateDoc(action.docId, {
        status: 'Pending_KMT',
        approved_by_BUFM: true,
        bufmApproveDate: today,
        poc_updated_sections: undefined,
        poc_updated_fields: undefined,
        pocResubmissionNote: undefined,
        tabs: Array.from(new Set([...(d.tabs || []), 'approval', 'all'])),
      })
      pushAssistant(`**${d.sub || action.docId}** was **approved** by BUFM and is now with KMT.`)
      return
    }
    if (action.type === 'bufmReject' && action.docId) {
      const d = resolveDoc(action.docId)
      if (!d || d.status !== 'Pending_BUFM') {
        pushAssistant(
          '**Reject** runs only when the document is **Awaiting BUFM approval**. Open it from the review queue to flag items and reject.',
        )
        return
      }
      navigate(`/bufm/document/${encodeURIComponent(action.docId)}`, {
        state: {
          ...(action.extras ? { fromChatWorkflow: action.extras } : {}),
          openBufmReject: true,
        },
      })
      return
    }
    if (action.type === 'openKmt' && action.docId) {
      navigateToDocKmt(action.docId, action.extras)
      return
    }
    if (action.type === 'kmtApprove' && action.docId) {
      const d = resolveDoc(action.docId)
      if (!d || d.status !== 'Pending_KMT') {
        pushAssistant(
          '**Publish** runs only when the document is **Pending KMT**. Open it from the KMT review queue, then use Publish on the document page.',
        )
        return
      }
      const today = new Date().toISOString().slice(0, 10)
      updateDoc(action.docId, {
        status: 'approved',
        approved_by_KMT: true,
        kmtApproveDate: today,
        poc_updated_sections: undefined,
        poc_updated_fields: undefined,
        pocResubmissionNote: undefined,
        tabs: Array.from(new Set([...(d.tabs || []), 'all'])),
      })
      pushAssistant(`**${d.sub || action.docId}** was **published** (final approved).`)
      return
    }
    if (action.type === 'kmtReject' && action.docId) {
      const d = resolveDoc(action.docId)
      if (!d || d.status !== 'Pending_KMT') {
        pushAssistant(
          '**Reject** runs only when the document is **Pending KMT**. Open it from the review queue to reject with comments.',
        )
        return
      }
      navigate(`/kmt/document/${encodeURIComponent(action.docId)}`, {
        state: {
          ...(action.extras ? { fromChatWorkflow: action.extras } : {}),
          openKmtReject: true,
          kmtEdit: false,
        },
      })
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
      window.alert('Task reassignment would be handled in the BUFM queue.')
      return
    }
    if (action.type === 'history') {
      window.alert('Use “View Version History” on the document page for prior versions.')
      return
    }
  }

  const onFile = e => {
    const f = e.target.files?.[0]
    if (f) setAttachedName(f.name)
    e.target.value = ''
  }

  const onVoice = () => {
    setVoiceNote('Voice transcript: please summarize POC updates and fees for this document.')
    if (role === 'POC') {
      pushAssistantPoc('Voice captured. The transcript is included when you press **Send**.')
    } else {
      pushAssistant('Voice captured. The transcript is added to your next message — press **Send** to continue.')
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
                {m.actions.map((a, i) => {
                  const primary =
                    a.type === 'confirmPoc' ||
                    a.type === 'bufmApprove' ||
                    a.type === 'kmtApprove' ||
                    a.type === 'openBufm' ||
                    a.type === 'openKmt'
                  const danger = a.type === 'bufmReject' || a.type === 'kmtReject'
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`btn btn-sm ${primary ? 'btn-primary' : ''} ${danger ? 'btn-outline bufm-doc-view__reject' : !primary ? 'btn-outline' : ''}`}
                      onClick={() => onAction(a, m)}
                    >
                      {a.label}
                    </button>
                  )
                })}
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
                    <li key={s.id} className="workflow-chat-poc__history-row">
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
                      <button
                        type="button"
                        className="workflow-chat-poc__history-delete"
                        aria-label={`Delete chat ${s.title}`}
                        onClick={e => deletePocSession(e, s.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="workflow-chat-poc__sidebar-foot">
                <p className="workflow-chat-poc__hint-block">
                  Attachments stay in this browser session only (not uploaded to a server).
                </p>
              </div>
            </aside>

            <div className="workflow-chat-poc__main">
              <div className="workflow-chat-poc__main-scroll">
                <div className="workflow-chat-poc__hero">
                  <h1 className="workflow-chat-poc__hero-title">Document chat</h1>
                  <p className="workflow-chat-poc__hero-sub">
                    Use the Document menu next to Attach (or mention title or ID in chat). Send to preview highlights, then Confirm & apply. Opening the document shows the planned sections and fields in green.
                  </p>
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
                  <div className="workflow-chat-poc__composer-doc-wrap">
                    <label className="workflow-chat-poc__composer-doc-label" htmlFor="chat-doc-select-poc-composer">
                      Document
                    </label>
                    <select
                      id="chat-doc-select-poc-composer"
                      className="workflow-chat-poc__composer-select"
                      value={selectedDocId}
                      onChange={e => setSelectedDocId(e.target.value)}
                      aria-label="Active document for this chat"
                    >
                      <option value="">Select document…</option>
                      {docOptions.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.id} · {d.sub?.slice(0, 40) || '—'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="workflow-chat-poc__icon-btn workflow-chat-poc__icon-btn--text" title="Attach file">
                    <input type="file" className="workflow-chat__file-input" onChange={onFile} accept=".pdf,.doc,.docx,.txt,.csv" />
                    Attach
                  </label>
                  <button type="button" className="workflow-chat-poc__icon-btn workflow-chat-poc__icon-btn--text" onClick={onVoice} title="Voice note">
                    Voice
                  </button>
                  <WorkflowChatPromptSelect id="chat-prompt-poc" role="POC" onPick={setInput} />
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
                <p className="workflow-chat-poc__composer-hint">Enter to send · Workflow assistant</p>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    )
  }

  const reviewerHeroSub =
    role === 'BUFM'
      ? 'Select a document next to Attach (or mention title or ID). Send any message to run Initializing → Processing → Completed and see what the POC recorded. Open the document for green highlights, then Approve or Reject with flags.'
      : 'Select a document next to Attach (or mention title or ID). Send any message for the same flow plus BUFM/KMT context. Open the document for read-only highlights.'

  return (
    <Layout>
      <main className="workflow-chat workflow-chat--poc">
        <div className="workflow-chat-poc__shell">
          <aside className="workflow-chat-poc__sidebar" aria-label="Chat">
            <Link to={reviewerChatBack.to} className="workflow-chat-poc__back-link">
              {reviewerChatBack.label}
            </Link>

            <div className="workflow-chat-poc__nav-section">
              <button type="button" className="workflow-chat-poc__nav-head" aria-expanded="true">
                <span>Document chat</span>
                <span className="workflow-chat-poc__chevron" aria-hidden>
                  ▾
                </span>
              </button>
              <div className="workflow-chat-poc__sidebar-actions">
                <button type="button" className="workflow-chat-poc__new-chat btn btn-primary btn-sm" onClick={startNewReviewerChat}>
                  + New chat
                </button>
                <button type="button" className="workflow-chat-poc__delete-chat btn btn-text btn-sm" onClick={deleteReviewerConversation}>
                  Delete chat
                </button>
              </div>
              <ul className="workflow-chat-poc__history">
                <li>
                  <div
                    className="workflow-chat-poc__history-item workflow-chat-poc__history-item--active workflow-chat-poc__history-item--static"
                    aria-current="true"
                  >
                    <span className="workflow-chat-poc__history-title">Current conversation</span>
                    <span className="workflow-chat-poc__history-meta">
                      {messages.length} message{messages.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="workflow-chat-poc__sidebar-foot">
              <p className="workflow-chat-poc__hint-block">
                Attachments stay in this browser session only (not uploaded to a server).
              </p>
            </div>
          </aside>

          <div className="workflow-chat-poc__main">
            <div className="workflow-chat-poc__main-scroll">
              <div className="workflow-chat-poc__hero">
                <h1 className="workflow-chat-poc__hero-title">Document chat</h1>
                <p className="workflow-chat-poc__hero-sub">{reviewerHeroSub}</p>
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

              <div className="workflow-chat-poc__messages">{renderMessageList(messages, false)}</div>
            </div>

            <div className="workflow-chat-poc__composer-wrap">
              <div className="workflow-chat-poc__composer-tools">
                <div className="workflow-chat-poc__composer-doc-wrap">
                  <label className="workflow-chat-poc__composer-doc-label" htmlFor="chat-doc-select-reviewer-composer">
                    Document
                  </label>
                  <select
                    id="chat-doc-select-reviewer-composer"
                    className="workflow-chat-poc__composer-select"
                    value={selectedDocId}
                    onChange={e => setSelectedDocId(e.target.value)}
                    aria-label="Active document for this chat"
                  >
                    <option value="">Select document…</option>
                    {docOptions.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.id} · {d.sub?.slice(0, 40) || '—'}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="workflow-chat-poc__icon-btn workflow-chat-poc__icon-btn--text" title="Attach file">
                  <input type="file" className="workflow-chat__file-input" onChange={onFile} accept=".pdf,.doc,.docx,.txt,.csv" />
                  Attach
                </label>
                <button type="button" className="workflow-chat-poc__icon-btn workflow-chat-poc__icon-btn--text" onClick={onVoice} title="Voice note">
                  Voice
                </button>
                <WorkflowChatPromptSelect id="chat-prompt-reviewer" role={role} onPick={setInput} />
              </div>
              <div className="workflow-chat-poc__input-row">
                <input
                  type="text"
                  className="workflow-chat-poc__input"
                  placeholder={
                    role === 'BUFM'
                      ? 'e.g. K-5031 — summarize POC updates for my review'
                      : 'e.g. K-5031 — summarize POC and reviewer context'
                  }
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
              <p className="workflow-chat-poc__composer-hint">Enter to send · Workflow assistant</p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  )
}

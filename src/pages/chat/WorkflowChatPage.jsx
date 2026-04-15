import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDocs, generateDocId } from '../../context/DocContext.jsx'
import {
  resolveChatDocumentId,
  resolveChatDocumentIdWithMeta,
  formatChatDocumentResolutionLine,
  inferSimulatedPocPatches,
  ensurePocChatPatches,
  defaultChatSummary,
  delay,
  formatPocChangesForChat,
  buildChatWorkflowExtrasFromDoc,
  buildNavigationExtrasForReviewer,
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

/** Fallback when no catalog row is selected yet. */
const DEFAULT_WORKFLOW_PROMPT = 'K-5031 — update document title and contract activation date'

function defaultPromptForDocId(docId) {
  if (!docId) return ''
  return `${docId} — update document title and contract activation date`
}

function pocWelcomeMessages() {
  return [{ role: 'assistant', id: 'welcome', content: 'Welcome. Say **hi** below to start.' }]
}

function bufmWelcomeMessages() {
  return [{ role: 'assistant', id: 'welcome', content: 'Welcome. Say **hi** below to start.' }]
}

function kmtWelcomeMessages() {
  return [{ role: 'assistant', id: 'welcome', content: 'Welcome. Say **hi** below to start.' }]
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

function loadPocChatState() {
  try {
    const raw = localStorage.getItem(POC_CHAT_STORAGE_KEY)
    if (!raw) throw new Error('empty')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.sessions) || !parsed.sessions.length) throw new Error('bad')
    let activeSessionId = parsed.activeSessionId || parsed.sessions[0].id
    if (!parsed.sessions.some(s => s.id === activeSessionId)) activeSessionId = parsed.sessions[0].id
    const sessions = parsed.sessions.map(s => ({
      ...s,
      pocHiGatePassed:
        typeof s.pocHiGatePassed === 'boolean'
          ? s.pocHiGatePassed
          : Boolean(s.messages?.some(m => m.role === 'user')),
    }))
    return { sessions, activeSessionId }
  } catch {
    const id = `s-${Date.now()}`
    return {
      sessions: [
        {
          id,
          docId: null,
          title: 'New chat',
          pocHiGatePassed: false,
          updatedAt: Date.now(),
          messages: pocWelcomeMessages(),
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

  const pocInit = useMemo(() => loadPocChatState(), [])
  const [pocSessions, setPocSessions] = useState(() =>
    pocInit.sessions.map(s => ({ ...s, messages: s.messages.map(m => ({ ...m })) })),
  )
  const [pocActiveSessionId, setPocActiveSessionId] = useState(() => pocInit.activeSessionId)
  const [submitModalDocId, setSubmitModalDocId] = useState(null)

  const [messages, setMessages] = useState(() => {
    if (user?.role === 'BUFM') return bufmWelcomeMessages()
    if (user?.role === 'KMT') return kmtWelcomeMessages()
    return []
  })

  const [input, setInput] = useState('')
  const [reviewerHiGatePassed, setReviewerHiGatePassed] = useState(false)
  const [phase, setPhase] = useState(PHASES.idle)
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
    setReviewerHiGatePassed(false)
    setInput('')
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
              title: 'New chat',
              pocHiGatePassed: false,
              updatedAt: Date.now(),
              messages: pocWelcomeMessages(),
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

  /** Catalog selection pre-fills the composer after the hi gate (user still sends the message). */
  const onCatalogChange = useCallback(
    e => {
      const docId = e.target.value
      setSelectedDocId(docId)
      const pocGate =
        role === 'POC' && pocSessions.find(s => s.id === pocActiveSessionId)?.pocHiGatePassed === true
      const reviewerGate = (role === 'BUFM' || role === 'KMT') && reviewerHiGatePassed
      if (docId && (pocGate || reviewerGate)) {
        setInput(defaultPromptForDocId(docId))
      } else if (!docId) {
        setInput('')
      }
    },
    [role, pocSessions, pocActiveSessionId, reviewerHiGatePassed],
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
        title: 'New chat',
        pocHiGatePassed: false,
        updatedAt: Date.now(),
        messages: pocWelcomeMessages(),
      },
      ...prev,
    ])
    setPocActiveSessionId(id)
    setSelectedDocId('')
    setInput('')
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
    const text = input.trim()
    if (!text) return
    const userLine = text
    const userSnippet = String(userLine || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 180)
    const { docId, matchSource } = resolveChatDocumentIdWithMeta(userLine, selectedDocId, docs)
    const doc = resolveDoc(docId)

    if (role === 'POC') {
      const active = pocSessions.find(s => s.id === pocActiveSessionId)
      const gatePassed = active?.pocHiGatePassed === true

      if (!gatePassed) {
        const plain = text.trim()
        const isHi = /^\s*(hi|hello|hey)\b/i.test(plain)
        pushUserPoc(userLine)
        if (!isHi) {
          setInput('')
          pushAssistantPoc('Please say **hi** first to continue.')
          return
        }
        setPocSessions(prev =>
          prev.map(s =>
            s.id === pocActiveSessionId ? { ...s, pocHiGatePassed: true, updatedAt: Date.now() } : s,
          ),
        )
        setInput(defaultPromptForDocId(selectedDocId) || DEFAULT_WORKFLOW_PROMPT)
        return
      }

      pushUserPoc(userLine)
      updatePocSessionMeta(docId, doc)
      setInput('')

      if (!docId || !doc) {
        pushAssistantPoc(
          `I could not match a document to: “${userSnippet || '(empty)'}”. Pick a catalog row, type an ID like **K-5031**, or paste more of the **title** (city, division, or key words).`,
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

    if (role === 'BUFM' || role === 'KMT') {
      if (!reviewerHiGatePassed) {
        const plain = text.trim()
        const isHi = /^\s*(hi|hello|hey)\b/i.test(plain)
        pushUser(userLine)
        if (!isHi) {
          setInput('')
          pushAssistant('Please say **hi** first to continue.')
          return
        }
        setReviewerHiGatePassed(true)
        setInput(defaultPromptForDocId(selectedDocId) || DEFAULT_WORKFLOW_PROMPT)
        return
      }
    }

    pushUser(userLine)
    setInput('')

    if (role === 'BUFM') {
      if (!doc) {
        pushAssistant(
          `No catalog document matched: “${userSnippet || '(empty)'}”. Use the catalog picker, an ID like **K-5031**, or more words from the **title** (e.g. city or “DIV …”).`,
        )
        return
      }
      const extrasNav = buildNavigationExtrasForReviewer(doc, userLine)
      const storedExtras = buildChatWorkflowExtrasFromDoc(doc)
      await runProgress()
      const initLine = formatChatDocumentResolutionLine(userLine, doc, matchSource)
      const body = formatPocChangesForChat(doc, { roleLabel: 'POC' })
      let inferredAppend = ''
      if (!storedExtras && extrasNav.sections?.length) {
        inferredAppend = `\n\n---\n\n**Review focus (from your message)** — highlight targets for this visit:\n\n**Sections**\n${extrasNav.sections.map(s => `• ${s}`).join('\n')}\n\n**Fields**\n${extrasNav.fields.map(f => `• ${f}`).join('\n')}`
      }
      const summaryBlock = `**Summary — POC-related changes**\n${initLine}\nInitializing → processing → **completed** for **${doc.sub || doc.id}** (\`${doc.id}\`).\n\n${body}${inferredAppend}\n\n---\n\nUse the buttons below to **open the document** (green POC highlights), **approve**, or **reject** (when this document is awaiting BUFM approval).`
      pushAssistant(summaryBlock, {
        actions: [
          { type: 'openBufm', label: 'Open document', docId: doc.id, extras: extrasNav },
          { type: 'bufmApprove', label: 'Approve', docId: doc.id },
          { type: 'bufmReject', label: 'Reject', docId: doc.id, extras: extrasNav },
        ],
      })
      return
    }

    if (role === 'KMT') {
      if (!doc) {
        pushAssistant(
          `**Initialization** — No knowledge document matched your text: “${userSnippet || '(empty)'}”.\n\nUse the catalog picker, type an ID (**K-5031**), or paste **more words from the document title** (division, city, “MUNI”, etc.).`,
        )
        return
      }
      const extrasNav = buildNavigationExtrasForReviewer(doc, userLine)
      const storedExtras = buildChatWorkflowExtrasFromDoc(doc)
      await runProgress()
      const initLine = formatChatDocumentResolutionLine(userLine, doc, matchSource)
      const body = formatPocChangesForChat(doc, { roleLabel: 'POC' }) + formatKmtReviewerContext(doc)
      let inferredAppend = ''
      if (!storedExtras && extrasNav.sections?.length) {
        inferredAppend = `\n\n---\n\n**Review focus (from your message)** — temporary highlight targets for this visit:\n\n**Sections**\n${extrasNav.sections.map(s => `• ${s}`).join('\n')}\n\n**Fields**\n${extrasNav.fields.map(f => `• ${f}`).join('\n')}`
      }
      const summaryBlock = `**Summary — KMT document review**\n${initLine}\nInitializing → processing → **completed** for **${doc.sub || doc.id}** (\`${doc.id}\`).\n\n${body}${inferredAppend}\n\n---\n\nUse the buttons below to **open the document** (green POC highlights where metadata exists), **edit catalog details** (title, geography, service area), **publish** or **reject** when pending KMT, or **release task** (demo).`
      pushAssistant(summaryBlock, {
        actions: [
          { type: 'openKmt', label: 'Open document', docId: doc.id, extras: extrasNav },
          { type: 'kmtEdit', label: 'Edit details', docId: doc.id, extras: extrasNav },
          { type: 'kmtApprove', label: 'Publish', docId: doc.id },
          { type: 'kmtReject', label: 'Reject', docId: doc.id, extras: extrasNav },
          { type: 'kmtRelease', label: 'Release task', docId: doc.id },
        ],
      })
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
    if (action.type === 'kmtEdit' && action.docId) {
      navigate(`/kmt/document/${encodeURIComponent(action.docId)}`, {
        state: { kmtEdit: true, ...(action.extras ? { fromChatWorkflow: action.extras } : {}) },
      })
      return
    }
    if (action.type === 'kmtRelease' && action.docId) {
      window.alert(
        'Release task: in production this would return the assignment to the review pool or hand off to another reviewer. (Demo — no data change.)',
      )
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
      setInput(defaultPromptForDocId(selectedDocId) || DEFAULT_WORKFLOW_PROMPT)
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
    const pocGateOk = pocSessions.find(s => s.id === pocActiveSessionId)?.pocHiGatePassed === true
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
            <aside className="workflow-chat-poc__sidebar" aria-label="Ops Agent">
              <Link to="/poc" className="workflow-chat-poc__back-link">
                ← Knowledge documents
              </Link>

              <div className="workflow-chat-poc__nav-section">
                <button type="button" className="workflow-chat-poc__nav-head" aria-expanded="true">
                  <span>Ops Agent</span>
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
                          setInput('')
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

            </aside>

            <div className="workflow-chat-poc__main">
              <div className="workflow-chat-poc__main-scroll">
                <div className="workflow-chat-poc__messages">{renderMessageList(pocMessages, true)}</div>
              </div>

              <div className="workflow-chat-poc__composer-wrap">
                <div className="workflow-chat-poc__composer-tools">
                  <div className="workflow-chat-poc__composer-doc-wrap">
                    <label className="workflow-chat-poc__composer-doc-label" htmlFor="chat-doc-select-poc-composer">
                      Catalog
                    </label>
                    <select
                      id="chat-doc-select-poc-composer"
                      className="workflow-chat-poc__composer-select"
                      value={selectedDocId}
                      onChange={onCatalogChange}
                      aria-label="Catalog row to match"
                    >
                      <option value="">Select…</option>
                      {docOptions.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.id} · {d.sub?.slice(0, 40) || '—'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="workflow-chat-poc__input-row">
                  <input
                    type="text"
                    className="workflow-chat-poc__input"
                    placeholder={pocGateOk ? 'Message…' : 'Type hi, then send…'}
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
                <p className="workflow-chat-poc__composer-hint">Enter to send · Ops Agent</p>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    )
  }

  const reviewerGateOk = reviewerHiGatePassed

  return (
    <Layout>
      <main className="workflow-chat workflow-chat--poc">
        <div className="workflow-chat-poc__shell">
          <aside className="workflow-chat-poc__sidebar" aria-label="Ops Agent">
            <Link to={reviewerChatBack.to} className="workflow-chat-poc__back-link">
              {reviewerChatBack.label}
            </Link>

            <div className="workflow-chat-poc__nav-section">
              <button type="button" className="workflow-chat-poc__nav-head" aria-expanded="true">
                <span>Ops Agent</span>
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

          </aside>

          <div className="workflow-chat-poc__main">
            <div className="workflow-chat-poc__main-scroll">
              <div className="workflow-chat-poc__messages">{renderMessageList(messages, false)}</div>
            </div>

            <div className="workflow-chat-poc__composer-wrap">
              <div className="workflow-chat-poc__composer-tools">
                <div className="workflow-chat-poc__composer-doc-wrap">
                  <label className="workflow-chat-poc__composer-doc-label" htmlFor="chat-doc-select-reviewer-composer">
                    Catalog
                  </label>
                  <select
                    id="chat-doc-select-reviewer-composer"
                    className="workflow-chat-poc__composer-select"
                    value={selectedDocId}
                    onChange={onCatalogChange}
                    aria-label="Catalog row to match"
                  >
                    <option value="">Select…</option>
                    {docOptions.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.id} · {d.sub?.slice(0, 40) || '—'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="workflow-chat-poc__input-row">
                <input
                  type="text"
                  className="workflow-chat-poc__input"
                  placeholder={reviewerGateOk ? 'Message…' : 'Type hi, then send…'}
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
              <p className="workflow-chat-poc__composer-hint">Enter to send · Ops Agent</p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  )
}

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDocs, generateDocId } from '../../context/DocContext.jsx'
import {
  resolveChatDocumentId,
  resolveChatDocumentIdWithMeta,
  inferSimulatedPocPatches,
  ensurePocChatPatches,
  defaultChatSummary,
  delay,
  buildChatWorkflowExtrasFromDoc,
  buildNavigationExtrasForReviewer,
  isDuplicateReviewDateWorkflow,
  OPS_REVIEW_DATE_DISPLAY,
  formatBufmChatPocChangeSummary,
  formatKmtChatReviewSummary,
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
const DEFAULT_WORKFLOW_PROMPT =
  'K-5008 — Duplicate this document and update the Document review date as 25th April 2016'

const DEFAULT_KMT_CATALOG_PROMPT =
  'K-5008 — Summarize the updates on this document (POC changes, BUFM comments)'

function defaultPromptForDocId(docId) {
  if (!docId) return ''
  return `${docId} — Duplicate this document and update the Document review date as 25th April 2016`
}

function defaultKmtPromptForDocId(docId) {
  if (!docId) return ''
  return `${docId} — Summarize the updates on this document (POC changes, BUFM comments)`
}

const POC_OPS_STEP_LABELS = ['Analyse the fields', 'Checking the fields', 'Update the fields', 'Completed']

function PocOpsStepper({ stepIndex }) {
  return (
    <div className="poc-ops-stepper" role="status" aria-live="polite">
      <p className="poc-ops-stepper__eyebrow">Ops Agent</p>
      <ul className="poc-ops-stepper__list">
        {POC_OPS_STEP_LABELS.map((label, i) => {
          const isLast = i === 3
          const doneEarly = i < stepIndex
          const active = i === stepIndex && stepIndex < 3
          const success = isLast && stepIndex === 3
          const pending = i > stepIndex && !success
          let mod = ''
          if (success) mod = ' poc-ops-stepper__item--success'
          else if (doneEarly) mod = ' poc-ops-stepper__item--done'
          else if (active) mod = ' poc-ops-stepper__item--active'
          else if (pending) mod = ' poc-ops-stepper__item--pending'
          return (
            <li key={label} className={`poc-ops-stepper__item${mod}`}>
              <span className="poc-ops-stepper__text">{label}</span>
              {active && (
                <span className="poc-ops-stepper__dots" aria-hidden="true">
                  <span className="poc-ops-stepper__dot" />
                  <span className="poc-ops-stepper__dot" />
                  <span className="poc-ops-stepper__dot" />
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function pocWelcomeMessages() {
  return [{ role: 'assistant', id: 'welcome', content: "Welcome to Ops Agent! Let's get started." }]
}

function bufmWelcomeMessages() {
  return [{ role: 'assistant', id: 'welcome', content: "Welcome to Ops Agent! Let's get started." }]
}

function kmtWelcomeMessages() {
  return [{ role: 'assistant', id: 'welcome', content: "Welcome to Ops Agent! Let's get started." }]
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
    const sessions = parsed.sessions.map(s => ({ ...s }))
    return { sessions, activeSessionId }
  } catch {
    const id = `s-${Date.now()}`
    return {
      sessions: [
        {
          id,
          docId: null,
          title: 'New chat',
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
  const [opsAnalysisStep, setOpsAnalysisStep] = useState(null)
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
  }, [pocMessages, messages, phase, pocActiveSessionId, opsAnalysisStep])

  /** Pre-fill default Ops Agent prompt when only the welcome message is shown (POC). Catalog changes use onCatalogChange. */
  useEffect(() => {
    if (role !== 'POC') return
    const msgs = pocSessions.find(s => s.id === pocActiveSessionId)?.messages ?? []
    const onlyWelcome =
      msgs.length === 1 && msgs[0]?.role === 'assistant' && msgs[0]?.id === 'welcome'
    if (onlyWelcome) {
      setInput(defaultPromptForDocId(selectedDocId) || DEFAULT_WORKFLOW_PROMPT)
    }
  }, [role, pocActiveSessionId, pocSessions])

  /** Pre-fill default prompt for BUFM / KMT when the conversation is only the welcome line. */
  useEffect(() => {
    if (role !== 'BUFM' && role !== 'KMT') return
    if (messages.length === 1 && messages[0]?.id === 'welcome') {
      if (role === 'KMT') {
        setInput(defaultKmtPromptForDocId(selectedDocId) || DEFAULT_KMT_CATALOG_PROMPT)
      } else {
        setInput(defaultPromptForDocId(selectedDocId) || DEFAULT_WORKFLOW_PROMPT)
      }
    }
  }, [role, messages, selectedDocId])

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

  /** Catalog selection pre-fills the composer with the default Ops Agent prompt. */
  const onCatalogChange = useCallback(
    e => {
      const docId = e.target.value
      setSelectedDocId(docId)
      if (docId) {
        if (role === 'KMT') {
          setInput(defaultKmtPromptForDocId(docId))
        } else {
          setInput(defaultPromptForDocId(docId))
        }
      } else {
        setInput('')
      }
    },
    [role],
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

  const runOpsAnalysisSteps = async () => {
    for (let s = 0; s < 4; s++) {
      setOpsAnalysisStep(s)
      await delay(s === 3 ? 900 : 980)
    }
  }

  const runBufmOpsPipeline = async (doc, userLine, matchSource) => {
    try {
      await runOpsAnalysisSteps()
      const d = resolveDoc(doc.id) || doc
      const extrasNav = buildNavigationExtrasForReviewer(d, userLine)
      const changeBlock = formatBufmChatPocChangeSummary(d)
      const summaryBlock = `**BUFM — summary**\n\n${changeBlock}`
      pushAssistant(summaryBlock, {
        actions: [
          { type: 'openBufm', label: 'Open document', docId: d.id, extras: extrasNav },
          { type: 'bufmApprove', label: 'Approve', docId: d.id },
          { type: 'bufmReject', label: 'Reject', docId: d.id, extras: extrasNav },
        ],
      })
    } finally {
      setOpsAnalysisStep(null)
    }
  }

  const runKmtOpsPipeline = async (doc, userLine, matchSource) => {
    try {
      await runOpsAnalysisSteps()
      const d = resolveDoc(doc.id) || doc
      const extrasNav = buildNavigationExtrasForReviewer(d, userLine)
      const reviewBody = formatKmtChatReviewSummary(d)
      const summaryBlock = `**KMT — summary**\n\n${reviewBody}`
      pushAssistant(summaryBlock, {
        actions: [
          { type: 'openKmt', label: 'Open document', docId: d.id, extras: extrasNav },
          { type: 'kmtEdit', label: 'Edit details', docId: d.id, extras: extrasNav },
          { type: 'kmtApprove', label: 'Publish', docId: d.id },
          { type: 'kmtReject', label: 'Reject', docId: d.id, extras: extrasNav },
          { type: 'kmtRelease', label: 'Release task', docId: d.id },
        ],
      })
    } finally {
      setOpsAnalysisStep(null)
    }
  }

  const executePocPipeline = async pend => {
    const { doc, patches, text } = pend
    if (!doc) return
    const { sections, fields, usedFallback } = patches
    const reviewFlow = isDuplicateReviewDateWorkflow(String(text || ''))

    try {
      await runOpsAnalysisSteps()

      if (reviewFlow) {
        const previousReviewDate = doc.readOnlyWizard?.step1?.reviewDate ?? '— (not set)'
        updateDoc(doc.id, {
          poc_review_date_before: previousReviewDate,
          poc_updated_sections: ['Basic Information'],
          poc_updated_fields: ['Document review date'],
          readOnlyWizard: {
            ...(doc.readOnlyWizard || {}),
            step1: {
              ...(doc.readOnlyWizard?.step1 || {}),
              reviewDate: OPS_REVIEW_DATE_DISPLAY,
            },
          },
        })
      }

      let resolved = resolveDoc(doc.id) || doc
      if (reviewFlow) {
        const previousReviewDate = doc.readOnlyWizard?.step1?.reviewDate ?? '— (not set)'
        resolved = {
          ...resolved,
          poc_review_date_before: previousReviewDate,
          poc_updated_sections: ['Basic Information'],
          poc_updated_fields: ['Document review date'],
          readOnlyWizard: {
            ...(resolved.readOnlyWizard || {}),
            step1: {
              ...(resolved.readOnlyWizard?.step1 || {}),
              reviewDate: OPS_REVIEW_DATE_DISPLAY,
            },
          },
        }
      }
      const extras = {
        sections,
        fields,
        summary: reviewFlow ? `Document review date → ${OPS_REVIEW_DATE_DISPLAY}` : defaultChatSummary(resolved),
      }
      lastPocChatPatchRef.current = {
        docId: resolved.id,
        sections,
        fields,
      }

      if (reviewFlow) {
        pushAssistantPoc(
          `**Summary — what changed**\n\n• **Document review date** updated to **${OPS_REVIEW_DATE_DISPLAY}** in **Basic Information**.\n\nOpen the document to see this field highlighted in **green** in the wizard.`,
          {
            actions: [
              { type: 'openDoc', label: 'Open document', docId: resolved.id, doc: resolved, extras },
              { type: 'pocChatSaveDraft', label: 'Save as draft', docId: resolved.id },
              { type: 'pocChatSubmitApproval', label: 'Submit for approval', docId: resolved.id },
            ],
          },
        )
      } else {
        const summary = defaultChatSummary(resolved)
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
              { type: 'openDoc', label: 'Open document', docId: resolved.id, doc: resolved, extras },
              { type: 'pocChatSaveDraft', label: 'Save as draft', docId: resolved.id },
              { type: 'pocChatSubmitApproval', label: 'Submit for approval', docId: resolved.id },
            ],
          },
        )
      }
    } finally {
      setOpsAnalysisStep(null)
      pendingPocRef.current = null
    }
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
      pushAssistantPoc('Run an Ops Agent update in chat first (Send), then submit for approval.')
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
      pendingPocRef.current = { doc, text: userLine, patches }
      await executePocPipeline({ doc, text: userLine, patches })
      return
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
      await runBufmOpsPipeline(doc, userLine, matchSource)
      return
    }

    if (role === 'KMT') {
      if (!doc) {
        pushAssistant(
          `No catalog document matched: “${userSnippet || '(empty)'}”. Use the catalog picker, an ID like **K-5031**, or more words from the **title** (division, city, “MUNI”, etc.).`,
        )
        return
      }
      await runKmtOpsPipeline(doc, userLine, matchSource)
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
            'Send an Ops Agent update in chat first, then use **Save as draft** again.',
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
      {opsAnalysisStep !== null && (
        <div className="workflow-chat__msg workflow-chat__msg--assistant">
          <div className="workflow-chat__bubble workflow-chat__bubble--poc-stepper">
            <PocOpsStepper stepIndex={opsAnalysisStep} />
          </div>
        </div>
      )}
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
                          const onlyWelcome =
                            s.messages?.length === 1 &&
                            s.messages[0]?.role === 'assistant' &&
                            s.messages[0]?.id === 'welcome'
                          setInput(
                            onlyWelcome
                              ? defaultPromptForDocId(selectedDocId) || DEFAULT_WORKFLOW_PROMPT
                              : '',
                          )
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
                        title="Delete chat"
                        onClick={e => deletePocSession(e, s.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
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
                    placeholder="Message…"
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
              </div>
              <ul className="workflow-chat-poc__history">
                <li className="workflow-chat-poc__history-row">
                  <div
                    className="workflow-chat-poc__history-item workflow-chat-poc__history-item--active workflow-chat-poc__history-item--static"
                    aria-current="true"
                  >
                    <span className="workflow-chat-poc__history-title">Current conversation</span>
                    <span className="workflow-chat-poc__history-meta">
                      {messages.length} message{messages.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="workflow-chat-poc__history-delete"
                    aria-label="Delete chat"
                    title="Delete chat"
                    onClick={deleteReviewerConversation}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
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
                  placeholder="Message…"
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

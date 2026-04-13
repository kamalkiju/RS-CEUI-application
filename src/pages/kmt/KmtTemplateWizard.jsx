import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useKmtTemplates } from '../../context/KmtTemplateContext.jsx'
import { useNotifications } from '../../context/NotificationContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useKmtUsers } from '../../context/KmtUsersContext.jsx'
import { ensureFivePocTabs, ensureFiveRsauiTabs, uid } from './kmtFormBuilderShared.js'
import { normalizeTemplateForm } from './pocReferenceFormSeed.js'
import { normalizeRsauiTemplateForm } from './rsauiReferenceFormSeed.js'
import KmtFormBuilder from './KmtFormBuilder.jsx'
import TemplateAssigneesWorkflow from './TemplateAssigneesWorkflow.jsx'

const DOC_TYPES = ['Commercial', 'Residential', 'Municipal', 'RSAUI', 'General']
const LINE_OF_BUSINESS_OPTIONS = ['Commercial', 'Residential', 'Municipal', 'Industrial', 'Roll-off', 'Other']
const MARKET_TYPE_OPTIONS = ['Residential', 'Commercial', 'Municipal', 'Industrial', 'Open Market', 'Other']

function buildDefaultApprovalState() {
  const approvalLevels = [
    { id: uid(), name: 'POC' },
    { id: uid(), name: 'BUFM' },
    { id: uid(), name: 'KMT' },
  ]
  return {
    approvalLevels,
    assigneesByLevel: Object.fromEntries(approvalLevels.map(l => [l.id, []])),
  }
}

function normalizeLevelsFromTemplate(t) {
  const raw = Array.isArray(t.approvalLevels) && t.approvalLevels.length ? t.approvalLevels : null
  if (!raw) return buildDefaultApprovalState().approvalLevels
  return raw.map(x => ({
    id: x.id || uid(),
    name: String(x.name ?? x.role ?? 'Stage').trim() || 'Stage',
  }))
}

/** Map legacy POC/BUFM/KMT buckets onto level ids when `assigneesByLevel` is missing. */
function migrateAssigneesByLevel(t, levels) {
  const existing = t.assigneesByLevel
  if (existing && typeof existing === 'object' && Object.keys(existing).length) {
    const out = { ...existing }
    levels.forEach(l => {
      if (!out[l.id]) out[l.id] = []
    })
    return out
  }
  const a = t.assignees || {}
  const out = {}
  levels.forEach(l => {
    const n = l.name.toUpperCase()
    if (n === 'POC') out[l.id] = [...(a.pocUserIds || [])]
    else if (n === 'BUFM') out[l.id] = [...(a.bufmUserIds || [])]
    else if (n === 'KMT') out[l.id] = [...(a.kmtUserIds || [])]
    else out[l.id] = []
  })
  return out
}

export default function KmtTemplateWizard() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { getTemplate, saveTemplate, updateTemplate } = useKmtTemplates()
  const { addNotification } = useNotifications()
  const { users } = useKmtUsers()

  const templateApp = useMemo(
    () => (searchParams.get('app') === 'RSAUI' ? 'RSAUI' : 'CEUI'),
    [searchParams],
  )
  const basePath = '/kmt/documents'
  const withApp = path =>
    templateApp === 'RSAUI' ? (path.includes('?') ? `${path}&app=RSAUI` : `${path}?app=RSAUI`) : path

  const initialForm = () =>
    templateApp === 'RSAUI'
      ? normalizeRsauiTemplateForm({ tabs: [], headerGroups: [] })
      : normalizeTemplateForm({ tabs: [], headerGroups: [] })

  const [name, setName] = useState('')
  const [docType, setDocType] = useState('Commercial')
  const [lineOfBusiness, setLineOfBusiness] = useState(LINE_OF_BUSINESS_OPTIONS[0])
  const [marketType, setMarketType] = useState(MARKET_TYPE_OPTIONS[0])
  const approvalSeedRef = useRef(buildDefaultApprovalState())
  const [approvalLevels, setApprovalLevels] = useState(() => approvalSeedRef.current.approvalLevels)
  const [assigneesByLevel, setAssigneesByLevel] = useState(() => approvalSeedRef.current.assigneesByLevel)
  const [form, setForm] = useState(initialForm)
  const [saveModal, setSaveModal] = useState(false)
  const [sessionId, setSessionId] = useState(null)

  const editingId = routeId || sessionId

  useEffect(() => {
    if (!routeId) {
      setSessionId(null)
      setName('')
      setDocType('Commercial')
      setLineOfBusiness(LINE_OF_BUSINESS_OPTIONS[0])
      setMarketType(MARKET_TYPE_OPTIONS[0])
      const next = buildDefaultApprovalState()
      approvalSeedRef.current = next
      setApprovalLevels(next.approvalLevels)
      setAssigneesByLevel(next.assigneesByLevel)
      setForm(initialForm())
      return
    }
    const t = getTemplate(routeId)
    if (!t) return
    setSessionId(t.id)
    setName(t.name || '')
    setDocType(t.docType || 'Commercial')
    const lob = t.lineOfBusiness || ''
    setLineOfBusiness(LINE_OF_BUSINESS_OPTIONS.includes(lob) ? lob : lob || LINE_OF_BUSINESS_OPTIONS[0])
    const mt = t.marketSegment || ''
    setMarketType(MARKET_TYPE_OPTIONS.includes(mt) ? mt : mt || MARKET_TYPE_OPTIONS[0])
    const levels = normalizeLevelsFromTemplate(t)
    setApprovalLevels(levels)
    setAssigneesByLevel(migrateAssigneesByLevel(t, levels))
    const rawForm = t.form || { tabs: [], headerGroups: [] }
    const app = t.targetApp === 'RSAUI' ? 'RSAUI' : 'CEUI'
    setForm((app === 'RSAUI' ? normalizeRsauiTemplateForm : normalizeTemplateForm)(rawForm))
  }, [routeId, getTemplate, templateApp])

  const displayName = () => name.trim() || 'Untitled template'

  const breadcrumb = (
    <nav className="kmt-breadcrumb kmt-template-editor__breadcrumb" aria-label="Breadcrumb">
      <Link to={withApp(basePath)}>Document templates</Link>
      <span aria-hidden> / </span>
      <span>{editingId ? 'Edit workflow template' : 'Create workflow template'}</span>
    </nav>
  )

  const persist = (status = 'draft') => {
    const normalized =
      templateApp === 'RSAUI' ? ensureFiveRsauiTabs(form) : ensureFivePocTabs(form)
    setForm(normalized)
    const existing = editingId ? getTemplate(editingId) : null
    const tid = saveTemplate(
      {
        name: displayName(),
        docType,
        targetApp: templateApp,
        lineOfBusiness,
        serviceArea: existing?.serviceArea ?? '',
        description: existing?.description ?? '',
        marketSegment: marketType,
        status,
        approvalLevels: approvalLevels.map(l => ({
          id: l.id,
          name: String(l.name || '').trim() || 'Role',
        })),
        assigneesByLevel,
        form: normalized,
      },
      editingId,
    )
    setSessionId(tid)
    return tid
  }

  const handlePublish = () => {
    const tid = persist('published')
    updateTemplate(tid, {
      status: 'published',
      timeline: [
        ...(getTemplate(tid)?.timeline || []).filter(Boolean),
        {
          id: `ev-${Date.now()}`,
          stage: 'Published',
          detail: 'Template is live.',
          actor: user?.name || 'KMT',
          at: new Date().toISOString(),
        },
      ],
    })
    const actor = user?.name || 'KMT'
    const title = displayName()
    const pocPath = templateApp === 'RSAUI' ? '/poc/document-review' : '/poc'
    const bufmPath = templateApp === 'RSAUI' ? '/bufm/document-review/rsaui/review' : '/bufm/document-review/ceui/review'
    addNotification({
      role: 'POC',
      statusType: 'publish',
      title: 'New workflow template published',
      message: `KMT published template "${title}" (${templateApp}).`,
      actor,
      documentName: title,
      ctaAction: { label: 'View documents', path: pocPath },
    })
    addNotification({
      role: 'BUFM',
      statusType: 'publish',
      title: 'Template catalog update',
      message: `New template "${title}" is available.`,
      actor,
      documentName: title,
      ctaAction: { label: 'Open document review', path: bufmPath },
    })
    navigate(withApp(basePath))
  }

  const handleSaveDraftChoice = option => {
    setSaveModal(false)
    if (option === 'draft') {
      persist('draft')
      navigate(withApp(basePath))
    } else if (option === 'submit') {
      const tid = persist('submitted')
      updateTemplate(tid, { status: 'submitted' })
      navigate(withApp(basePath))
    }
  }

  const canSave = name.trim().length > 0

  return (
    <Layout>
      <div className="kmt-page kmt-template-editor">
        {breadcrumb}

        <section className="kmt-template-editor__section kmt-template-editor__section--basic">
          <div className="kmt-template-editor__section-head">
            <h1 className="kmt-template-editor__section-title">Basic information</h1>
            <p className="kmt-template-editor__section-sub">
              {templateApp === 'RSAUI' ? 'RSAUI' : 'CEUI'} workflow — document name, type, line of business, and market type.
            </p>
          </div>
          <div className="kmt-template-editor__fields kmt-wizard__fields">
            <label className="kmt-field">
              <span>Document name</span>
              <input
                className="kmt-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. DIV 386 MUNI – City of Port Orange, FL"
              />
            </label>
            <label className="kmt-field">
              <span>Document type</span>
              <select className="kmt-input" value={docType} onChange={e => setDocType(e.target.value)}>
                {DOC_TYPES.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="kmt-field">
              <span>Line of business</span>
              <select className="kmt-input" value={lineOfBusiness} onChange={e => setLineOfBusiness(e.target.value)}>
                {LINE_OF_BUSINESS_OPTIONS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="kmt-field">
              <span>Market type</span>
              <select className="kmt-input" value={marketType} onChange={e => setMarketType(e.target.value)}>
                {MARKET_TYPE_OPTIONS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="kmt-template-editor__section kmt-template-editor__section--form">
          <div className="kmt-template-editor__section-head">
            <h2 className="kmt-template-editor__section-title">Form builder</h2>
            <p className="kmt-template-editor__section-sub">
              {templateApp === 'RSAUI'
                ? 'RSAUI service-area structure: sections above tabs and tab steps. Drag fields from the library.'
                : 'Sections above tabs and tab steps for CEUI. Drag fields from the library.'}
            </p>
          </div>
          <div className="kmt-template-editor__form-shell">
            <KmtFormBuilder embedded controlledForm={form} setControlledForm={setForm} />
          </div>
        </section>

        <section className="kmt-template-editor__section kmt-template-editor__section--workflow kmt-template-editor__section--assignees-workflow">
          <TemplateAssigneesWorkflow
            stages={approvalLevels}
            assigneesByLevel={assigneesByLevel}
            users={users}
            onStagesChange={setApprovalLevels}
            onAssigneesChange={setAssigneesByLevel}
            onNotify={({ title, message }) =>
              addNotification({
                role: 'KMT',
                statusType: 'info',
                title,
                message,
                actor: user?.name || 'KMT',
              })
            }
          />
        </section>

        <footer className="kmt-template-editor__footer">
          <div className="kmt-template-editor__footer-inner">
            <button type="button" className="btn btn-outline" onClick={() => navigate(withApp(basePath))}>
              Back to templates
            </button>
            <div className="kmt-template-editor__footer-actions">
              <button type="button" className="btn btn-outline" disabled={!canSave} onClick={() => setSaveModal(true)}>
                Save draft…
              </button>
              <button type="button" className="btn btn-primary" disabled={!canSave} onClick={handlePublish}>
                Publish template
              </button>
            </div>
          </div>
        </footer>

        {saveModal && (
          <div className="confirm-modal-backdrop" role="presentation" onClick={() => setSaveModal(false)}>
            <div className="confirm-modal confirm-modal--wide" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
              <h2 className="confirm-modal__title">Save as</h2>
              <p className="confirm-modal__msg">Choose how to save this workflow template.</p>
              <div className="confirm-modal__actions confirm-modal__actions--stack">
                <button type="button" className="btn btn-primary" onClick={() => handleSaveDraftChoice('draft')}>
                  Save as draft
                </button>
                <button type="button" className="btn btn-outline" onClick={() => handleSaveDraftChoice('submit')}>
                  Submit for review
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setSaveModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

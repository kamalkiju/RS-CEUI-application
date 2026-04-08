import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useKmtTemplates } from '../../context/KmtTemplateContext.jsx'
import { useNotifications } from '../../context/NotificationContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useKmtUsers } from '../../context/KmtUsersContext.jsx'
import { ensureFivePocTabs, ensureFiveRsauiTabs, uid } from './kmtFormBuilderShared.js'
import { normalizeTemplateForm } from './pocReferenceFormSeed.js'
import { normalizeRsauiTemplateForm } from './rsauiReferenceFormSeed.js'
import KmtFormBuilder from './KmtFormBuilder.jsx'

const DOC_TYPES = ['Commercial', 'Residential', 'Municipal', 'RSAUI', 'General']
const LINE_OF_BUSINESS_OPTIONS = ['Commercial', 'Residential', 'Municipal', 'Industrial', 'Roll-off', 'Other']
const MARKET_TYPE_OPTIONS = ['Residential', 'Commercial', 'Municipal', 'Industrial', 'Open Market', 'Other']

/** Extra approval stages (in addition to POC / BUFM / KMT) — user can reorder all. */
const ADDABLE_ROLES = ['POC', 'RTV', 'BUFM', 'KMT', 'LEGAL']

function defaultApprovalLevels() {
  return [
    { id: uid(), role: 'POC' },
    { id: uid(), role: 'BUFM' },
    { id: uid(), role: 'KMT' },
  ]
}

export default function KmtTemplateWizard() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { getTemplate, saveTemplate, updateTemplate } = useKmtTemplates()
  const { addNotification } = useNotifications()
  const { users } = useKmtUsers()

  const templateApp = useMemo(
    () => (location.pathname.startsWith('/rsaui/kmt') ? 'RSAUI' : 'CEUI'),
    [location.pathname],
  )
  const basePath = templateApp === 'RSAUI' ? '/rsaui/kmt/documents' : '/kmt/documents'

  const initialForm = () =>
    templateApp === 'RSAUI'
      ? normalizeRsauiTemplateForm({ tabs: [], headerGroups: [] })
      : normalizeTemplateForm({ tabs: [], headerGroups: [] })

  const [name, setName] = useState('')
  const [docType, setDocType] = useState('Commercial')
  const [lineOfBusiness, setLineOfBusiness] = useState(LINE_OF_BUSINESS_OPTIONS[0])
  const [marketType, setMarketType] = useState(MARKET_TYPE_OPTIONS[0])
  const [assignees, setAssignees] = useState({
    pocUserIds: [],
    bufmUserIds: [],
    kmtUserIds: [],
  })
  const [approvalLevels, setApprovalLevels] = useState(defaultApprovalLevels)
  const [dragId, setDragId] = useState(null)
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
      setAssignees({ pocUserIds: [], bufmUserIds: [], kmtUserIds: [] })
      setApprovalLevels(defaultApprovalLevels())
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
    setAssignees({
      pocUserIds: t.assignees?.pocUserIds || [],
      bufmUserIds: t.assignees?.bufmUserIds || [],
      kmtUserIds: t.assignees?.kmtUserIds || [],
    })
    setApprovalLevels(
      Array.isArray(t.approvalLevels) && t.approvalLevels.length
        ? t.approvalLevels.map(x => ({ ...x, id: x.id || uid() }))
        : defaultApprovalLevels(),
    )
    const rawForm = t.form || { tabs: [], headerGroups: [] }
    const app = t.targetApp === 'RSAUI' ? 'RSAUI' : 'CEUI'
    setForm((app === 'RSAUI' ? normalizeRsauiTemplateForm : normalizeTemplateForm)(rawForm))
  }, [routeId, getTemplate, templateApp])

  const pocUsers = users.filter(u => u.role === 'POC')
  const bufmUsers = users.filter(u => u.role === 'BUFM')
  const kmtUsers = users.filter(u => u.role === 'KMT')

  const toggleAssignee = (groupKey, userId) => {
    setAssignees(prev => ({
      ...prev,
      [groupKey]: prev[groupKey].includes(userId)
        ? prev[groupKey].filter(id => id !== userId)
        : [...prev[groupKey], userId],
    }))
  }

  const reorderLevels = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return
    setApprovalLevels(prev => {
      const next = [...prev]
      const [row] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, row)
      return next
    })
  }

  const removeLevel = id => {
    setApprovalLevels(prev => (prev.length <= 1 ? prev : prev.filter(x => x.id !== id)))
  }

  const addLevel = role => {
    setApprovalLevels(prev => [...prev, { id: uid(), role }])
  }

  const updateLevelRole = (id, role) => {
    setApprovalLevels(prev => prev.map(x => (x.id === id ? { ...x, role } : x)))
  }

  const displayName = () => name.trim() || 'Untitled template'

  const breadcrumb = (
    <nav className="kmt-breadcrumb kmt-template-editor__breadcrumb" aria-label="Breadcrumb">
      <Link to={basePath}>Document templates</Link>
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
        assignees,
        approvalLevels,
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
    const pocPath = templateApp === 'RSAUI' ? '/rsaui/poc/document-review' : '/poc'
    const bufmPath = templateApp === 'RSAUI' ? '/rsaui/bufm/document-review/review' : '/bufm/document-review/review'
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
    navigate(basePath)
  }

  const handleSaveDraftChoice = option => {
    setSaveModal(false)
    if (option === 'draft') {
      persist('draft')
      navigate(basePath)
    } else if (option === 'submit') {
      const tid = persist('submitted')
      updateTemplate(tid, { status: 'submitted' })
      navigate(basePath)
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

        <section className="kmt-template-editor__section kmt-template-editor__section--workflow">
          <div className="kmt-template-editor__section-head">
            <h2 className="kmt-template-editor__section-title">Approval order</h2>
            <p className="kmt-template-editor__section-sub">
              Drag stages to reorder (e.g. move RTV before BUFM). Add stages with the dropdown. This defines the review sequence before assignees.
            </p>
          </div>
          <div className="kmt-approval-levels">
            <ul className="kmt-approval-levels__list">
              {approvalLevels.map((lvl, idx) => (
                <li
                  key={lvl.id}
                  className="kmt-approval-levels__item"
                  draggable
                  onDragStart={() => setDragId(lvl.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    if (!dragId || dragId === lvl.id) return
                    const from = approvalLevels.findIndex(x => x.id === dragId)
                    const to = idx
                    reorderLevels(from, to)
                    setDragId(null)
                  }}
                >
                  <span className="kmt-approval-levels__grip" title="Drag to reorder">
                    ⋮⋮
                  </span>
                  <select
                    className="kmt-input kmt-input--inline"
                    value={lvl.role}
                    onChange={e => updateLevelRole(lvl.id, e.target.value)}
                  >
                    {ADDABLE_ROLES.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-outline kmt-btn-compact" onClick={() => removeLevel(lvl.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="kmt-approval-levels__add">
              <span>Add stage:</span>
              <select
                className="kmt-input kmt-input--inline"
                defaultValue=""
                onChange={e => {
                  const v = e.target.value
                  if (v) addLevel(v)
                  e.target.value = ''
                }}
              >
                <option value="" disabled>
                  Select role…
                </option>
                {ADDABLE_ROLES.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="kmt-template-editor__section kmt-template-editor__section--workflow">
          <div className="kmt-template-editor__section-head">
            <h2 className="kmt-template-editor__section-title">Template assignees</h2>
            <p className="kmt-template-editor__section-sub">Assign POC authors, BUFM approvers, and KMT approvers for this template.</p>
          </div>
          <div className="kmt-template-editor__workflow-shell">
            <div className="kmt-wizard__fields">
              <label className="kmt-field">
                <span>POC users</span>
                <div className="kmt-template-editor__assignees-list">
                  {pocUsers.map(u => (
                    <label key={u.id} className="kmt-template-editor__assignee">
                      <input type="checkbox" checked={assignees.pocUserIds.includes(u.id)} onChange={() => toggleAssignee('pocUserIds', u.id)} />
                      <span>{u.name}</span>
                    </label>
                  ))}
                </div>
              </label>
              <label className="kmt-field">
                <span>BUFM approvers</span>
                <div className="kmt-template-editor__assignees-list">
                  {bufmUsers.map(u => (
                    <label key={u.id} className="kmt-template-editor__assignee">
                      <input type="checkbox" checked={assignees.bufmUserIds.includes(u.id)} onChange={() => toggleAssignee('bufmUserIds', u.id)} />
                      <span>{u.name}</span>
                    </label>
                  ))}
                </div>
              </label>
              <label className="kmt-field">
                <span>KMT approvers</span>
                <div className="kmt-template-editor__assignees-list">
                  {kmtUsers.map(u => (
                    <label key={u.id} className="kmt-template-editor__assignee">
                      <input type="checkbox" checked={assignees.kmtUserIds.includes(u.id)} onChange={() => toggleAssignee('kmtUserIds', u.id)} />
                      <span>{u.name}</span>
                    </label>
                  ))}
                </div>
              </label>
            </div>
          </div>
        </section>

        <footer className="kmt-template-editor__footer">
          <div className="kmt-template-editor__footer-inner">
            <button type="button" className="btn btn-outline" onClick={() => navigate(basePath)}>
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

import { useState, useEffect, useMemo, useRef } from 'react'
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

function filterUsersForPicker(users, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return users
  return users.filter(u => {
    const name = (u.name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    const role = (u.role || '').toLowerCase()
    const region = (u.region || '').toLowerCase()
    return name.includes(q) || email.includes(q) || role.includes(q) || region.includes(q)
  })
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
  const approvalSeedRef = useRef(buildDefaultApprovalState())
  const [approvalLevels, setApprovalLevels] = useState(() => approvalSeedRef.current.approvalLevels)
  const [assigneesByLevel, setAssigneesByLevel] = useState(() => approvalSeedRef.current.assigneesByLevel)
  /** Per-stage search text for directory picker (CEUI / RSAUI). */
  const [stageAssigneeQuery, setStageAssigneeQuery] = useState({})
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
      const next = buildDefaultApprovalState()
      approvalSeedRef.current = next
      setApprovalLevels(next.approvalLevels)
      setAssigneesByLevel(next.assigneesByLevel)
      setStageAssigneeQuery({})
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
    setStageAssigneeQuery({})
    const rawForm = t.form || { tabs: [], headerGroups: [] }
    const app = t.targetApp === 'RSAUI' ? 'RSAUI' : 'CEUI'
    setForm((app === 'RSAUI' ? normalizeRsauiTemplateForm : normalizeTemplateForm)(rawForm))
  }, [routeId, getTemplate, templateApp])

  const addUserToStage = (levelId, userId) => {
    setAssigneesByLevel(prev => {
      const cur = prev[levelId] || []
      if (cur.includes(userId)) return prev
      return { ...prev, [levelId]: [...cur, userId] }
    })
  }

  const removeUserFromStage = (levelId, userId) => {
    setAssigneesByLevel(prev => ({
      ...prev,
      [levelId]: (prev[levelId] || []).filter(id => id !== userId),
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
    setAssigneesByLevel(prev => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const addLevel = () => {
    const nid = uid()
    setApprovalLevels(prev => [...prev, { id: nid, name: 'New stage' }])
    setAssigneesByLevel(prev => ({ ...prev, [nid]: [] }))
  }

  const updateLevelName = (id, nextName) => {
    setApprovalLevels(prev => prev.map(x => (x.id === id ? { ...x, name: nextName } : x)))
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
        approvalLevels: approvalLevels.map(l => ({ id: l.id, name: String(l.name || '').trim() || 'Stage' })),
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
              Name each approval stage, drag to reorder, and add stages as needed. Assign people to each stage in the section below—assignment is per stage, not by role label.
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
                  <label className="kmt-field kmt-field--inline">
                    <input
                      type="text"
                      className="kmt-input kmt-input--inline"
                      value={lvl.name}
                      onChange={e => updateLevelName(lvl.id, e.target.value)}
                      placeholder="Stage name (e.g. POC, Legal review)"
                      aria-label={`Approval stage ${idx + 1} name`}
                    />
                  </label>
                  <button type="button" className="btn btn-outline kmt-btn-compact" onClick={() => removeLevel(lvl.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="kmt-approval-levels__add">
              <button type="button" className="btn btn-outline kmt-btn-compact" onClick={addLevel}>
                Add stage
              </button>
            </div>
          </div>
        </section>

        <section className="kmt-template-editor__section kmt-template-editor__section--workflow">
          <div className="kmt-template-editor__section-head">
            <h2 className="kmt-template-editor__section-title">Template assignees</h2>
            <p className="kmt-template-editor__section-sub">
              For each stage, search the directory by name or email, then add users. Any user can be assigned to any stage—stage names are labels only.
            </p>
          </div>
          <div className="kmt-template-editor__workflow-shell">
            <div className="kmt-wizard__fields kmt-wizard__fields--stage-assignees">
              {approvalLevels.map((lvl, idx) => {
                const selected = assigneesByLevel[lvl.id] || []
                const q = stageAssigneeQuery[lvl.id] ?? ''
                const matches = filterUsersForPicker(users, q)
                return (
                  <div key={lvl.id} className="kmt-field kmt-field--stage-block">
                    <span>
                      {idx + 1}. {lvl.name.trim() || 'Stage'}
                    </span>
                    <div className="kmt-stage-assignee-picker">
                      <label className="kmt-field kmt-field--search">
                        <span>Search users</span>
                        <input
                          type="search"
                          className="kmt-input"
                          placeholder="Search by name or email…"
                          value={q}
                          onChange={e => setStageAssigneeQuery(prev => ({ ...prev, [lvl.id]: e.target.value }))}
                          autoComplete="off"
                          aria-label={`Search users for stage ${idx + 1}`}
                        />
                      </label>
                      <ul className="kmt-stage-assignee-picker__results" aria-label="Matching directory users">
                        {matches.length === 0 ? (
                          <li className="kmt-stage-assignee-picker__empty">No users match this search.</li>
                        ) : (
                          matches.slice(0, 24).map(u => {
                            const already = selected.includes(u.id)
                            return (
                              <li
                                key={u.id}
                                className={already ? 'kmt-stage-assignee-picker__row kmt-stage-assignee-picker__row--assigned' : 'kmt-stage-assignee-picker__row'}
                              >
                                <button
                                  type="button"
                                  className={`kmt-stage-assignee-picker__add${already ? ' kmt-stage-assignee-picker__add--assigned' : ''}`}
                                  disabled={already}
                                  onClick={() => addUserToStage(lvl.id, u.id)}
                                >
                                  <span className="kmt-stage-assignee-picker__user-name">{u.name}</span>
                                  <span className="kmt-stage-assignee-picker__user-meta">{u.email || '—'}</span>
                                  {already ? (
                                    <span className="kmt-stage-assignee-picker__badge">Assigned</span>
                                  ) : (
                                    <span className="kmt-stage-assignee-picker__hint">Add</span>
                                  )}
                                </button>
                              </li>
                            )
                          })
                        )}
                      </ul>
                      <div
                        className={`kmt-stage-assignee-picker__assigned${selected.length ? ' kmt-stage-assignee-picker__assigned--has-users' : ''}`}
                        aria-label="Assigned users"
                      >
                        <span className="kmt-stage-assignee-picker__assigned-label">Assigned</span>
                        {selected.length === 0 ? (
                          <p className="kmt-template-editor__assignees-empty">No one assigned yet. Use search above to add users.</p>
                        ) : (
                          <ul className="kmt-stage-assignee-picker__chips">
                            {selected.map(uid => {
                              const u = users.find(x => x.id === uid)
                              if (!u) {
                                return (
                                  <li key={uid}>
                                    <span className="kmt-assignee-chip kmt-assignee-chip--unknown">{uid}</span>
                                  </li>
                                )
                              }
                              return (
                                <li key={uid}>
                                  <span className="kmt-assignee-chip kmt-assignee-chip--highlight">
                                    <span className="kmt-assignee-chip__name">{u.name}</span>
                                    <button
                                      type="button"
                                      className="kmt-assignee-chip__remove"
                                      aria-label={`Remove ${u.name} from this stage`}
                                      onClick={() => removeUserFromStage(lvl.id, uid)}
                                    >
                                      ×
                                    </button>
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
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

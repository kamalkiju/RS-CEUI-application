import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useKmtTemplates } from '../../context/KmtTemplateContext.jsx'
import { useNotifications } from '../../context/NotificationContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useKmtUsers } from '../../context/KmtUsersContext.jsx'
import { ensureFivePocTabs } from '../kmt/kmtFormBuilderShared.js'
import { normalizeTemplateForm } from '../kmt/pocReferenceFormSeed.js'
import KmtFormBuilder from '../kmt/KmtFormBuilder.jsx'

export default function ItTemplateWizard() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getTemplate, saveTemplate, updateTemplate } = useKmtTemplates()
  const { addNotification } = useNotifications()
  const { users } = useKmtUsers()

  /** Free-text application (label shown as CEUI — type e.g. CEUI, RSAUI). */
  const [targetApp, setTargetApp] = useState('CEUI')
  const [assignees, setAssignees] = useState({
    pocUserIds: [],
    bufmUserIds: [],
    kmtUserIds: [],
  })
  const [form, setForm] = useState(() => normalizeTemplateForm({ tabs: [], headerGroups: [] }))
  const [saveModal, setSaveModal] = useState(false)
  const [sessionId, setSessionId] = useState(null)

  const editingId = routeId || sessionId

  useEffect(() => {
    if (!routeId) return
    const t = getTemplate(routeId)
    if (!t) return
    setSessionId(t.id)
    setTargetApp(typeof t.targetApp === 'string' ? t.targetApp : 'CEUI')
    setAssignees({
      pocUserIds: t.assignees?.pocUserIds || [],
      bufmUserIds: t.assignees?.bufmUserIds || [],
      kmtUserIds: t.assignees?.kmtUserIds || [],
    })
    setForm(normalizeTemplateForm(t.form || { tabs: [], headerGroups: [] }))
  }, [routeId, getTemplate])

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

  const workflowTitle = () => targetApp.trim() || 'Workflow template'

  const breadcrumb = (
    <nav className="kmt-breadcrumb kmt-template-editor__breadcrumb" aria-label="Breadcrumb">
      <Link to="/it/documents">Document templates</Link>
      <span aria-hidden> / </span>
      <span>{editingId ? 'Edit workflow template' : 'Create workflow template'}</span>
    </nav>
  )

  const persist = (status = 'draft') => {
    const normalized = ensureFivePocTabs(form)
    setForm(normalized)
    const existing = editingId ? getTemplate(editingId) : null
    const tid = saveTemplate(
      {
        name: workflowTitle(),
        docType: 'Workflow',
        targetApp: targetApp.trim() || 'CEUI',
        lineOfBusiness: existing?.lineOfBusiness ?? '',
        serviceArea: existing?.serviceArea ?? '',
        description: existing?.description ?? '',
        marketSegment: existing?.marketSegment ?? '',
        status,
        assignees,
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
          detail: 'Workflow template is live. POC and BUFM were notified.',
          actor: user?.name || 'IT',
          at: new Date().toISOString(),
        },
      ],
    })
    const actor = user?.name || 'IT'
    const title = workflowTitle()
    addNotification({
      role: 'POC',
      statusType: 'publish',
      title: 'New workflow template published',
      message: `IT published workflow template "${title}" (${targetApp.trim() || 'CEUI'}).`,
      actor,
      documentName: title,
      ctaAction: { label: 'View documents', path: '/poc' },
    })
    addNotification({
      role: 'BUFM',
      statusType: 'publish',
      title: 'Template catalog update',
      message: `New workflow template "${title}" is available for reference.`,
      actor,
      documentName: title,
      ctaAction: { label: 'Open document review', path: '/bufm/document-review/review' },
    })
    navigate('/it/documents')
  }

  const handleSaveDraftChoice = option => {
    setSaveModal(false)
    if (option === 'draft') {
      persist('draft')
      navigate('/it/documents')
    } else if (option === 'submit') {
      const tid = persist('submitted')
      updateTemplate(tid, { status: 'submitted' })
      navigate('/it/documents')
    }
  }

  const canSave = targetApp.trim().length > 0

  return (
    <Layout>
      <div className="kmt-page kmt-template-editor">
        {breadcrumb}

        <section className="kmt-template-editor__section kmt-template-editor__section--basic">
          <div className="kmt-template-editor__section-head">
            <h1 className="kmt-template-editor__section-title">Workflow template</h1>
            <p className="kmt-template-editor__section-sub">Enter the target application name (free text).</p>
          </div>
          <div className="kmt-template-editor__fields kmt-wizard__fields">
            <label className="kmt-field">
              <span>CEUI</span>
              <input
                className="kmt-input"
                value={targetApp}
                onChange={e => setTargetApp(e.target.value)}
                placeholder="Type application, e.g. CEUI or RSAUI"
                autoComplete="off"
              />
            </label>
          </div>
        </section>

        <section className="kmt-template-editor__section kmt-template-editor__section--form">
          <div className="kmt-template-editor__section-head">
            <h2 className="kmt-template-editor__section-title">Form builder</h2>
            <p className="kmt-template-editor__section-sub">
              Add sections <strong>above the tabs</strong> (e.g. Basic information), then build each tab. Drag field types from the library.
            </p>
          </div>
          <div className="kmt-template-editor__form-shell">
            <KmtFormBuilder embedded controlledForm={form} setControlledForm={setForm} />
          </div>
        </section>

        <section className="kmt-template-editor__section kmt-template-editor__section--workflow">
          <div className="kmt-template-editor__section-head">
            <h2 className="kmt-template-editor__section-title">Template assignees</h2>
            <p className="kmt-template-editor__section-sub">
              Assign who can work on this template: POC authors, BUFM approvers, and KMT approvers.
            </p>
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
            <button type="button" className="btn btn-outline" onClick={() => navigate('/it/documents')}>
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

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useKmtTemplates } from '../../context/KmtTemplateContext.jsx'
import { useNotifications } from '../../context/NotificationContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { ensureFivePocTabs } from './kmtFormBuilderShared.js'
import { normalizeTemplateForm } from './pocReferenceFormSeed.js'
import WorkflowBuilderBody, { DEFAULT_WF_NODES, DEFAULT_WF_EDGES } from '../../components/kmt/WorkflowBuilderBody.jsx'
import KmtFormBuilder from './KmtFormBuilder.jsx'

const DOC_TYPES = ['Commercial', 'Residential', 'Municipal', 'RSAUI', 'General']
const LINE_OF_BUSINESS_OPTIONS = ['Commercial', 'Residential', 'Municipal', 'Industrial', 'Roll-off', 'Other']
const MARKET_TYPE_OPTIONS = ['Residential', 'Commercial', 'Municipal', 'Industrial', 'Open Market', 'Other']

export default function KmtTemplateWizard() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getTemplate, saveTemplate, updateTemplate } = useKmtTemplates()
  const { addNotification } = useNotifications()

  const [name, setName] = useState('')
  const [docType, setDocType] = useState('Commercial')
  const [lineOfBusiness, setLineOfBusiness] = useState(LINE_OF_BUSINESS_OPTIONS[0])
  const [marketType, setMarketType] = useState(MARKET_TYPE_OPTIONS[0])
  const [nodes, setNodes] = useState(DEFAULT_WF_NODES)
  const [edges, setEdges] = useState(DEFAULT_WF_EDGES)
  const [form, setForm] = useState(() => normalizeTemplateForm({ tabs: [] }))
  const [workflowSavedFlash, setWorkflowSavedFlash] = useState(false)
  const [saveModal, setSaveModal] = useState(false)
  const [sessionId, setSessionId] = useState(null)

  const editingId = routeId || sessionId

  useEffect(() => {
    if (!routeId) return
    const t = getTemplate(routeId)
    if (!t) return
    setSessionId(t.id)
    setName(t.name)
    setDocType(t.docType)
    const lob = t.lineOfBusiness || ''
    setLineOfBusiness(LINE_OF_BUSINESS_OPTIONS.includes(lob) ? lob : lob || LINE_OF_BUSINESS_OPTIONS[0])
    const mt = t.marketSegment || ''
    setMarketType(MARKET_TYPE_OPTIONS.includes(mt) ? mt : mt || MARKET_TYPE_OPTIONS[0])
    if (t.workflow?.nodes?.length) setNodes(t.workflow.nodes)
    if (t.workflow?.edges?.length) setEdges(t.workflow.edges)
    setForm(normalizeTemplateForm(t.form || { tabs: [] }))
  }, [routeId, getTemplate])

  const breadcrumb = (
    <nav className="kmt-breadcrumb kmt-template-editor__breadcrumb" aria-label="Breadcrumb">
      <Link to="/kmt/documents">Documents</Link>
      <span aria-hidden> / </span>
      <span>{editingId ? 'Edit template' : 'Create template'}</span>
    </nav>
  )

  const persist = (status = 'draft') => {
    const normalized = ensureFivePocTabs(form)
    setForm(normalized)
    const existing = editingId ? getTemplate(editingId) : null
    const tid = saveTemplate(
      {
        name,
        docType,
        lineOfBusiness,
        serviceArea: existing?.serviceArea ?? '',
        description: existing?.description ?? '',
        marketSegment: marketType,
        status,
        workflow: { nodes, edges },
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
          detail: 'Template is live. POC and BUFM were notified.',
          actor: user?.name || 'KMT',
          at: new Date().toISOString(),
        },
      ],
    })
    addNotification({
      role: 'POC',
      statusType: 'publish',
      title: 'New document template published',
      message: `KMT published template "${name}".`,
      actor: user?.name || 'KMT',
      documentName: name,
      ctaAction: { label: 'View documents', path: '/poc' },
    })
    addNotification({
      role: 'BUFM',
      statusType: 'publish',
      title: 'Template catalog update',
      message: `New template "${name}" is available for reference.`,
      actor: user?.name || 'KMT',
      documentName: name,
      ctaAction: { label: 'Open document review', path: '/bufm/document-review/review' },
    })
    navigate('/kmt/documents')
  }

  const saveWorkflowDraft = () => {
    persist('draft')
    setWorkflowSavedFlash(true)
    window.setTimeout(() => setWorkflowSavedFlash(false), 2000)
  }

  const handleSaveDraftChoice = option => {
    setSaveModal(false)
    if (option === 'draft') {
      persist('draft')
      navigate('/kmt/documents')
    } else if (option === 'submit') {
      const tid = persist('submitted')
      updateTemplate(tid, { status: 'submitted' })
      navigate('/kmt/documents')
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
            <p className="kmt-template-editor__section-sub">Document name, type, line of business, and market type.</p>
          </div>
          <div className="kmt-template-editor__fields kmt-wizard__fields">
            <label className="kmt-field">
              <span>Document name</span>
              <input className="kmt-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. DIV 386 MUNI – City of Port Orange, FL" />
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
            <p className="kmt-template-editor__section-sub">Tabs, groups, and fields. Drag field types from the library onto the canvas.</p>
          </div>
          <div className="kmt-template-editor__form-shell">
            <KmtFormBuilder embedded controlledForm={form} setControlledForm={setForm} />
          </div>
        </section>

        <section className="kmt-template-editor__section kmt-template-editor__section--workflow">
          <div className="kmt-template-editor__section-head">
            <h2 className="kmt-template-editor__section-title">Workflow builder</h2>
            <p className="kmt-template-editor__section-sub">
              Define approval flow. Drag nodes and connect them. Use <strong>Save workflow draft</strong> to persist workflow with the template.
            </p>
          </div>
          {workflowSavedFlash && (
            <p className="kmt-wizard__flash" role="status">
              Workflow and template saved as draft.
            </p>
          )}
          <div className="kmt-template-editor__workflow-shell">
            <WorkflowBuilderBody compact nodes={nodes} setNodes={setNodes} edges={edges} setEdges={setEdges} showTimeline />
          </div>
        </section>

        <footer className="kmt-template-editor__footer">
          <div className="kmt-template-editor__footer-inner">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/kmt/documents')}>
              Back to templates
            </button>
            <div className="kmt-template-editor__footer-actions">
              <button type="button" className="btn btn-outline" disabled={!canSave} onClick={saveWorkflowDraft}>
                Save workflow draft
              </button>
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
              <p className="confirm-modal__msg">Choose how to save this template.</p>
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

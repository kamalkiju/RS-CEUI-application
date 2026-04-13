import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout.jsx'
import { useDocs } from '../../context/DocContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getDisplayStatus } from '../../utils/documentStatus.js'
import {
  buildReadOnlyFieldSnapshot,
  getReadOnlyStepHeading,
  getReadOnlyStepSections,
  getStepsTouchedByPocUpdates,
} from '../poc/DocumentEditor/documentWizardReadOnlyModel.js'
import ReadOnlyFieldsAccordion from '../../components/ReadOnlyFieldsAccordion.jsx'
import DocumentPulseComments from '../../components/DocumentPulseComments.jsx'
import RejectModal from '../../components/RejectModal.jsx'
import VersionBadge from '../../components/VersionBadge.jsx'
import VersionHistoryDrawer from '../../components/VersionHistoryDrawer.jsx'
import PocUpdateSummaryBanner from '../../components/PocUpdateSummaryBanner.jsx'
import {
  getCaseStageDisplay,
  getPreviousVersionLinkLabel,
  inferDocVersion,
  resolveMockPreviousDocumentId,
} from '../../utils/documentVersion.js'
import {
  buildPocUpdateFlagSets,
  buildReviewerFlagSets,
  isFieldFlagged,
  isReviewerHighlightingWholeStep,
  isSectionFlagged,
  lastRejectTrailEntry,
  normalizeLabel,
} from '../../utils/reviewFeedback.js'
import KmtFormBuilder from './KmtFormBuilder.jsx'
import { ensureFivePocTabs } from './kmtFormBuilderShared.js'
import { normalizeTemplateForm } from './pocReferenceFormSeed.js'

const STEPPER_STEPS = [
  { n: 1, short: 'Knowledge Area' },
  { n: 2, short: 'Service Categories' },
  { n: 3, short: 'Offerings' },
  { n: 4, short: 'Extra Pickup' },
  { n: 5, short: 'Fees' },
]

export default function KmtDocumentView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const kmtEdit = Boolean(location.state?.kmtEdit)
  const { user } = useAuth()
  const { docs, getDocumentById, updateDoc, countDocumentsByUserId } = useDocs()
  const doc = id ? getDocumentById(id) : null

  const [activeStep, setActiveStep] = useState(1)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectPicks, setRejectPicks] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [kmtNote, setKmtNote] = useState('')
  const [basicSub, setBasicSub] = useState('')
  const [basicArea, setBasicArea] = useState('')
  const [basicMarket, setBasicMarket] = useState('')
  const [basicLob, setBasicLob] = useState('')
  const [basicSaName, setBasicSaName] = useState('')
  const [basicSaId, setBasicSaId] = useState('')
  const [basicSaType, setBasicSaType] = useState('')
  const [docForm, setDocForm] = useState(() => normalizeTemplateForm({ tabs: [] }))

  useEffect(() => {
    if (doc) setKmtNote(doc.kmtEditorialNote || '')
  }, [doc?.id, doc?.kmtEditorialNote])

  useEffect(() => {
    if (!doc) return
    setBasicSub(doc.sub || '')
    setBasicArea(doc.area || '')
    setBasicMarket(doc.market || '')
    setBasicLob(doc.lob || '')
    const a0 = doc.areas?.[0]
    setBasicSaName(a0?.name || '')
    setBasicSaId(a0?.id != null ? String(a0.id) : '')
    setBasicSaType(a0?.type || '')
    setDocForm(normalizeTemplateForm(doc.form || {}))
  }, [doc?.id])

  const disp = useMemo(() => (doc ? getDisplayStatus(doc, 'KMT') : null), [doc])
  const headerStatusLabel =
    doc?.status === 'approved' ? 'Final Approved' : disp?.label
  const showBufmApprovedLine = doc?.status === 'Pending_KMT' && doc?.approved_by_BUFM
  const showKmtRejectReason = doc?.status === 'Rejected_KMT' && doc?.rejection_comment_KMT
  const heading = doc ? getReadOnlyStepHeading(activeStep) : { title: '', subtitle: '' }
  const sections = doc ? getReadOnlyStepSections(doc, activeStep) : []

  const reviewerSets = useMemo(() => buildReviewerFlagSets(doc), [doc])
  const pocSets = useMemo(() => buildPocUpdateFlagSets(doc), [doc])
  const wholeStepReviewer = useMemo(
    () => isReviewerHighlightingWholeStep(activeStep, reviewerSets.sections),
    [activeStep, reviewerSets.sections],
  )
  const wholeStepPoc = useMemo(
    () => isReviewerHighlightingWholeStep(activeStep, pocSets.sections),
    [activeStep, pocSets.sections],
  )
  const lastKmtReject = useMemo(
    () => lastRejectTrailEntry(doc?.reviewAuditTrail, 'KMT'),
    [doc?.reviewAuditTrail],
  )

  const totalByUser = doc?.createdByUserId
    ? countDocumentsByUserId(doc.createdByUserId)
    : 0

  const previousVersionDocId = useMemo(
    () => (doc ? resolveMockPreviousDocumentId(doc, docs) : null),
    [doc, docs],
  )

  const openDocumentDetail = useCallback(
    targetId => {
      if (!targetId) return
      navigate(`/kmt/document/${encodeURIComponent(targetId)}`)
    },
    [navigate],
  )

  const showReviewActions = doc?.status === 'Pending_KMT'

  const pulseRevision = doc
    ? `${doc.updated}|${(doc.pulseComments || []).length}`
    : '0'

  if (!doc) {
    return (
      <Layout>
        <div className="bufm-doc-view bufm-doc-view--missing">
          <p>Document not found.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/kmt/document-review/ceui/review')}>
            Back to review queue
          </button>
        </div>
      </Layout>
    )
  }

  const serviceAreaLabel =
    kmtEdit
      ? (basicSaName.trim() || basicArea.trim() || doc.area || doc.areas?.[0]?.name || '—')
      : (doc.area || doc.areas?.[0]?.name || '—')

  const viewerName = user?.name || 'KMT Reviewer'

  const toggleRejectPick = (scope, label) => {
    setRejectPicks(prev => {
      const i = prev.findIndex(
        p => p.scope === scope && normalizeLabel(p.label) === normalizeLabel(label),
      )
      if (i >= 0) return prev.filter((_, j) => j !== i)
      return [...prev, { scope, label }]
    })
  }
  const isRejectPick = (scope, label) =>
    rejectPicks.some(p => p.scope === scope && normalizeLabel(p.label) === normalizeLabel(label))

  const handleApprove = () => {
    const today = new Date().toISOString().slice(0, 10)
    updateDoc(doc.id, {
      status: 'approved',
      approved_by_KMT: true,
      kmtApproveDate: today,
      poc_updated_sections: undefined,
      poc_updated_fields: undefined,
      pocResubmissionNote: undefined,
      tabs: Array.from(new Set([...(doc.tabs || []), 'all'])),
    })
    navigate('/kmt/document-review/ceui/approved')
  }

  const handleRejectConfirm = payload => {
    const comment = typeof payload === 'string' ? payload : payload.comment
    const highlightSections =
      typeof payload === 'object' && payload.highlightSections ? payload.highlightSections : []
    const highlightFields =
      typeof payload === 'object' && payload.highlightFields ? payload.highlightFields : []
    const feedbackItems =
      typeof payload === 'object' && Array.isArray(payload.feedbackItems) ? payload.feedbackItems : []
    const today = new Date().toISOString().slice(0, 10)
    const trail = doc.reviewAuditTrail || []
    updateDoc(doc.id, {
      status: 'Rejected_KMT',
      rejection_comment_KMT: comment,
      rejection_highlight_sections: highlightSections,
      rejection_highlight_fields: highlightFields,
      rejection_feedback_items: feedbackItems,
      rejection_readonly_snapshot: buildReadOnlyFieldSnapshot(doc),
      poc_updated_sections: undefined,
      poc_updated_fields: undefined,
      kmtRejectDate: today,
      reviewAuditTrail: [
        ...trail,
        {
          at: new Date().toISOString(),
          role: 'KMT',
          reviewer: viewerName,
          action: 'reject',
          comment,
          feedbackItems,
          highlightSections,
          highlightFields,
        },
      ],
      tabs: Array.from(new Set([...(doc.tabs || []), 'rejected-tasks', 'all'])),
    })
    setRejectPicks([])
    navigate('/kmt/document-review/ceui/rejected')
  }

  const saveKmtEditorialNote = () => {
    updateDoc(doc.id, { kmtEditorialNote: kmtNote.trim() })
  }

  const saveKmtBasicDetails = () => {
    const restAreas = (doc.areas || []).slice(1)
    const first = {
      ...(doc.areas?.[0] || {}),
      name: basicSaName.trim() || doc.areas?.[0]?.name || 'Service area',
      id: basicSaId.trim() || String(doc.areas?.[0]?.id || ''),
      type: basicSaType.trim() || doc.areas?.[0]?.type || 'Resi Trash',
    }
    updateDoc(doc.id, {
      sub: basicSub.trim() || doc.sub,
      area: basicArea.trim() || doc.area,
      market: basicMarket.trim() || doc.market,
      lob: basicLob.trim() || doc.lob,
      areas: [first, ...restAreas],
    })
  }

  const saveKmtDocumentForm = () => {
    updateDoc(doc.id, { form: ensureFivePocTabs(docForm) })
  }

  return (
    <Layout>
      <div className="bufm-doc-view">
        <div className="bufm-doc-view__inner">
          <div className="bufm-doc-view__sticky">
            <header className="bufm-doc-view__header">
              <button type="button" className="back-btn bufm-doc-view__back" onClick={() => navigate(-1)} aria-label="Back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="bufm-doc-view__header-main">
                <div className="bufm-doc-view__title-row">
                  <h1 className="bufm-doc-view__title">
                    {kmtEdit ? (basicSub.trim() || doc.sub || doc.id) : (doc.sub || doc.id)}
                  </h1>
                  <VersionBadge doc={doc} />
                </div>
                <p className="bufm-doc-view__subline">
                  {doc.id} ·{' '}
                  {kmtEdit ? (basicLob || doc.lob || doc.market || '—') : (doc.lob || doc.market || '—')} ·{' '}
                  {kmtEdit ? (basicMarket || doc.market || '—') : (doc.market || '—')}
                </p>
                {showBufmApprovedLine && (
                  <p className="bufm-doc-view__bufm-ok">Approved by BUFM ✔</p>
                )}
                <div className="bufm-doc-view__version-links">
                  <button
                    type="button"
                    className="btn btn-text btn-sm"
                    disabled={!previousVersionDocId}
                    title={
                      previousVersionDocId
                        ? 'Open the earlier submission from the same creator (demo catalog).'
                        : 'No earlier version is linked for this document in the demo.'
                    }
                    onClick={() => previousVersionDocId && openDocumentDetail(previousVersionDocId)}
                  >
                    {getPreviousVersionLinkLabel(doc)}
                  </button>
                  <button type="button" className="btn btn-text btn-sm" onClick={() => setHistoryOpen(true)}>
                    View Version History
                  </button>
                </div>
                <p className="bufm-doc-view__case-line">
                  Case status: <strong>{getCaseStageDisplay(doc)}</strong>
                </p>
                <div className="bufm-doc-view__header-meta">
                  <span>{serviceAreaLabel}</span>
                  <span className="bufm-doc-view__dot">·</span>
                  <span>Market: {kmtEdit ? (basicMarket || doc.market || '—') : (doc.market || '—')}</span>
                  <span className="bufm-doc-view__dot">·</span>
                  <span>LOB: {kmtEdit ? (basicLob || doc.lob || '—') : (doc.lob || '—')}</span>
                  <span className="bufm-doc-view__dot">·</span>
                  <span className={`bufm-status bufm-status--${disp?.statusClass || 'draft'}`}>
                    {headerStatusLabel}
                  </span>
                  {showKmtRejectReason && (
                    <span className="bufm-comment-indicator bufm-comment-indicator--header" title={doc.rejection_comment_KMT} aria-label="Rejection reason">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </span>
                  )}
                  <span className="bufm-doc-view__dot">·</span>
                  <span className="bufm-doc-view__review-version">Reviewing {inferDocVersion(doc)}</span>
                </div>
              </div>
              {showReviewActions && rejectPicks.length > 0 && (
                <div className="reviewer-pick-hint" role="status">
                  <strong>{rejectPicks.length}</strong> item{rejectPicks.length === 1 ? '' : 's'} flagged on the document — click <strong>Reject</strong> to add comments for each row and return to the POC.
                </div>
              )}
              {showReviewActions && (
                <div className="bufm-doc-view__header-actions">
                  <button type="button" className="btn btn-primary" onClick={handleApprove}>
                    Publish
                  </button>
                  <button type="button" className="btn btn-outline bufm-doc-view__reject" onClick={() => setRejectOpen(true)}>
                    Reject
                  </button>
                </div>
              )}
              {showReviewActions && (doc.pocResubmissionNote || lastKmtReject) && (
                <div className="bufm-doc-view__resubmit-context" style={{ marginTop: 12 }}>
                  {doc.pocResubmissionNote && (
                    <div className="rsa-poc-resubmit-note" role="status">
                      <strong>POC resubmission note</strong>
                      {doc.pocResubmissionNote}
                    </div>
                  )}
                  {lastKmtReject && (lastKmtReject.feedbackItems?.length > 0 || lastKmtReject.comment) && (
                    <div className="rsa-reviewer-verify" role="region" aria-label="Previous rejection feedback">
                      <strong>Verify prior feedback</strong>
                      {lastKmtReject.comment && <p style={{ margin: '0 0 8px' }}>{lastKmtReject.comment}</p>}
                      {lastKmtReject.feedbackItems?.length > 0 && (
                        <ul>
                          {lastKmtReject.feedbackItems.map((it, i) => (
                            <li key={it.id || i}>
                              <strong>{it.label}</strong>
                              {it.comment ? ` — ${it.comment}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </header>

            <section className="bufm-doc-view__poc-card">
              <h2 className="bufm-doc-view__section-title">POC details</h2>
              <div className="bufm-poc-grid">
                <div className="bufm-poc-grid__cell">
                  <span className="bufm-poc-grid__label">POC name</span>
                  <p className="bufm-poc-grid__value">{doc.pocName || '—'}</p>
                </div>
                <div className="bufm-poc-grid__cell bufm-poc-grid__cell--email">
                  <span className="bufm-poc-grid__label">Email</span>
                  <p className="bufm-poc-grid__value">{doc.pocEmail || '—'}</p>
                </div>
                <div className="bufm-poc-grid__cell">
                  <span className="bufm-poc-grid__label">Region</span>
                  <p className="bufm-poc-grid__value">{doc.pocRegion || '—'}</p>
                </div>
                <div className="bufm-poc-grid__cell">
                  <span className="bufm-poc-grid__label">Total documents created</span>
                  <p className="bufm-poc-grid__value">{totalByUser}</p>
                </div>
              </div>
            </section>
          </div>

          {!kmtEdit &&
            showReviewActions &&
            (doc.poc_updated_sections?.length > 0 ||
              doc.poc_updated_fields?.length > 0 ||
              doc.pocResubmissionNote?.trim?.()) && (
              <PocUpdateSummaryBanner
                sections={doc.poc_updated_sections || []}
                fields={doc.poc_updated_fields || []}
                resubmissionNote={doc.pocResubmissionNote}
              />
            )}

          {!kmtEdit && (
            <div className="bufm-doc-view__stepper-bar">
              <nav className="bufm-stepper bufm-stepper--doc-view" aria-label="Document steps">
                {STEPPER_STEPS.map(s => {
                  const tabRev = isReviewerHighlightingWholeStep(s.n, reviewerSets.sections)
                  const tabPoc =
                    isReviewerHighlightingWholeStep(s.n, pocSets.sections) || pocStepsWithUpdates.has(s.n)
                  return (
                    <button
                      key={s.n}
                      type="button"
                      className={`bufm-stepper__tab${activeStep === s.n ? ' bufm-stepper__tab--active' : ''}${tabRev ? ' bufm-stepper__tab--reviewer-flag' : ''}${tabPoc ? ' bufm-stepper__tab--poc-update' : ''}`}
                      onClick={() => setActiveStep(s.n)}
                    >
                      <span className="bufm-stepper__num">{s.n}</span>
                      <span className="bufm-stepper__label">{s.short}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          )}

          <div className="bufm-doc-view__scroll">
            {kmtEdit && (
              <div className="kmt-doc-view__kmt-edit-banner" role="status">
                KMT edit mode — header and POC details above; update catalog fields in the form builder below. Use <strong>Publish</strong> or <strong>Reject</strong> in the header when this document is pending KMT.
              </div>
            )}

            {!kmtEdit && (
              <>
                <section className="bufm-doc-view__step-content">
                  <h2
                    className={`bufm-doc-view__step-heading${wholeStepReviewer ? ' bufm-doc-view__step-heading--reviewer-flag' : ''}${
                      wholeStepPoc ? ' bufm-doc-view__step-heading--poc-update' : ''
                    }`}
                  >
                    {heading.title}
                  </h2>
                  <p className="bufm-doc-view__step-sub">{heading.subtitle}</p>
                  <div className="bufm-doc-view__accordions">
                    {sections.map((sec, i) => (
                      <ReadOnlyFieldsAccordion
                        key={`${activeStep}-${i}-${sec.title}`}
                        title={sec.title}
                        badge={sec.badge}
                        fields={sec.fields || []}
                        sectionFlagged={wholeStepReviewer || isSectionFlagged(sec.title, reviewerSets.sections)}
                        pocSectionFlagged={wholeStepPoc || isSectionFlagged(sec.title, pocSets.sections)}
                        fieldFlags={label => isFieldFlagged(label, reviewerSets.fields)}
                        pocFieldFlags={label => isFieldFlagged(label, pocSets.fields)}
                        flagPickerMode={showReviewActions}
                        sectionPickActive={isRejectPick('section', sec.title)}
                        onFlagSection={() => toggleRejectPick('section', sec.title)}
                        onFlagField={fld => toggleRejectPick('field', fld)}
                        fieldPickActive={lbl => isRejectPick('field', lbl)}
                      />
                    ))}
                  </div>
                </section>

                <footer className="bufm-doc-view__footer">
                  <div className="bufm-doc-view__footer-nav">
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={activeStep <= 1}
                      onClick={() => setActiveStep(s => Math.max(1, s - 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={activeStep >= 5}
                      onClick={() => setActiveStep(s => Math.min(5, s + 1))}
                    >
                      Next
                    </button>
                  </div>
                </footer>
              </>
            )}

            {kmtEdit && (
              <>
                <section className="kmt-template-editor__section kmt-doc-kmt-edit__section">
                  <div className="kmt-template-editor__section-head">
                    <h2 className="kmt-template-editor__section-title">Basic information</h2>
                    <p className="kmt-template-editor__section-sub">
                      Document title, geography, market, LOB, and primary service area. Saved separately from the form builder below.
                    </p>
                  </div>
                  <div className="kmt-template-editor__fields kmt-wizard__fields">
                    <label className="kmt-field">
                      <span>Document title</span>
                      <input className="kmt-input" value={basicSub} onChange={e => setBasicSub(e.target.value)} />
                    </label>
                    <label className="kmt-field">
                      <span>Primary geography / area label</span>
                      <input className="kmt-input" value={basicArea} onChange={e => setBasicArea(e.target.value)} />
                    </label>
                    <label className="kmt-field">
                      <span>Market type</span>
                      <input className="kmt-input" value={basicMarket} onChange={e => setBasicMarket(e.target.value)} />
                    </label>
                    <label className="kmt-field">
                      <span>Line of business</span>
                      <input className="kmt-input" value={basicLob} onChange={e => setBasicLob(e.target.value)} />
                    </label>
                    <label className="kmt-field">
                      <span>Service area name</span>
                      <input className="kmt-input" value={basicSaName} onChange={e => setBasicSaName(e.target.value)} />
                    </label>
                    <label className="kmt-field">
                      <span>Service area ID</span>
                      <input className="kmt-input" value={basicSaId} onChange={e => setBasicSaId(e.target.value)} />
                    </label>
                    <label className="kmt-field">
                      <span>Service area type</span>
                      <input className="kmt-input" value={basicSaType} onChange={e => setBasicSaType(e.target.value)} />
                    </label>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={saveKmtBasicDetails}>
                    Save basic information
                  </button>
                </section>

                <section className="kmt-template-editor__section kmt-doc-kmt-edit__section kmt-doc-kmt-edit__section--form">
                  <div className="kmt-template-editor__section-head">
                    <h2 className="kmt-template-editor__section-title">Document form builder</h2>
                    <p className="kmt-template-editor__section-sub">
                      Edit tabs, groups, and fields only — same builder as template create, without repeating basic information above.
                    </p>
                  </div>
                  <div className="kmt-template-editor__form-shell kmt-doc-kmt-edit__form-shell">
                    <KmtFormBuilder embedded controlledForm={docForm} setControlledForm={setDocForm} />
                  </div>
                  <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={saveKmtDocumentForm}>
                    Save form structure
                  </button>
                </section>
              </>
            )}

            {kmtEdit && (
              <section className="bufm-doc-view__pulse-wrap kmt-doc-kmt-edit__notes">
                <h2 className="bufm-doc-view__section-title">KMT internal notes</h2>
                <p className="kmt-template-editor__section-sub" style={{ marginBottom: 10 }}>
                  Visible to KMT reviewers in this prototype (stored on the document mock).
                </p>
                <textarea
                  className="kmt-input"
                  rows={4}
                  value={kmtNote}
                  onChange={e => setKmtNote(e.target.value)}
                  placeholder="Add coordination notes, catalog instructions, or follow-ups…"
                  style={{ width: '100%', maxWidth: 720, resize: 'vertical' }}
                />
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={saveKmtEditorialNote}>
                    Save notes
                  </button>
                </div>
              </section>
            )}

            <section className="bufm-doc-view__pulse-wrap">
              <DocumentPulseComments
                documentId={doc.id}
                getDocumentById={getDocumentById}
                updateDoc={updateDoc}
                viewerName={viewerName}
                revision={pulseRevision}
                allowAddComment
              />
            </section>
          </div>
        </div>

        <RejectModal
          open={rejectOpen}
          title="Reject document"
          roleLabel="KMT"
          variant="ceui"
          enableAuditTrail
          initialFeedbackRows={rejectPicks}
          onClose={() => setRejectOpen(false)}
          onConfirm={handleRejectConfirm}
        />

        <VersionHistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          doc={doc}
          viewerRole="KMT"
          allDocs={docs}
          onNavigateToDocument={openDocumentDetail}
        />
      </div>
    </Layout>
  )
}

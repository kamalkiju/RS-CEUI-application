import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import Layout from '../../components/Layout.jsx'
import { useDocs } from '../../context/DocContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getDisplayStatus } from '../../utils/documentStatus.js'
import {
  buildReadOnlyFieldSnapshot,
  getReadOnlyStepHeading,
  getReadOnlyStepSections,
} from '../poc/DocumentEditor/documentWizardReadOnlyModel.js'
import ReadOnlyFieldsAccordion from '../../components/ReadOnlyFieldsAccordion.jsx'
import DocumentPulseComments from '../../components/DocumentPulseComments.jsx'
import RejectModal from '../../components/RejectModal.jsx'
import VersionBadge from '../../components/VersionBadge.jsx'
import VersionHistoryDrawer from '../../components/VersionHistoryDrawer.jsx'
import PocUpdateSummaryBanner from '../../components/PocUpdateSummaryBanner.jsx'
import { getCaseStageDisplay, getPreviousVersionLinkLabel, inferDocVersion } from '../../utils/documentVersion.js'
import {
  buildPocUpdateFlagSets,
  buildReviewerFlagSets,
  isFieldFlagged,
  isReviewerHighlightingWholeStep,
  isSectionFlagged,
  lastRejectTrailEntry,
} from '../../utils/reviewFeedback.js'

const STEPPER_STEPS = [
  { n: 1, short: 'Knowledge Area' },
  { n: 2, short: 'Service Categories' },
  { n: 3, short: 'Offerings' },
  { n: 4, short: 'Extra Pickup' },
  { n: 5, short: 'Fees' },
]

export default function BufmDocumentView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getDocumentById, updateDoc } = useDocs()
  const doc = id ? getDocumentById(id) : null

  const [activeStep, setActiveStep] = useState(1)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const disp = useMemo(() => (doc ? getDisplayStatus(doc, 'BUFM') : null), [doc])
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
  const lastBufmReject = useMemo(
    () => lastRejectTrailEntry(doc?.reviewAuditTrail, 'BUFM'),
    [doc?.reviewAuditTrail],
  )

  const showReviewActions = doc?.status === 'Pending_BUFM'

  const pulseRevision = doc
    ? `${doc.updated}|${(doc.pulseComments || []).length}`
    : '0'

  if (!doc) {
    return (
      <Layout>
        <div className="bufm-doc-view bufm-doc-view--missing">
          <p>Document not found.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/bufm/document-review/ceui/review')}>
            Back to review queue
          </button>
        </div>
      </Layout>
    )
  }

  const serviceAreaLabel = doc.area || doc.areas?.[0]?.name || '—'
  const viewerName = user?.name || 'BUFM Reviewer'

  const handleApprove = () => {
    const today = new Date().toISOString().slice(0, 10)
    updateDoc(doc.id, {
      status: 'Pending_KMT',
      approved_by_BUFM: true,
      bufmApproveDate: today,
      poc_updated_sections: undefined,
      poc_updated_fields: undefined,
      pocResubmissionNote: undefined,
      tabs: Array.from(new Set([...(doc.tabs || []), 'approval', 'all'])),
    })
    navigate('/bufm/document-review/ceui/review')
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
      status: 'Rejected_BUFM',
      rejection_comment_BUFM: comment,
      rejection_highlight_sections: highlightSections,
      rejection_highlight_fields: highlightFields,
      rejection_feedback_items: feedbackItems,
      rejection_readonly_snapshot: buildReadOnlyFieldSnapshot(doc),
      poc_updated_sections: undefined,
      poc_updated_fields: undefined,
      bufmRejectDate: today,
      reviewAuditTrail: [
        ...trail,
        {
          at: new Date().toISOString(),
          role: 'BUFM',
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
    navigate('/bufm/document-review/ceui/rejected')
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
                  <h1 className="bufm-doc-view__title">{doc.sub || doc.id}</h1>
                  <VersionBadge doc={doc} />
                </div>
                <div className="bufm-doc-view__version-links">
                  <button type="button" className="btn btn-text btn-sm" onClick={() => window.alert('Mock: open previous version (no backend).')}>
                    {getPreviousVersionLinkLabel(doc)}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => window.alert('Mock compare: diff vs previous version (UI only).')}>
                    Compare with Previous Version
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
                  <span>Market: {doc.market || '—'}</span>
                  <span className="bufm-doc-view__dot">·</span>
                  <span className={`bufm-status bufm-status--${disp?.statusClass || 'draft'}`}>{disp?.label}</span>
                  <span className="bufm-doc-view__dot">·</span>
                  <span className="bufm-doc-view__review-version">Reviewing {inferDocVersion(doc)}</span>
                </div>
              </div>
              {showReviewActions && (
                <div className="bufm-doc-view__header-actions">
                  <button type="button" className="btn btn-primary" onClick={handleApprove}>
                    Approve
                  </button>
                  <button type="button" className="btn btn-outline bufm-doc-view__reject" onClick={() => setRejectOpen(true)}>
                    Reject
                  </button>
                </div>
              )}
              {showReviewActions && (doc.pocResubmissionNote || lastBufmReject) && (
                <div className="bufm-doc-view__resubmit-context" style={{ marginTop: 12 }}>
                  {doc.pocResubmissionNote && (
                    <div className="rsa-poc-resubmit-note" role="status">
                      <strong>POC resubmission note</strong>
                      {doc.pocResubmissionNote}
                    </div>
                  )}
                  {lastBufmReject && (lastBufmReject.feedbackItems?.length > 0 || lastBufmReject.comment) && (
                    <div className="rsa-reviewer-verify" role="region" aria-label="Previous rejection feedback">
                      <strong>Verify prior feedback</strong>
                      {lastBufmReject.comment && <p style={{ margin: '0 0 8px' }}>{lastBufmReject.comment}</p>}
                      {lastBufmReject.feedbackItems?.length > 0 && (
                        <ul>
                          {lastBufmReject.feedbackItems.map((it, i) => (
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
          </div>

          {showReviewActions && (doc.poc_updated_sections?.length > 0 || doc.poc_updated_fields?.length > 0) && (
            <PocUpdateSummaryBanner sections={doc.poc_updated_sections || []} fields={doc.poc_updated_fields || []} />
          )}

          <div className="bufm-doc-view__stepper-bar">
            <nav className="bufm-stepper bufm-stepper--doc-view" aria-label="Document steps">
              {STEPPER_STEPS.map(s => {
                const tabRev = isReviewerHighlightingWholeStep(s.n, reviewerSets.sections)
                const tabPoc = isReviewerHighlightingWholeStep(s.n, pocSets.sections)
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

          <div className="bufm-doc-view__scroll">
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
          roleLabel="BUFM"
          enableAuditTrail
          onClose={() => setRejectOpen(false)}
          onConfirm={handleRejectConfirm}
        />

        <VersionHistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          doc={doc}
          viewerRole="BUFM"
        />
      </div>
    </Layout>
  )
}

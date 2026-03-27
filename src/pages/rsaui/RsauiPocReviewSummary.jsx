import { useOutletContext, useNavigate } from 'react-router-dom'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import RsaSubmissionDetailView from '../../components/rsa/RsaSubmissionDetailView.jsx'

export default function RsauiPocReviewSummary() {
  const {
    submissionId,
    readOnly,
    tabSuffix,
    isEditDetailsFlow = false,
    wizardBase = '/rsaui/poc/create',
    kmtFinalizeMode = false,
  } = useOutletContext()
  const navigate = useNavigate()
  const { getSubmission } = useRsaUI()
  const { user } = useAuth()
  const sub = submissionId ? getSubmission(submissionId) : null
  const rm = sub?.requestMeta || {}

  if (!submissionId || !sub) {
    return <p className="rsa-ui-hint">Preparing submission…</p>
  }

  return (
    <div className="rsa-poc-review-shell">
      <div className="rsa-poc-review-hero">
        <h2 className="rsa-ui-panel__title">
          3 · Review summary{isEditDetailsFlow ? ' — edit details' : ''}
        </h2>
        <p className="rsa-ui-panel__sub">
          {kmtFinalizeMode
            ? 'Confirm task, requestor, service area, and offerings before publishing.'
            : 'Confirm task, requestor, service area, and offerings before entering requester details and submitting.'}
        </p>
      </div>
      <div className="rsa-poc-review-card">
        <RsaSubmissionDetailView
          submission={sub}
          creatorName={user?.name || rm.requestorName || '—'}
          creatorEmail={user?.email || rm.requestorEmail || '—'}
          unifiedPanel
          unifiedEmbedded
        />
      </div>

      {!readOnly && (
        <div className="rsa-poc-review-actions">
          <button type="button" className="btn btn-outline rsa-poc-review-actions__back" onClick={() => navigate(`${wizardBase}/configure${tabSuffix}`)}>
            ← Back
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(`${wizardBase}/configure${tabSuffix}`)}>
            {isEditDetailsFlow ? 'Edit details' : 'Edit draft'}
          </button>
          <button type="button" className="btn btn-primary rsa-poc-review-actions__next" onClick={() => navigate(`${wizardBase}/submit${tabSuffix}`)}>
            {kmtFinalizeMode ? 'Continue to publish →' : 'Continue to submit →'}
          </button>
        </div>
      )}
    </div>
  )
}

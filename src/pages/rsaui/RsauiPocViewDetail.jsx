import { useState } from 'react'
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'
import RsaSubmissionDetailView from '../../components/rsa/RsaSubmissionDetailView.jsx'
import RsaDocumentFullscreenModal from '../../components/rsa/RsaDocumentFullscreenModal.jsx'

const BASE = '/rsaui/poc/create'

export default function RsauiPocViewDetail() {
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const outlet = useOutletContext()
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const submissionId = outlet?.submissionId ?? sp.get('submission') ?? ''
  const { user } = useAuth()
  const { getSubmission, cloneSubmission, submitToBufm } = useRsaUI()
  const sub = submissionId ? getSubmission(submissionId) : null
  const from = sp.get('from') || ''

  const backUrl = from ? `/rsaui/poc/document-review?tab=${encodeURIComponent(from)}` : '/rsaui/poc/document-review'

  if (!submissionId || !sub) {
    return (
      <div className="rsa-poc-view-detail rsa-poc-view-detail--empty">
        <p className="rsa-ui-hint">Request not found.</p>
        <button type="button" className="btn btn-outline" onClick={() => navigate(backUrl)}>
          Back to document review
        </button>
      </div>
    )
  }

  const rm = sub.requestMeta || {}
  const isPending =
    sub.status === RSA_STATUS.Pending_BUFM || sub.status === RSA_STATUS.Pending_KMT
  const isRejected = sub.status === RSA_STATUS.Rejected_BUFM || sub.status === RSA_STATUS.Rejected_KMT
  const isPublished = sub.status === RSA_STATUS.Published
  const isDraft = sub.status === RSA_STATUS.Draft

  const goEdit = (step = 'select') => {
    const q = new URLSearchParams({ submission: submissionId, mode: 'edit' })
    if (from) q.set('from', from)
    navigate(`${BASE}/${step}?${q.toString()}`)
  }

  const doClone = () => {
    const newId = cloneSubmission(sub.id)
    if (newId) {
      navigate(`${BASE}/view?submission=${encodeURIComponent(newId)}&mode=view&from=draft`)
    }
  }

  const isExpiryQueueDoc = () => {
    const exp = sub.serviceArea?.expiryDate
    if (!exp || sub.status !== RSA_STATUS.Published) return false
    const diff = Math.ceil((new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff <= 30
  }

  const expiryContext = from === 'expiry' || (from === 'all' && isExpiryQueueDoc())

  const doSendForApproval = async () => {
    if (!window.confirm('Send this request for BUFM approval?')) return
    await submitToBufm(sub.id, {
      serviceArea: sub.serviceArea,
      pricing: sub.pricing,
      product: sub.product,
      productTabs: sub.productTabs,
      requestMeta: sub.requestMeta,
      pocName: sub.pocName || rm.requestorName,
      assignedBufmReviewer: sub.assignedBufmReviewer || rm.assignedBUFM || 'Jane Wilson',
    })
    window.alert('✓ Sent for approval')
    navigate('/rsaui/poc/document-review?tab=awaiting')
  }

  const detailProps = {
    submission: sub,
    creatorName: user?.name || sub.pocName || rm.requestorName || '—',
    creatorEmail: user?.email || rm.requestorEmail || '—',
    unifiedPanel: true,
    rejectionNote:
      isRejected ? sub.rejection_comment_BUFM || sub.rejection_comment_KMT || undefined : undefined,
    rejectionTitle: sub.status === RSA_STATUS.Rejected_KMT ? 'KMT rejection' : 'BUFM rejection',
  }

  return (
    <div className="rsa-poc-view-detail rsa-poc-view-read-shell">
      <div className="rsa-read-surface rsa-read-surface--poc">
        <RsaSubmissionDetailView {...detailProps} />

        <footer className="rsa-read-surface__footer">
          <button type="button" className="btn btn-outline" onClick={() => navigate(backUrl)}>
            Back to document review
          </button>

          <div className="rsa-read-surface__footer-right">
          <button type="button" className="btn btn-outline" onClick={() => setFullscreenOpen(true)}>
            Full screen
          </button>
          {/* Awaiting approval: view + clone only */}
          {isPending && (
            <>
              <button type="button" className="btn btn-outline" onClick={doClone}>
                Clone as new draft
              </button>
            </>
          )}

          {/* Draft / rejected: edit + clone */}
          {(isDraft || isRejected) && (
            <>
              <button type="button" className="btn btn-outline" onClick={doClone}>
                Clone
              </button>
              <button type="button" className="btn btn-primary" onClick={() => goEdit('select')}>
                Edit details
              </button>
            </>
          )}

          {/* Approved (not opened as expiry-only flow): edit, send for approval, clone */}
          {isPublished && !expiryContext && (
            <>
              <button type="button" className="btn btn-outline" onClick={doClone}>
                Clone
              </button>
              <button type="button" className="btn btn-outline" onClick={() => goEdit('select')}>
                Edit details
              </button>
              <button type="button" className="btn btn-primary" onClick={doSendForApproval}>
                Send for approval
              </button>
            </>
          )}

          {/* Expiry queue: update offerings, update details, send for review, clone */}
          {isPublished && expiryContext && (
            <>
              <button type="button" className="btn btn-outline" onClick={doClone}>
                Clone
              </button>
              <button type="button" className="btn btn-outline" onClick={() => goEdit('configure')}>
                Update offerings
              </button>
              <button type="button" className="btn btn-outline" onClick={() => goEdit('select')}>
                Update details
              </button>
              <button type="button" className="btn btn-primary" onClick={doSendForApproval}>
                Send for review
              </button>
            </>
          )}
          </div>
        </footer>
      </div>

      <RsaDocumentFullscreenModal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        title="View details"
        subtitle={`${sub.id} · ${sub.status?.replace(/_/g, ' ') || '—'}`}
      >
        <div className="rsa-read-surface rsa-read-surface--poc">
          <RsaSubmissionDetailView {...detailProps} />
        </div>
      </RsaDocumentFullscreenModal>
    </div>
  )
}

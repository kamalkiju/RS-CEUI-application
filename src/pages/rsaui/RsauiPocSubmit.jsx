import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const BUFM_APPROVERS = ['Jane Wilson', 'Robert Chen', 'Maria Wilson']

const REASONS = ['New Service Area', 'Expansion', 'Regulatory Change', 'Contract Addition']

const POC_BASE = '/poc/service-area'

function KmtWizardFinalize({ submissionId, sub, tabSuffix, wizardBase, kmtReturnPath }) {
  const navigate = useNavigate()
  const { getSubmission, patchSubmission, approveKMT } = useRsaUI()
  const [saving, setSaving] = useState(false)
  const rm = sub.requestMeta || {}
  const [kmtNote, setKmtNote] = useState(rm.kmtPublishNote || '')

  const isPendingKmt = sub.status === RSA_STATUS.Pending_KMT
  const isPublished = sub.status === RSA_STATUS.Published

  const persistNote = () => {
    const cur = getSubmission(submissionId)
    if (!cur) return
    patchSubmission(submissionId, {
      requestMeta: { ...(cur.requestMeta || {}), kmtPublishNote: kmtNote },
    })
  }

  const doPublish = () => {
    if (!window.confirm('Publish this service area? It will go live immediately.')) return
    setSaving(true)
    try {
      persistNote()
      approveKMT(submissionId)
      window.alert('✓ Published successfully')
      navigate('/kmt/document-review/approved')
    } finally {
      setSaving(false)
    }
  }

  const doSavePublished = () => {
    setSaving(true)
    try {
      const cur = getSubmission(submissionId)
      if (!cur) return
      patchSubmission(submissionId, {
        serviceArea: { ...cur.serviceArea },
        pricing: { ...cur.pricing },
        product: { ...cur.product },
        productTabs: cur.productTabs,
        replaceProductTabs: true,
        requestMeta: { ...(cur.requestMeta || {}), kmtPublishNote: kmtNote },
      })
      window.alert('✓ Changes saved')
      navigate(kmtReturnPath || '/kmt/document-review/approved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rsa-poc-submit-shell">
      <div className="rsa-poc-submit-hero">
        <h2 className="rsa-ui-panel__title">4 · Review &amp; publish (KMT)</h2>
        <p className="rsa-ui-panel__sub">
          {isPendingKmt
            ? 'Confirm details below, then publish — no BUFM routing from this step.'
            : 'Save updates to this published service area request.'}
        </p>
        <div className="rsa-state-flow rsa-state-flow--inline" aria-label="State flow">
          {isPendingKmt ? 'Pending KMT → Published (live)' : 'Published — metadata & offerings update'}
        </div>
      </div>

      <div className="rsa-poc-submit-card">
        <h3 className="rsa-poc-submit-card__title">KMT notes (optional)</h3>
        <label className="rsa-poc-field rsa-poc-field--full">
          <span>Internal note</span>
          <textarea rows={3} value={kmtNote} onChange={e => setKmtNote(e.target.value)} placeholder="Optional context recorded on the submission" />
        </label>
      </div>

      <div className="rsa-poc-submit-actions">
        <button type="button" className="btn btn-outline" disabled={saving} onClick={() => navigate(`${wizardBase}/review${tabSuffix}`)}>
          ← Back
        </button>
        {isPendingKmt && (
          <button type="button" className="btn btn-primary btn-lg" disabled={saving} onClick={doPublish}>
            Publish
          </button>
        )}
        {isPublished && (
          <button type="button" className="btn btn-primary btn-lg" disabled={saving} onClick={doSavePublished}>
            Save updates
          </button>
        )}
      </div>
    </div>
  )
}

export default function RsauiPocSubmit() {
  const {
    submissionId,
    readOnly,
    tabSuffix,
    isEditDetailsFlow = false,
    wizardBase = POC_BASE,
    kmtFinalizeMode = false,
    kmtReturnPath,
  } = useOutletContext()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getSubmission, patchSubmission, submitToBufm } = useRsaUI()
  const sub = submissionId ? getSubmission(submissionId) : null
  const rm = sub?.requestMeta || {}

  const [requestorName, setRequestorName] = useState(rm.requestorName || user?.name || '')
  const [requestorEmail, setRequestorEmail] = useState(rm.requestorEmail || user?.email || '')
  const [onBehalfOf, setOnBehalfOf] = useState(rm.onBehalfOf || '')
  const [reasonForRequest, setReasonForRequest] = useState(rm.reasonForRequest || '')
  const [comments, setComments] = useState(rm.comments || '')
  const [assignedBUFM, setAssignedBUFM] = useState(rm.assignedBUFM || '')
  const [approvalComments, setApprovalComments] = useState(rm.approvalComments || '')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    setRequestorName(prev => prev || user.name || '')
    setRequestorEmail(prev => prev || user.email || '')
  }, [user])

  const persistMeta = () => {
    patchSubmission(submissionId, {
      requestMeta: {
        ...rm,
        requestorName,
        requestorEmail,
        onBehalfOf,
        reasonForRequest,
        comments,
        assignedBUFM,
        approvalComments,
      },
    })
  }

  const openSubmit = () => {
    if (!assignedBUFM) {
      window.alert('Please select a BUFM Approver')
      return
    }
    if (!reasonForRequest) {
      window.alert('Please select a reason for request')
      return
    }
    setConfirmOpen(true)
  }

  const doSubmit = async () => {
    if (!submissionId || !sub) return
    setSaving(true)
    try {
      persistMeta()
      const current = getSubmission(submissionId)
      await submitToBufm(submissionId, {
        serviceArea: current.serviceArea,
        pricing: current.pricing,
        product: current.product,
        productTabs: current.productTabs,
        requestMeta: {
          ...(current.requestMeta || {}),
          requestorName,
          requestorEmail,
          onBehalfOf,
          reasonForRequest,
          comments,
          assignedBUFM,
          approvalComments,
        },
        pocName: requestorName,
        assignedBufmReviewer: assignedBUFM,
      })
      setConfirmOpen(false)
      window.alert('✓ Request submitted successfully')
      navigate('/poc/document-review?tab=awaiting')
    } finally {
      setSaving(false)
    }
  }

  if (!submissionId || !sub) {
    return <p className="rsa-ui-hint">Preparing submission…</p>
  }

  if (kmtFinalizeMode) {
    return (
      <KmtWizardFinalize
        submissionId={submissionId}
        sub={sub}
        tabSuffix={tabSuffix}
        wizardBase={wizardBase}
        kmtReturnPath={kmtReturnPath}
      />
    )
  }

  if (readOnly) {
    return (
      <div className="rsa-poc-submit-shell">
        <p>This submission is not editable in this state.</p>
        <button type="button" className="btn btn-outline" onClick={() => navigate(`${wizardBase}/review${tabSuffix}`)}>
          Back to review
        </button>
      </div>
    )
  }

  return (
    <div className="rsa-poc-submit-shell">
      <div className="rsa-poc-submit-hero">
        <h2 className="rsa-ui-panel__title">
          4 · Requester &amp; submit{isEditDetailsFlow ? ' — edit details' : ''}
        </h2>
        <p className="rsa-ui-panel__sub">Complete requester information and BUFM routing, then submit for approval.</p>
        <div className="rsa-state-flow rsa-state-flow--inline" aria-label="State flow">
          Draft → Submitted → Pending BUFM Review
        </div>
      </div>

      <div className="rsa-poc-submit-card">
        <h3 className="rsa-poc-submit-card__title">Requester</h3>
        <div className="rsa-poc-submit-grid">
          <label className="rsa-poc-field">
            <span>Requester name *</span>
            <input value={requestorName} onChange={e => setRequestorName(e.target.value)} />
          </label>
          <label className="rsa-poc-field">
            <span>Requester email *</span>
            <input type="email" value={requestorEmail} onChange={e => setRequestorEmail(e.target.value)} />
          </label>
          <label className="rsa-poc-field rsa-poc-field--full">
            <span>On behalf of</span>
            <input value={onBehalfOf} onChange={e => setOnBehalfOf(e.target.value)} placeholder="Optional" />
          </label>
          <label className="rsa-poc-field rsa-poc-field--full">
            <span>Reason for request *</span>
            <select value={reasonForRequest} onChange={e => setReasonForRequest(e.target.value)}>
              <option value="">— Select —</option>
              {REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="rsa-poc-field rsa-poc-field--full">
            <span>Comments</span>
            <textarea rows={3} value={comments} onChange={e => setComments(e.target.value)} placeholder="Optional context for reviewers" />
          </label>
        </div>
      </div>

      <div className="rsa-poc-submit-card rsa-poc-submit-card--bufm">
        <h3 className="rsa-poc-submit-card__title">BUFM review</h3>
        <p className="rsa-poc-submit-card__hint">Select who will review this request.</p>
        <div className="rsa-poc-submit-grid">
          <label className="rsa-poc-field rsa-poc-field--full">
            <span>Select BUFM approver *</span>
            <select value={assignedBUFM} onChange={e => setAssignedBUFM(e.target.value)}>
              <option value="">— Select approver —</option>
              {BUFM_APPROVERS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="rsa-poc-field rsa-poc-field--full">
            <span>Approval comments (optional)</span>
            <textarea rows={2} value={approvalComments} onChange={e => setApprovalComments(e.target.value)} placeholder="Notes for the approver" />
          </label>
        </div>
      </div>

      <div className="rsa-poc-submit-actions">
        <button type="button" className="btn btn-outline" disabled={saving} onClick={() => navigate(`${wizardBase}/review${tabSuffix}`)}>
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={saving}
          onClick={() => {
            persistMeta()
            window.alert('✓ Draft saved successfully')
          }}
        >
          Save draft
        </button>
        <button type="button" className="btn btn-primary btn-lg" disabled={saving || !assignedBUFM || !reasonForRequest} onClick={openSubmit}>
          Submit for approval
        </button>
      </div>

      {confirmOpen && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true">
          <div className="rsa-modal-card">
            <div className="rsa-modal-card__head">Submit Request for Approval?</div>
            <div className="rsa-modal-card__body">
              <p>
                &quot;{sub.serviceArea?.name || 'This service area'}&quot; will be sent to {assignedBUFM} for BUFM review.
              </p>
              <p>You will be notified of the decision.</p>
            </div>
            <div className="rsa-modal-card__foot">
              <button type="button" className="btn btn-outline" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={doSubmit}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

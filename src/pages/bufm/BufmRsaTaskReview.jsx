import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { normalizeLabel } from '../../utils/reviewFeedback.js'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'
import RsaSubmissionDetailView from '../../components/rsa/RsaSubmissionDetailView.jsx'
import RsaDocumentFullscreenModal from '../../components/rsa/RsaDocumentFullscreenModal.jsx'
import RejectModal from '../../components/RejectModal.jsx'

const REVIEWERS = ['Robert Chen', 'Maria Wilson', 'Jane Wilson', 'Alex Morgan']

/** RSA service-area review stream under unified BUFM document review */
const BUFM_RSA_HOME = '/bufm/document-review/rsaui'

function priorityClass(p) {
  const x = String(p || 'medium').toLowerCase()
  if (x === 'high') return 'rsa-bufm-badge rsa-bufm-badge--pri rsa-bufm-badge--pri-high'
  if (x === 'low') return 'rsa-bufm-badge rsa-bufm-badge--pri rsa-bufm-badge--pri-low'
  return 'rsa-bufm-badge rsa-bufm-badge--pri rsa-bufm-badge--pri-med'
}

export default function BufmRsaTaskReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getSubmission, approveBUFM, rejectBUFM, releaseBufmToUnclaimed } = useRsaUI()
  const decodedId = id ? decodeURIComponent(id) : ''
  const sub = decodedId ? getSubmission(decodedId) : null

  const [approveOpen, setApproveOpen] = useState(false)
  const [slaNote, setSlaNote] = useState('')
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [releaseTo, setReleaseTo] = useState('')
  const [releaseNote, setReleaseNote] = useState('')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectPicks, setRejectPicks] = useState([])

  const toggleRejectPick = (scope, label) => {
    setRejectPicks(prev => {
      const i = prev.findIndex(
        p => p.scope === scope && normalizeLabel(p.label) === normalizeLabel(label),
      )
      if (i >= 0) return prev.filter((_, j) => j !== i)
      return [...prev, { scope, label }]
    })
  }

  if (!sub) {
    return (
      <Layout>
        <div className="bufm-rsa-page">
          <p>Request not found.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate(`${BUFM_RSA_HOME}/review`)}>Back</button>
        </div>
      </Layout>
    )
  }

  const canAct = sub.status === RSA_STATUS.Pending_BUFM && !sub.bufmUnclaimed
  const slaExceeded = sub.bufmSlaExceeded
  const sa = sub.serviceArea || {}

  const handleApproveClick = () => {
    if (slaExceeded) {
      setApproveOpen(true)
      return
    }
    if (!window.confirm(`Approve this Request?\n\n"${sub.serviceArea?.name || sub.id}" will be marked as approved and the requestor (${sub.pocName || 'POC'}) will be notified.`)) return
    approveBUFM(sub.id)
    window.alert('✓ Task Approved Successfully')
    navigate(`${BUFM_RSA_HOME}/approved`)
  }

  const approveWithSlaNote = () => {
    if (!slaNote.trim()) {
      window.alert('Please add a note explaining the delay before approving.')
      return
    }
    approveBUFM(sub.id)
    setApproveOpen(false)
    window.alert('✓ Task Approved Successfully')
    navigate(`${BUFM_RSA_HOME}/approved`)
  }

  const doRelease = () => {
    if (!releaseTo) {
      window.alert('Select BUFM Reviewer')
      return
    }
    if (releaseTo === (sub.assignedBufmReviewer || 'Jane Wilson')) {
      window.alert('Cannot Release to Same User\n\nThis task is already assigned to you. Please select a different reviewer.')
      return
    }
    releaseBufmToUnclaimed(sub.id, { releaseNote })
    setReleaseOpen(false)
    window.alert('✓ Task Released Successfully')
    navigate(`${BUFM_RSA_HOME}/unclaimed`)
  }

  const slaLabel = slaExceeded
    ? '⚠ SLA exceeded'
    : `⏱ ${sub.bufmSlaHoursRemaining ?? '—'}h remaining`

  const rsaFlagDetailProps = {
    flagPickerMode: canAct,
    rejectPicks,
    onToggleRejectPick: toggleRejectPick,
  }

  const bufmFullscreenDetailProps = {
    submission: sub,
    creatorName: sub.pocName || sub.requestMeta?.requestorName || '—',
    creatorEmail: sub.requestMeta?.requestorEmail || '—',
    unifiedPanel: true,
    showWorkflowTimeline: false,
    rejectionNote: sub.rejection_comment_BUFM || undefined,
    rejectionTitle: 'BUFM note',
    ...rsaFlagDetailProps,
  }

  return (
    <Layout>
      <div className="bufm-rsa-page bufm-rsa-review bufm-rsa-review--v2 bufm-rsa-review--summary">
        <div className="bufm-rsa-summary-card">
          <button type="button" className="btn btn-text bufm-rsa-back" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <nav className="rsa-bufm-breadcrumb" aria-label="Breadcrumb">
            <span>RSAUI</span>
            <span className="rsa-bc-sep" aria-hidden>
              ›
            </span>
            <span>BUFM</span>
            <span className="rsa-bc-sep" aria-hidden>
              ›
            </span>
            <span>Review Queue</span>
            <span className="rsa-bc-sep" aria-hidden>
              ›
            </span>
            <span className="rsa-bc-current">{sa.name || sub.id}</span>
          </nav>

          <header className="rsa-bufm-review-header">
            <div className="rsa-bufm-review-header__row">
              <h1 className="rsa-bufm-review-title">Task review — {sa.name || sub.id}</h1>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setFullscreenOpen(true)}>
                Full screen
              </button>
            </div>
            <div className="rsa-bufm-badge-row" role="list">
              <span className="rsa-bufm-badge rsa-bufm-badge--type" role="listitem">
                {sub.requestType || 'Create Service Area'}
              </span>
              <span className="rsa-bufm-badge rsa-bufm-badge--pending" role="listitem">
                <span className="rsa-bufm-badge__dot" aria-hidden /> Pending review
              </span>
              <span className={priorityClass(sub.bufmPriority)} role="listitem">
                {sub.bufmPriority || 'Medium'}
              </span>
              <span className={`rsa-bufm-badge rsa-bufm-badge--sla${slaExceeded ? ' rsa-bufm-badge--sla-bad' : ''}`} role="listitem">
                {slaLabel}
              </span>
              <span className="rsa-bufm-badge rsa-bufm-badge--ver" role="listitem">
                {sub.version || 'v1.0'}
              </span>
            </div>
          </header>

          <div className="bufm-rsa-summary-divider" aria-hidden />

          <div className="bufm-rsa-review__detail rsa-detail-view-wrap">
            {canAct && rejectPicks.length > 0 && (
              <div className="reviewer-pick-hint" role="status" style={{ marginBottom: 12 }}>
                <strong>{rejectPicks.length}</strong> item{rejectPicks.length === 1 ? '' : 's'} flagged — open <strong>Reject</strong> to add comments for each row.
              </div>
            )}
            <RsaSubmissionDetailView
              submission={sub}
              creatorName={sub.pocName || sub.requestMeta?.requestorName || '—'}
              creatorEmail={sub.requestMeta?.requestorEmail || '—'}
              rejectionNote={sub.rejection_comment_BUFM || undefined}
              rejectionTitle="BUFM note"
              unifiedPanel
              unifiedEmbedded
              showWorkflowTimeline={false}
              {...rsaFlagDetailProps}
            />
          </div>

          <div className="bufm-rsa-summary-divider" aria-hidden />

          <footer className="bufm-rsa-summary-actions">
            <div className="bufm-rsa-summary-actions__meta">
              <strong>{sa.name || sub.id}</strong>
              <span className="rsa-muted">
                {sub.requestType || 'Create Service Area'} · {sub.bufmPriority || 'Medium'} · {sub.version || 'v1.0'}
              </span>
            </div>
            <div className="bufm-rsa-summary-actions__btns">
              <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
                ← Back
              </button>
              {canAct && (
                <>
                  <button type="button" className="btn btn-outline" onClick={() => setReleaseOpen(true)}>
                    Release task
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setRejectOpen(true)}>
                    Reject
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleApproveClick}>
                    ✓ Approve
                  </button>
                </>
              )}
              {!canAct && sub.status !== RSA_STATUS.Pending_BUFM && (
                <span className="rsa-muted">Read-only — task not in BUFM review queue</span>
              )}
            </div>
          </footer>
        </div>
      </div>

      <RsaDocumentFullscreenModal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        title={sa.name || sub.id}
        subtitle={`RSAUI · BUFM review · ${sub.requestType || 'Create Service Area'} · ${sub.id}`}
      >
        <div className="rsa-read-surface">
          <RsaSubmissionDetailView {...bufmFullscreenDetailProps} />
        </div>
      </RsaDocumentFullscreenModal>

      <RejectModal
        open={rejectOpen}
        title="Reject RSAUI submission"
        roleLabel="BUFM"
        variant="rsa"
        enableAuditTrail
        initialFeedbackRows={rejectPicks}
        onClose={() => setRejectOpen(false)}
        onConfirm={payload => {
          rejectBUFM(sub.id, payload)
          setRejectPicks([])
          window.alert('✓ Task returned to requestor with your feedback')
          navigate(`${BUFM_RSA_HOME}/rejected`)
        }}
      />

      {approveOpen && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true">
          <div className="rsa-modal-card">
            <div className="rsa-modal-card__head rsa-modal-card__head--warn">SLA Exceeded — Confirm Action</div>
            <div className="rsa-modal-card__body">
              <p>This task exceeded its SLA deadline. Please add a note explaining the delay before approving.</p>
              <label className="rsa-ui-field rsa-ui-field--full">
                <span>Note</span>
                <textarea rows={3} value={slaNote} onChange={e => setSlaNote(e.target.value)} />
              </label>
            </div>
            <div className="rsa-modal-card__foot">
              <button type="button" className="btn btn-outline" onClick={() => setApproveOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={approveWithSlaNote}>Approve with Note</button>
            </div>
          </div>
        </div>
      )}

      {releaseOpen && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true">
          <div className="rsa-modal-card">
            <div className="rsa-modal-card__head">Release Task to Another Reviewer</div>
            <div className="rsa-modal-card__body">
              <label className="rsa-ui-field rsa-ui-field--full">
                <span>Select BUFM Reviewer *</span>
                <select value={releaseTo} onChange={e => setReleaseTo(e.target.value)}>
                  <option value="">— Select Reviewer —</option>
                  {REVIEWERS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="rsa-ui-field rsa-ui-field--full">
                <span>Release Note (optional)</span>
                <textarea rows={2} value={releaseNote} onChange={e => setReleaseNote(e.target.value)} />
              </label>
            </div>
            <div className="rsa-modal-card__foot">
              <button type="button" className="btn btn-outline" onClick={() => setReleaseOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={doRelease}>Release Task</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

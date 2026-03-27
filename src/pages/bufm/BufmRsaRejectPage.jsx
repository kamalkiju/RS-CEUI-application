import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

export default function BufmRsaRejectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getSubmission, rejectBUFM } = useRsaUI()
  const sub = id ? getSubmission(id) : null
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')

  if (!sub) {
    return (
      <Layout>
        <div className="bufm-rsa-page">
          <p>Request not found.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/rsaui/bufm/document-review/review')}>Back</button>
        </div>
      </Layout>
    )
  }

  if (sub.status !== RSA_STATUS.Pending_BUFM) {
    return (
      <Layout>
        <div className="bufm-rsa-page">
          <p>This request is not pending BUFM review.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate(`/rsaui/bufm/review/${encodeURIComponent(sub.id)}`)}>Back to Review</button>
        </div>
      </Layout>
    )
  }

  const submit = () => {
    const t = comment.trim()
    if (t.length < 20) {
      setErr('Rejection comment is required (minimum 20 characters)')
      return
    }
    setErr('')
    if (!window.confirm(`Reject and Return to Requestor?\n\n"${sub.serviceArea?.name || sub.id}" will be returned to ${sub.pocName || 'the requestor'} with your rejection note.`)) return
    rejectBUFM(sub.id, t)
    window.alert('✓ Task Returned to Requestor')
    navigate('/rsaui/bufm/document-review/rejected')
  }

  return (
    <Layout>
    <div className="bufm-rsa-page bufm-rsa-reject">
      <button type="button" className="btn btn-text" onClick={() => navigate(`/rsaui/bufm/review/${encodeURIComponent(sub.id)}`)}>← Back to Review</button>
      <h1>Reject &amp; Return to Requestor</h1>
      <div className="rsa-alert rsa-alert--danger">
        Rejection will be sent to the POC. They can edit and resubmit.
      </div>
      <label className="rsa-ui-field rsa-ui-field--full">
        <span>Rejection Comment * (min 20 characters)</span>
        <textarea rows={6} value={comment} onChange={e => { setComment(e.target.value); setErr('') }} placeholder="Explain what must be corrected…" />
      </label>
      {err && <p className="rsa-field-error">{err}</p>}
      <div className="rsa-step-actions">
        <button type="button" className="btn btn-outline" onClick={() => navigate(`/rsaui/bufm/review/${encodeURIComponent(sub.id)}`)}>← Back to Review</button>
        <button type="button" className="btn btn-primary" disabled={comment.trim().length < 20} onClick={submit}>
          Reject &amp; Return to Requestor
        </button>
      </div>
    </div>
    </Layout>
  )
}

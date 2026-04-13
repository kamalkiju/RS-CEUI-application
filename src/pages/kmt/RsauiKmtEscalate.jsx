import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

const LEVELS = [
  { id: 1, label: 'Level 1 — Manager' },
  { id: 2, label: 'Level 2 — Director' },
  { id: 3, label: 'Level 3 — Executive' },
]

export default function RsauiKmtEscalate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getSubmission, setKmtEscalation } = useRsaUI()
  const sub = id ? getSubmission(id) : null
  const [reason, setReason] = useState('')
  const [level, setLevel] = useState(1)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!sub) return
    const l = sub.kmtEscalationLevel || 0
    setLevel(Math.min(3, Math.max(1, l + 1)))
  }, [sub])

  if (!sub) {
    return (
      <Layout>
        <div className="bufm-rsa-page"><p>Not found.</p><button type="button" className="btn btn-outline" onClick={() => navigate('/kmt/document-review/rsaui/review')}>Back</button></div>
      </Layout>
    )
  }

  if (sub.status !== RSA_STATUS.Pending_BUFM) {
    return (
      <Layout>
        <div className="bufm-rsa-page">
          <p>Escalation applies to requests in BUFM review.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/kmt/document-review/rsaui/review')}>Back</button>
        </div>
      </Layout>
    )
  }

  const currentL = sub.kmtEscalationLevel || 0
  const send = () => {
    if (!reason.trim()) {
      setErr('Escalation reason is required')
      return
    }
    setErr('')
    setConfirmOpen(true)
  }

  const confirm = () => {
    if (level <= currentL) {
      window.alert(
        `Already Escalated\n\nThis request has already been escalated to Level ${currentL}. Select Level ${currentL + 1} or higher.`,
      )
      setConfirmOpen(false)
      if (currentL < 3) setLevel(currentL + 1)
      return
    }
    setKmtEscalation(sub.id, { level, reason: reason.trim() })
    setConfirmOpen(false)
    window.alert('✓ Escalation sent successfully')
    navigate('/kmt/document-review/rsaui/review')
  }

  return (
    <Layout>
      <div className="bufm-rsa-page kmt-escalate">
        <button type="button" className="btn btn-text" onClick={() => navigate(-1)}>← Back</button>
        <h1>Escalate Request</h1>
        <div className="rsa-alert rsa-alert--warn">
          Escalation notifies management and fast-tracks BUFM review for: <strong>{sub.serviceArea?.name || sub.id}</strong>
        </div>
        {currentL > 0 && (
          <p className="rsa-muted">Current escalation level: {currentL}</p>
        )}
        <label className="rsa-ui-field rsa-ui-field--full">
          <span>Escalation Reason *</span>
          <textarea rows={5} value={reason} onChange={e => { setReason(e.target.value); setErr('') }} />
        </label>
        {err && <p className="rsa-field-error">{err}</p>}
        <fieldset className="rsa-fieldset">
          <legend>Escalation Level *</legend>
          {LEVELS.map(l => (
            <label key={l.id} className="rsa-radio-row">
              <input type="radio" name="lvl" checked={level === l.id} onChange={() => setLevel(l.id)} />
              {l.label}
            </label>
          ))}
        </fieldset>
        <div className="rsa-step-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>← Back</button>
          <button type="button" className="btn btn-primary" onClick={send}>Send Escalation</button>
        </div>
      </div>

      {confirmOpen && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true">
          <div className="rsa-modal-card">
            <div className="rsa-modal-card__head rsa-modal-card__head--warn">Send Escalation?</div>
            <div className="rsa-modal-card__body">
              <p>This will notify management and fast-track the BUFM review for:</p>
              <p><strong>{sub.serviceArea?.name || sub.id}</strong></p>
              <p>Level: {LEVELS.find(l => l.id === level)?.label}</p>
            </div>
            <div className="rsa-modal-card__foot">
              <button type="button" className="btn btn-outline" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={confirm}>Send Escalation</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

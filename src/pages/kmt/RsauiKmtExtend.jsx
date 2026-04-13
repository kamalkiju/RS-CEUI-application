import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

function CalendarIcon() {
  return (
    <svg className="rsa-date-input-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export default function RsauiKmtExtend() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getSubmission, extendOfferingExpiry } = useRsaUI()
  const decodedId = id ? decodeURIComponent(id) : ''
  const sub = decodedId ? getSubmission(decodedId) : null
  const [newExpiry, setNewExpiry] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')

  if (!sub || sub.status !== RSA_STATUS.Published) {
    return (
      <Layout>
        <div className="bufm-rsa-page kmt-extend-page">
          <div className="kmt-extend-page__card">
            <p>Extend expiry is only available for published service areas.</p>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/kmt/document-review/rsaui/review')}>
              Back
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const current = sub.serviceArea?.expiryDate || ''
  const name = sub.serviceArea?.name || sub.id

  const submit = () => {
    if (!newExpiry) {
      setErr('New expiry date is required')
      return
    }
    const curT = new Date(current).getTime()
    const newT = new Date(newExpiry).getTime()
    if (newT <= Date.now()) {
      setErr('Expiry date must be a future date')
      return
    }
    if (current && newT <= curT) {
      setErr(`New expiry date must be after current expiry (${current})`)
      return
    }
    if (!reason.trim()) {
      setErr('Reason for extension is required')
      return
    }
    setErr('')
    extendOfferingExpiry(sub.id, { newExpiryDate: newExpiry, offeringName: sub.offeringExpiryLabel })
    window.alert(
      `✓ Expiry Extended\n\n"${sub.offeringExpiryLabel || 'Offering'}" for "${sub.serviceArea?.name}" updated to ${newExpiry}.\nThe POC has been notified.`,
    )
    navigate('/kmt/document-review/rsaui/review')
  }

  return (
    <Layout>
      <div className="bufm-rsa-page kmt-extend-page">
        <div className="kmt-extend-page__card">
          <button type="button" className="kmt-extend-page__back" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <h1 className="kmt-extend-page__title">Extend Expiry — {name}</h1>

          <div className="kmt-extend-page__banner" role="note">
            Extensions affect contract visibility and renewal workflows.
          </div>

          <p className="kmt-extend-page__current">
            <strong>Current Expiry Date:</strong> {current || '—'}
          </p>

          <div className="kmt-extend-page__fields">
            <label className="rsa-ui-field rsa-ui-field--full">
              <span>New Expiry Date *</span>
              <div className="rsa-date-input-wrap">
                <input
                  type="date"
                  value={newExpiry}
                  onChange={e => {
                    setNewExpiry(e.target.value)
                    setErr('')
                  }}
                />
                <CalendarIcon />
              </div>
            </label>

            <label className="rsa-ui-field rsa-ui-field--full">
              <span>Reason for Extension *</span>
              <textarea
                rows={5}
                value={reason}
                placeholder="Describe why this extension is needed…"
                onChange={e => {
                  setReason(e.target.value)
                  setErr('')
                }}
              />
            </label>
          </div>

          {err ? <p className="rsa-field-error">{err}</p> : null}

          <footer className="kmt-extend-page__footer">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
              ← Back
            </button>
            <button type="button" className="btn btn-primary" onClick={submit}>
              Extend Expiry
            </button>
          </footer>
        </div>
      </div>
    </Layout>
  )
}

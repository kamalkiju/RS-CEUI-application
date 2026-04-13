import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

export default function RsauiKmtArchive() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getSubmission, archiveSubmission } = useRsaUI()
  const sub = id ? getSubmission(id) : null
  const [reason, setReason] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const [err, setErr] = useState('')

  if (!sub || sub.status !== RSA_STATUS.Published) {
    return (
      <Layout>
        <div className="bufm-rsa-page">
          <p>Archive is only available for published service areas.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/kmt/document-review/rsaui/review')}>Back</button>
        </div>
      </Layout>
    )
  }

  if (sub.archived) {
    return (
      <Layout>
        <div className="bufm-rsa-page">
          <p>Already Archived — this record was archived on {sub.updated}.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/kmt/document-review/rsaui/review')}>OK</button>
        </div>
      </Layout>
    )
  }

  const name = sub.serviceArea?.name || sub.id
  const submit = () => {
    if (!reason.trim()) {
      setErr('Archive reason is required')
      return
    }
    if (confirmName.trim() !== name) {
      setErr(`Service area name doesn't match. Type exactly: ${name}`)
      return
    }
    setErr('')
    if (!window.confirm(`Archive Service Area?\n\n"${name}" will be permanently archived. All offerings will be set to Inactive.\n\nThis action CANNOT be undone.`)) return
    archiveSubmission(sub.id, { reason: reason.trim() })
    window.alert('✓ Service Area Archived')
    navigate('/kmt/document-review/rsaui/review')
  }

  return (
    <Layout>
      <div className="bufm-rsa-page kmt-archive">
        <button type="button" className="btn btn-text" onClick={() => navigate(-1)}>← Back</button>
        <h1>Archive Service Area — {name}</h1>
        <div className="rsa-alert rsa-alert--danger">Archiving is permanent for operational purposes in this demo.</div>
        <label className="rsa-ui-field rsa-ui-field--full">
          <span>Archive Reason *</span>
          <textarea rows={4} value={reason} onChange={e => { setReason(e.target.value); setErr('') }} />
        </label>
        <label className="rsa-ui-field rsa-ui-field--full">
          <span>Confirm: type the service area name exactly *</span>
          <input value={confirmName} onChange={e => { setConfirmName(e.target.value); setErr('') }} placeholder={name} />
        </label>
        {err && <p className="rsa-field-error">{err}</p>}
        <div className="rsa-step-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit}>Confirm Archive</button>
        </div>
      </div>
    </Layout>
  )
}

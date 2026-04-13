import { useParams, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'
import RejectModal from '../../components/RejectModal.jsx'

const BUFM_RSA_HOME = '/bufm/document-review/rsaui'

export default function BufmRsaRejectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getSubmission, rejectBUFM } = useRsaUI()
  const sub = id ? getSubmission(id) : null
  const [modalOpen, setModalOpen] = useState(true)
  const confirmedRef = useRef(false)

  useEffect(() => {
    confirmedRef.current = false
  }, [sub?.id])

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

  if (sub.status !== RSA_STATUS.Pending_BUFM) {
    return (
      <Layout>
        <div className="bufm-rsa-page">
          <p>This request is not pending BUFM review.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate(`/bufm/review/${encodeURIComponent(sub.id)}`)}>Back to Review</button>
        </div>
      </Layout>
    )
  }

  const goBack = () => navigate(`/bufm/review/${encodeURIComponent(sub.id)}`)

  const onConfirm = payload => {
    confirmedRef.current = true
    rejectBUFM(sub.id, payload)
    window.alert('✓ Task Returned to Requestor')
    navigate(`${BUFM_RSA_HOME}/rejected`)
  }

  return (
    <Layout>
      <div className="bufm-rsa-page bufm-rsa-reject">
        <button type="button" className="btn btn-text" onClick={goBack}>← Back to Review</button>
        <h1>Reject &amp; Return to Requestor</h1>
        <div className="rsa-alert rsa-alert--danger">
          Add a summary comment and optional section/field feedback. The POC will see highlights on the submission.
        </div>
        <RejectModal
          open={modalOpen}
          title="Reject RSAUI submission"
          roleLabel="BUFM"
          variant="rsa"
          enableAuditTrail
          onClose={() => {
            setModalOpen(false)
            if (!confirmedRef.current) goBack()
          }}
          onConfirm={onConfirm}
        />
      </div>
    </Layout>
  )
}

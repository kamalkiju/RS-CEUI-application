import { useOutletContext, useNavigate } from 'react-router-dom'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import RsaUIServiceArea from './RsaUIServiceArea.jsx'

const BASE = '/poc/service-area'

export default function RsauiPocSelectStep() {
  const { submissionId, readOnly, tabSuffix, wizardBase = BASE } = useOutletContext()
  const navigate = useNavigate()
  const { getSubmission } = useRsaUI()
  const sub = submissionId ? getSubmission(submissionId) : null
  const sa = sub?.serviceArea || {}
  const canContinue = Boolean(sa.name && sa.polygonId)

  const onContinue = () => {
    if (!canContinue) {
      // eslint-disable-next-line no-alert
      window.alert('Please select a service area to continue.')
      return
    }
    navigate(`${wizardBase}/configure${tabSuffix}`)
  }

  return (
    <>
      <RsaUIServiceArea />
      {!readOnly && (
        <div className="rsa-step-actions">
          <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={onContinue}>
            Continue to product configuration →
          </button>
        </div>
      )}
    </>
  )
}

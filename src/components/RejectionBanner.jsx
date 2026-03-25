/**
 * Shows when status indicates BUFM or KMT rejection (documents or RSAUI).
 */
export default function RejectionBanner({ status, rejection_comment_BUFM, rejection_comment_KMT, fallbackNote }) {
  const s = String(status ?? '')
  const lower = s.toLowerCase()
  if (!lower.includes('rejected')) return null

  const isKmt = lower.includes('kmt')
  const isBufm = lower.includes('bufm')
  const label = isKmt ? 'Rejected by KMT' : isBufm ? 'Rejected by BUFM' : 'Rejected'
  const comment = isKmt
    ? (rejection_comment_KMT || fallbackNote)
    : (rejection_comment_BUFM || fallbackNote)

  return (
    <div className="rejection-banner" role="status">
      <div className="rejection-banner__title">{label}</div>
      {comment && (
        <div className="rejection-banner__comment">
          <span className="rejection-banner__label">Comment:</span> {comment}
        </div>
      )}
    </div>
  )
}

/**
 * Shows when status indicates BUFM or KMT rejection (documents or RSAUI).
 * Optional structured highlights from review audit trail.
 */
export default function RejectionBanner({
  status,
  rejection_comment_BUFM,
  rejection_comment_KMT,
  fallbackNote,
  highlightSections = [],
  highlightFields = [],
}) {
  const s = String(status ?? '')
  const lower = s.toLowerCase()
  if (!lower.includes('rejected')) return null

  const isKmt = lower.includes('kmt')
  const isBufm = lower.includes('bufm')
  const label = isKmt ? 'Rejected by KMT' : isBufm ? 'Rejected by BUFM' : 'Rejected'
  const comment = isKmt
    ? (rejection_comment_KMT || fallbackNote)
    : (rejection_comment_BUFM || fallbackNote)

  const sec = Array.isArray(highlightSections) ? highlightSections : []
  const fld = Array.isArray(highlightFields) ? highlightFields : []

  return (
    <div className="rejection-banner" role="status">
      <div className="rejection-banner__title">{label}</div>
      {comment && (
        <div className="rejection-banner__comment">
          <span className="rejection-banner__label">Comment:</span> {comment}
        </div>
      )}
      {(sec.length > 0 || fld.length > 0) && (
        <div className="rejection-banner__audit">
          <div className="rejection-banner__audit-title">Reviewer highlights — address these areas</div>
          {sec.length > 0 && (
            <ul className="rejection-banner__audit-list">
              {sec.map((x, i) => (
                <li key={`s-${i}`}><span className="rejection-banner__tag">Section</span> {x}</li>
              ))}
            </ul>
          )}
          {fld.length > 0 && (
            <ul className="rejection-banner__audit-list">
              {fld.map((x, i) => (
                <li key={`f-${i}`}><span className="rejection-banner__tag rejection-banner__tag--field">Field</span> {x}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

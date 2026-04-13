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
  feedbackItems = [],
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

  const items = Array.isArray(feedbackItems) ? feedbackItems : []
  const sec = Array.isArray(highlightSections) ? highlightSections : []
  const fld = Array.isArray(highlightFields) ? highlightFields : []

  const showLegacyLists = items.length === 0 && (sec.length > 0 || fld.length > 0)

  return (
    <div className="rejection-banner" role="status">
      <div className="rejection-banner__title">{label}</div>
      {comment && (
        <div className="rejection-banner__comment">
          <span className="rejection-banner__label">Comment:</span> {comment}
        </div>
      )}
      {items.length > 0 && (
        <div className="rejection-banner__audit">
          <div className="rejection-banner__audit-title">Item-by-item feedback</div>
          <ul className="rejection-banner__audit-list">
            {items.map((it, i) => (
              <li key={it.id || `it-${i}`}>
                <span className={`rejection-banner__tag${it.scope === 'field' ? ' rejection-banner__tag--field' : ''}`}>
                  {it.scope === 'field' ? 'Field' : 'Section'}
                </span>{' '}
                <strong>{it.label}</strong>
                {it.comment && (
                  <span className="rejection-banner__item-comment">{it.comment}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {showLegacyLists && (
        <div className="rejection-banner__audit">
          <div className="rejection-banner__audit-title rejection-banner__audit-title--caps">
            Reviewer highlights — address these areas
          </div>
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

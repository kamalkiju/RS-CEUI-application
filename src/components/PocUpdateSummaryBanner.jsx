/**
 * BUFM/KMT: shows which sections/fields changed vs snapshot when POC resubmitted after rejection.
 */
export default function PocUpdateSummaryBanner({ sections = [], fields = [], resubmissionNote = '' }) {
  const ns = sections?.length || 0
  const nf = fields?.length || 0
  const note = typeof resubmissionNote === 'string' ? resubmissionNote.trim() : ''
  if (!ns && !nf && !note) return null

  const summaryParts = []
  if (ns) summaryParts.push(`${ns} section${ns === 1 ? '' : 's'}`)
  if (nf) summaryParts.push(`${nf} field${nf === 1 ? '' : 's'}`)
  const summaryLine = summaryParts.length ? summaryParts.join(' · ') : null

  return (
    <div className="poc-update-summary" role="region" aria-label="POC updates since last rejection">
      <div className="poc-update-summary__title">POC updates — review before approving</div>
      {summaryLine && (
        <p className="poc-update-summary__counts">
          <span className="poc-update-summary__count-chip">{summaryLine}</span>
          {ns + nf > 0 && (
            <span className="poc-update-summary__count-total"> {ns + nf} total change{ns + nf === 1 ? '' : 's'}</span>
          )}
        </p>
      )}
      {ns > 0 && (
        <ul className="poc-update-summary__list">
          {sections.map((x, i) => (
            <li key={`s-${i}`}>
              <span className="poc-update-summary__tag">Section</span> {x}
            </li>
          ))}
        </ul>
      )}
      {nf > 0 && (
        <ul className="poc-update-summary__list">
          {fields.map((x, i) => (
            <li key={`f-${i}`}>
              <span className="poc-update-summary__tag poc-update-summary__tag--field">Field</span> {x}
            </li>
          ))}
        </ul>
      )}
      {note && (
        <div className="poc-update-summary__note">
          <strong>POC note</strong>
          <p>{note}</p>
        </div>
      )}
    </div>
  )
}

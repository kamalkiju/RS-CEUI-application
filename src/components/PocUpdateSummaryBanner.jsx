/**
 * BUFM/KMT: shows which sections/fields changed vs snapshot when POC resubmitted after rejection.
 */
export default function PocUpdateSummaryBanner({ sections = [], fields = [] }) {
  if (!sections.length && !fields.length) return null
  return (
    <div className="poc-update-summary" role="region" aria-label="POC updates since last rejection">
      <div className="poc-update-summary__title">POC updated — verify these areas</div>
      {sections.length > 0 && (
        <ul className="poc-update-summary__list">
          {sections.map((x, i) => (
            <li key={`s-${i}`}>
              <span className="poc-update-summary__tag">Section</span> {x}
            </li>
          ))}
        </ul>
      )}
      {fields.length > 0 && (
        <ul className="poc-update-summary__list">
          {fields.map((x, i) => (
            <li key={`f-${i}`}>
              <span className="poc-update-summary__tag poc-update-summary__tag--field">Field</span> {x}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Read-only field: label + plain text value (no input chrome).
 * @param {{ highlighted?: boolean, pocUpdated?: boolean }} props
 */
export default function TextFieldView({ label, value, multiline, highlighted, pocUpdated }) {
  const display = value === undefined || value === null || value === '' ? '—' : String(value)

  return (
    <div
      className={`text-field-view${multiline ? ' text-field-view--multiline' : ''}${highlighted ? ' text-field-view--reviewer-flag' : ''}${pocUpdated ? ' text-field-view--poc-update' : ''}`}
    >
      <span className="text-field-view__label">{label}</span>
      {multiline ? (
        <div className="text-field-view__value text-field-view__value--multiline">{display}</div>
      ) : (
        <div className="text-field-view__value">{display}</div>
      )}
    </div>
  )
}

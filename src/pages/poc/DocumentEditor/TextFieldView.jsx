/**
 * Read-only field: label + plain text value (no input chrome).
 */
export default function TextFieldView({ label, value, multiline }) {
  const display = value === undefined || value === null || value === '' ? '—' : String(value)

  return (
    <div className={`text-field-view${multiline ? ' text-field-view--multiline' : ''}`}>
      <span className="text-field-view__label">{label}</span>
      {multiline ? (
        <div className="text-field-view__value text-field-view__value--multiline">{display}</div>
      ) : (
        <div className="text-field-view__value">{display}</div>
      )}
    </div>
  )
}

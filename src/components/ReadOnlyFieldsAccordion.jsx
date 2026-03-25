import { useState } from 'react'
import TextFieldView from '../pages/poc/DocumentEditor/TextFieldView.jsx'

function ChevronSvg({ open }) {
  return (
    <svg
      className="read-only-acc__chevron"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/**
 * Read-only accordion: title + label/value fields (not inputs).
 * @param {{ title: string, badge?: string, fields: Array<{ label: string, value?: string, multiline?: boolean }>, defaultOpen?: boolean }} props
 */
export default function ReadOnlyFieldsAccordion({ title, badge, fields = [], defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`read-only-acc${open ? ' read-only-acc--open' : ''}`}>
      <button type="button" className="read-only-acc__header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="read-only-acc__title">{title}</span>
        {badge && <span className="read-only-acc__badge">{badge}</span>}
        <span className="read-only-acc__spacer" />
        <ChevronSvg open={open} />
      </button>
      {open && (
        <div className="read-only-acc__body">
          <div className="read-only-acc__grid">
            {fields.map((f, i) => (
              <TextFieldView key={i} label={f.label} value={f.value} multiline={f.multiline} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

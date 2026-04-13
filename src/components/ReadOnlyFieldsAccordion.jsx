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
 * @param {{ sectionFlagged?: boolean, pocSectionFlagged?: boolean, pocFieldFlags?: (label: string) => boolean }} props
 */
export default function ReadOnlyFieldsAccordion({
  title,
  badge,
  fields = [],
  defaultOpen = true,
  sectionFlagged = false,
  pocSectionFlagged = false,
  fieldFlags = null,
  pocFieldFlags = null,
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`read-only-acc${open ? ' read-only-acc--open' : ''}${sectionFlagged ? ' read-only-acc--reviewer-flag' : ''}${pocSectionFlagged ? ' read-only-acc--poc-update' : ''}`}
    >
      <button type="button" className="read-only-acc__header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="read-only-acc__title">{title}</span>
        {sectionFlagged && <span className="read-only-acc__flag-pill">Review</span>}
        {pocSectionFlagged && <span className="read-only-acc__flag-pill read-only-acc__flag-pill--poc">Updated</span>}
        {badge && <span className="read-only-acc__badge">{badge}</span>}
        <span className="read-only-acc__spacer" />
        <ChevronSvg open={open} />
      </button>
      {open && (
        <div className="read-only-acc__body">
          <div className="read-only-acc__grid">
            {fields.map((f, i) => (
              <TextFieldView
                key={i}
                label={f.label}
                value={f.value}
                multiline={f.multiline}
                highlighted={fieldFlags ? fieldFlags(f.label) : false}
                pocUpdated={pocFieldFlags ? pocFieldFlags(f.label) : false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

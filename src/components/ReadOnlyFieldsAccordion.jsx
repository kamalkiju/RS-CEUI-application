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
 * @param {{ flagPickerMode?: boolean, sectionPickActive?: boolean, onFlagSection?: () => void, onFlagField?: (fieldLabel: string) => void, fieldPickActive?: (label: string) => boolean }} props
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
  flagPickerMode = false,
  sectionPickActive = false,
  onFlagSection = null,
  onFlagField = null,
  fieldPickActive = null,
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`read-only-acc${open ? ' read-only-acc--open' : ''}${sectionFlagged ? ' read-only-acc--reviewer-flag' : ''}${pocSectionFlagged ? ' read-only-acc--poc-update' : ''}${sectionPickActive ? ' read-only-acc--pick-active' : ''}`}
    >
      <div className="read-only-acc__header-row">
        <button type="button" className="read-only-acc__header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          <span className="read-only-acc__title">{title}</span>
          {sectionFlagged && <span className="read-only-acc__flag-pill">Review</span>}
          {pocSectionFlagged && <span className="read-only-acc__flag-pill read-only-acc__flag-pill--poc">Updated</span>}
          {badge && <span className="read-only-acc__badge">{badge}</span>}
          <span className="read-only-acc__spacer" />
          <ChevronSvg open={open} />
        </button>
        {flagPickerMode && onFlagSection && (
          <button
            type="button"
            className={`read-only-acc__pick-btn${sectionPickActive ? ' read-only-acc__pick-btn--on' : ''}`}
            onClick={e => { e.stopPropagation(); onFlagSection() }}
            aria-pressed={sectionPickActive}
            title="Flag this section for rejection feedback"
          >
            Flag
          </button>
        )}
      </div>
      {open && (
        <div className="read-only-acc__body">
          <div className="read-only-acc__grid">
            {fields.map((f, i) => (
              <div
                key={i}
                className={`read-only-acc__field-wrap${fieldPickActive?.(f.label) ? ' read-only-acc__field-wrap--pick' : ''}`}
              >
                {flagPickerMode && onFlagField && (
                  <button
                    type="button"
                    className={`read-only-acc__pick-btn read-only-acc__pick-btn--field${fieldPickActive?.(f.label) ? ' read-only-acc__pick-btn--on' : ''}`}
                    onClick={() => onFlagField(f.label)}
                    aria-pressed={fieldPickActive?.(f.label)}
                    title="Flag this field"
                  >
                    Flag
                  </button>
                )}
                <TextFieldView
                  label={f.label}
                  value={f.value}
                  multiline={f.multiline}
                  highlighted={sectionFlagged || (fieldFlags ? fieldFlags(f.label) : false)}
                  pocUpdated={pocSectionFlagged || (pocFieldFlags ? pocFieldFlags(f.label) : false)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

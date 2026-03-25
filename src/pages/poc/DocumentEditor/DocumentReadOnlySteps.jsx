import { useState, useEffect } from 'react'
import TextFieldView from './TextFieldView.jsx'
import RejectionBanner from '../../../components/RejectionBanner.jsx'
import { getReadOnlyStepHeading, getReadOnlyStepSections } from './documentWizardReadOnlyModel.js'

function ChevronSvg() {
  return (
    <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}

function ReadOnlyAccordion({ id, title, badge, openIds, onToggle, children }) {
  const isOpen = openIds.includes(id)
  return (
    <div className={`card${isOpen ? ' open' : ''}`}>
      <div className="card-header" onClick={() => onToggle(id)}>
        <span className="card-title">{title}</span>
        {badge && <span className="badge badge-req">{badge}</span>}
        <div className="spacer" />
        <ChevronSvg />
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  )
}

/**
 * Full five-step read-only wizard: same tabs as edit mode, plain-text fields only.
 */
export default function DocumentReadOnlySteps({ doc, step }) {
  const { title, subtitle } = getReadOnlyStepHeading(step)
  const sections = getReadOnlyStepSections(doc, step)
  const [openIds, setOpenIds] = useState(() => sections.map((_, i) => `rs-${step}-${i}`))

  useEffect(() => {
    const next = getReadOnlyStepSections(doc, step)
    setOpenIds(next.map((_, i) => `rs-${step}-${i}`))
  }, [doc, step])

  const toggle = (id) => {
    setOpenIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  return (
    <main className="content document-readonly-steps">
      <RejectionBanner
        status={doc?.status}
        rejection_comment_BUFM={doc?.rejection_comment_BUFM}
        rejection_comment_KMT={doc?.rejection_comment_KMT}
        fallbackNote={doc?.rejectionNote}
      />

      <h2 className="section-heading">{title}</h2>
      <p className="section-subtitle">{subtitle}</p>
      <p className="document-readonly-steps__nav-hint">
        Use the <strong>five numbered tabs</strong> above (Knowledge Area through Fees) to review the full document in read-only mode.
      </p>

      <div className="document-readonly-steps__accordions">
        {sections.map((sec, i) => {
          const id = `rs-${step}-${i}`
          return (
            <ReadOnlyAccordion
              key={id}
              id={id}
              title={sec.title}
              badge={sec.badge}
              openIds={openIds}
              onToggle={toggle}
            >
              <div className="form-grid col-1" style={{ paddingTop: 4 }}>
                {(sec.fields || []).map((f, j) => (
                  <TextFieldView key={j} label={f.label} value={f.value} multiline={f.multiline} />
                ))}
              </div>
            </ReadOnlyAccordion>
          )
        })}
      </div>
    </main>
  )
}

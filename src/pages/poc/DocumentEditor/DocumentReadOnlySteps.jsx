import { useState, useEffect, useMemo } from 'react'
import TextFieldView from './TextFieldView.jsx'
import RejectionBanner from '../../../components/RejectionBanner.jsx'
import { getReadOnlyStepHeading, getReadOnlyStepSections } from './documentWizardReadOnlyModel.js'
import {
  buildPocUpdateFlagSets,
  buildReviewerFlagSets,
  isFieldFlagged,
  isReviewerHighlightingWholeStep,
  isSectionFlagged,
} from '../../../utils/reviewFeedback.js'

function ChevronSvg() {
  return (
    <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}

function ReadOnlyAccordion({ id, title, badge, openIds, onToggle, children, sectionClassExtra = '', pocSectionClassExtra = '' }) {
  const isOpen = openIds.includes(id)
  return (
    <div className={`card${isOpen ? ' open' : ''}${sectionClassExtra}${pocSectionClassExtra}`}>
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
  const { sections: secSet, fields: fldSet } = useMemo(() => buildReviewerFlagSets(doc), [doc])
  const pocSets = useMemo(() => buildPocUpdateFlagSets(doc), [doc])
  const wholeStepReviewer = useMemo(
    () => isReviewerHighlightingWholeStep(step, secSet),
    [step, secSet],
  )
  const wholeStepPoc = useMemo(() => isReviewerHighlightingWholeStep(step, pocSets.sections), [step, pocSets.sections])
  const [openIds, setOpenIds] = useState(() => sections.map((_, i) => `rs-${step}-${i}`))

  useEffect(() => {
    const next = getReadOnlyStepSections(doc, step)
    setOpenIds(next.map((_, i) => `rs-${step}-${i}`))
  }, [doc, step])

  useEffect(() => {
    const next = getReadOnlyStepSections(doc, step)
    const extra = []
    next.forEach((sec, i) => {
      const id = `rs-${step}-${i}`
      const secRev = wholeStepReviewer || isSectionFlagged(sec.title, secSet)
      const secPoc = wholeStepPoc || isSectionFlagged(sec.title, pocSets.sections)
      const anyFld =
        (sec.fields || []).some(
          f => isFieldFlagged(f.label, fldSet) || isFieldFlagged(f.label, pocSets.fields),
        )
      if (secRev || secPoc || anyFld) extra.push(id)
    })
    if (extra.length) setOpenIds(prev => Array.from(new Set([...prev, ...extra])))
  }, [doc, step, secSet, fldSet, pocSets, wholeStepReviewer, wholeStepPoc])

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
        highlightSections={doc?.rejection_highlight_sections || []}
        highlightFields={doc?.rejection_highlight_fields || []}
        feedbackItems={doc?.rejection_feedback_items || []}
      />

      <h2
        className={`section-heading${wholeStepReviewer ? ' section-heading--reviewer-flag' : ''}${
          wholeStepPoc ? ' section-heading--poc-update' : ''
        }`}
      >
        {title}
      </h2>
      <p className="section-subtitle">{subtitle}</p>
      <p className="document-readonly-steps__nav-hint">
        Use the <strong>five numbered tabs</strong> above (Knowledge Area through Fees) to review the full document in read-only mode.
      </p>

      <div className="document-readonly-steps__accordions">
        {sections.map((sec, i) => {
          const id = `rs-${step}-${i}`
          const secRev = wholeStepReviewer || isSectionFlagged(sec.title, secSet)
          const secPoc = wholeStepPoc || isSectionFlagged(sec.title, pocSets.sections)
          return (
            <ReadOnlyAccordion
              key={id}
              id={id}
              title={sec.title}
              badge={sec.badge}
              openIds={openIds}
              onToggle={toggle}
              sectionClassExtra={secRev ? ' reviewer-flag-section' : ''}
              pocSectionClassExtra={secPoc ? ' poc-update-section' : ''}
            >
              <div className="form-grid col-1" style={{ paddingTop: 4 }}>
                {(sec.fields || []).map((f, j) => (
                  <TextFieldView
                    key={j}
                    label={f.label}
                    value={f.value}
                    multiline={f.multiline}
                    highlighted={secRev || isFieldFlagged(f.label, fldSet)}
                    pocUpdated={secPoc || isFieldFlagged(f.label, pocSets.fields)}
                  />
                ))}
              </div>
            </ReadOnlyAccordion>
          )
        })}
      </div>
    </main>
  )
}

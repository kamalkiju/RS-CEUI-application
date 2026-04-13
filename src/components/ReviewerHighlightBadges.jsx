import { useMemo } from 'react'
import { getReviewerHighlightDisplay } from '../utils/reviewFeedback.js'

/**
 * Compact chips for queue/list rows: shows reviewer-flagged section/field counts when present.
 */
export default function ReviewerHighlightBadges({ source, variant = 'default', className = '', stacked = false }) {
  const d = useMemo(() => getReviewerHighlightDisplay(source), [source])
  if (!d.sectionCount && !d.fieldCount) return null

  const parts = []
  if (d.sectionCount) parts.push(`${d.sectionCount} section${d.sectionCount === 1 ? '' : 's'}`)
  if (d.fieldCount) parts.push(`${d.fieldCount} field${d.fieldCount === 1 ? '' : 's'}`)
  const title = d.tooltip || parts.join(' · ')

  const chipClass =
    variant === 'rsa'
      ? 'queue-reviewer-highlight-chip queue-reviewer-highlight-chip--rsa'
      : 'queue-reviewer-highlight-chip'

  return (
    <span
      className={`queue-reviewer-highlight-wrap${stacked ? ' queue-reviewer-highlight-wrap--stacked' : ''}${
        className ? ` ${className}` : ''
      }`}
      title={title || 'Reviewer-flagged areas'}
    >
      <span className={chipClass}>{parts.join(' · ')}</span>
    </span>
  )
}

/** Normalize labels for fuzzy matching reviewer highlights to wizard / RSA field titles. */
export function normalizeLabel(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function labelMatches(displayLabel, reviewerLabel) {
  const a = normalizeLabel(displayLabel)
  const b = normalizeLabel(reviewerLabel)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

export function newFeedbackId() {
  return `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * @param {'section'|'field'} scope
 * @param {string} label
 * @param {string} comment
 * @returns {{ id: string, scope: string, label: string, comment: string } | null}
 */
export function buildFeedbackItem(scope, label, comment) {
  const l = String(label ?? '').trim()
  const c = String(comment ?? '').trim()
  if (!l || !c) return null
  return {
    id: newFeedbackId(),
    scope: scope === 'field' ? 'field' : 'section',
    label: l,
    comment: c,
  }
}

export function buildHighlightsFromFeedbackItems(items) {
  const highlightSections = []
  const highlightFields = []
  for (const it of items || []) {
    if (!it?.label) continue
    if (it.scope === 'field') highlightFields.push(it.label)
    else highlightSections.push(it.label)
  }
  return { highlightSections, highlightFields }
}

/**
 * Merge legacy highlight arrays with structured items (from document or submission).
 */
export function buildReviewerFlagSets(source) {
  const sections = new Set()
  const fields = new Set()
  const addList = (arr, set) => {
    for (const x of arr || []) {
      const n = normalizeLabel(x)
      if (n) set.add(n)
    }
  }
  addList(source?.rejection_highlight_sections, sections)
  addList(source?.rejection_highlight_fields, fields)
  for (const it of source?.rejection_feedback_items || []) {
    if (!it?.label) continue
    const n = normalizeLabel(it.label)
    if (!n) continue
    if (it.scope === 'field') fields.add(n)
    else sections.add(n)
  }
  return { sections, fields }
}

export function isSectionFlagged(title, sections) {
  const t = normalizeLabel(title)
  if (!t) return false
  for (const s of sections) {
    if (labelMatches(t, s) || labelMatches(title, s)) return true
  }
  return false
}

export function isFieldFlagged(fieldLabel, fields) {
  const t = normalizeLabel(fieldLabel)
  if (!t) return false
  for (const f of fields) {
    if (labelMatches(t, f) || labelMatches(fieldLabel, f)) return true
  }
  return false
}

/**
 * @param {unknown} payload — string or { comment, feedbackItems?, highlightSections?, highlightFields? }
 */
export function normalizeRejectPayload(payload, role) {
  if (typeof payload === 'string') {
    return {
      comment: payload.trim(),
      feedbackItems: [],
      highlightSections: [],
      highlightFields: [],
      role,
    }
  }
  const p = payload && typeof payload === 'object' ? payload : {}
  const rawItems = Array.isArray(p.feedbackItems) ? p.feedbackItems : []
  const feedbackItems = rawItems
    .map(it => {
      if (it?.id && it.label && it.comment) {
        return {
          id: String(it.id),
          scope: it.scope === 'field' ? 'field' : 'section',
          label: String(it.label).trim(),
          comment: String(it.comment).trim(),
        }
      }
      return buildFeedbackItem(it.scope, it.label, it.comment)
    })
    .filter(Boolean)

  const derived = buildHighlightsFromFeedbackItems(feedbackItems)
  const highlightSections =
    Array.isArray(p.highlightSections) && p.highlightSections.length
      ? p.highlightSections.map(s => String(s).trim()).filter(Boolean)
      : derived.highlightSections
  const highlightFields =
    Array.isArray(p.highlightFields) && p.highlightFields.length
      ? p.highlightFields.map(s => String(s).trim()).filter(Boolean)
      : derived.highlightFields

  return {
    comment: String(p.comment ?? '').trim(),
    feedbackItems,
    highlightSections,
    highlightFields,
    role,
  }
}

/** Last reject entry in audit trail for a role (BUFM / KMT). */
export function lastRejectTrailEntry(trail, role) {
  if (!Array.isArray(trail) || !trail.length) return null
  for (let i = trail.length - 1; i >= 0; i--) {
    const e = trail[i]
    if (e?.action === 'reject' && e?.role === role) return e
  }
  return null
}

/** Wizard tab / step titles reviewers often type — highlights the whole step’s accordions. */
const STEP_HIGHLIGHT_ALIASES = {
  1: ['Knowledge Area', 'Residential Services Knowledge Area'],
  2: ['Service Categories'],
  3: ['Offerings'],
  4: ['Extra Pickup', 'Extra Pick Up'],
  5: ['Fees'],
}

/**
 * True when a reviewer section label refers to an entire numbered step (e.g. “Fees”) not only one accordion.
 */
export function isReviewerHighlightingWholeStep(step, sections) {
  const aliases = STEP_HIGHLIGHT_ALIASES[step]
  if (!aliases || !sections?.size) return false
  for (const a of aliases) {
    if (isSectionFlagged(a, sections)) return true
  }
  return false
}

export function buildPocUpdateFlagSets(source) {
  const sections = new Set()
  const fields = new Set()
  const addList = (arr, set) => {
    for (const x of arr || []) {
      const n = normalizeLabel(x)
      if (n) set.add(n)
    }
  }
  addList(source?.poc_updated_sections, sections)
  addList(source?.poc_updated_fields, fields)
  return { sections, fields }
}

/**
 * Human-readable labels + counts for reviewer flags (queues, lists).
 * If top-level rejection fields were cleared on resubmit, falls back to the latest reject entry in reviewAuditTrail.
 */
export function getReviewerHighlightDisplay(source) {
  const fromDoc = collectReviewerHighlightDisplay(source)
  if (fromDoc.sectionCount > 0 || fromDoc.fieldCount > 0) return fromDoc

  const trail = source?.reviewAuditTrail
  if (!Array.isArray(trail) || !trail.length) return fromDoc

  for (let i = trail.length - 1; i >= 0; i--) {
    const e = trail[i]
    if (e?.action !== 'reject') continue
    const merged = collectReviewerHighlightDisplay({
      rejection_highlight_sections: e.highlightSections,
      rejection_highlight_fields: e.highlightFields,
      rejection_feedback_items: e.feedbackItems,
    })
    if (merged.sectionCount > 0 || merged.fieldCount > 0) return merged
  }
  return fromDoc
}

function collectReviewerHighlightDisplay(source) {
  const rs = buildReviewerFlagSets(source || {})
  const seen = new Set()
  const labels = []
  const add = raw => {
    const t = String(raw ?? '').trim()
    if (!t) return
    const k = normalizeLabel(t)
    if (seen.has(k)) return
    seen.add(k)
    labels.push(t)
  }
  for (const x of source?.rejection_highlight_sections || []) add(x)
  for (const x of source?.rejection_highlight_fields || []) add(x)
  for (const it of source?.rejection_feedback_items || []) {
    if (it?.label) add(it.label)
  }
  return {
    sectionCount: rs.sections.size,
    fieldCount: rs.fields.size,
    labels,
    tooltip: labels.length ? labels.join(' · ') : '',
  }
}

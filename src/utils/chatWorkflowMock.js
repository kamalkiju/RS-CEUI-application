/**
 * Mock chat workflow logic (no backend). Parses user text and returns simulated AI results.
 */

const DOC_ID_RE = /\b(K-[A-Za-z0-9]+)\b/

export function extractDocumentId(text, docs = []) {
  const m = String(text || '').match(DOC_ID_RE)
  if (m) return m[1]
  const t = String(text || '').toLowerCase()
  for (const d of docs) {
    const sub = (d.sub || '').toLowerCase()
    if (sub && t.includes(sub.slice(0, Math.min(24, sub.length)))) return d.id
  }
  return null
}

/** User message has substantive change request (not only a title/id). */
export function hasChangeIntent(text) {
  const s = String(text || '').toLowerCase()
  if (s.length < 12) return false
  const keywords =
    /update|change|edit|add|remove|fix|section|field|fee|date|contract|basic|payment|offering|reject|comment|highlight|revise|replace|set |new |delete/i
  return keywords.test(s)
}

export function defaultChatSummary(doc) {
  if (!doc) return 'Document processed.'
  return `Applied your requested updates on “${doc.sub || doc.id}”. Review highlighted sections before submitting.`
}

/** Simulated sections/fields the assistant “changed” for demo highlights. */
export function inferSimulatedPocPatches(text) {
  const s = String(text || '').toLowerCase()
  const sections = []
  const fields = []
  if (/basic|title|document name|activation|contract/i.test(s)) {
    sections.push('Basic Information')
    if (/title|name/i.test(s)) fields.push('Document title')
    if (/activation|date/i.test(s)) fields.push('Contract activation date')
  }
  if (/payment|billing|invoice/i.test(s)) {
    sections.push('Payment & Billing Terms')
    fields.push('Payment terms')
  }
  if (/fee|standard fee/i.test(s)) {
    sections.push('Standard fees (selected)')
    fields.push('Active fee set')
  }
  if (/offering|rate|primary/i.test(s)) {
    sections.push('Configured offerings')
    fields.push('Primary offering')
  }
  if (/service categor|solid waste|recycl/i.test(s)) {
    sections.push('Solid Waste')
    fields.push('Category notes')
  }
  if (!sections.length && !fields.length) {
    sections.push('Basic Information')
    fields.push('Document title', 'Review notes')
  }
  return {
    sections: [...new Set(sections)],
    fields: [...new Set(fields)],
  }
}

export async function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

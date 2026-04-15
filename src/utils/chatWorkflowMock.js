/**
 * Mock chat workflow logic (no backend). Parses user text and returns simulated AI results.
 */

const DOC_ID_RE = /\b(K-[A-Za-z0-9]+)\b/

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Ops Agent chat: duplicate + document review date (demo applies only this field on the document). */
export function isDuplicateReviewDateWorkflow(text) {
  const s = norm(text)
  if (!s.includes('duplicate')) return false
  if (!/document review date|review date/.test(s)) return false
  return /25|april|2016/.test(s)
}

export const OPS_REVIEW_DATE_DISPLAY = '25 April 2016'

export function extractDocumentId(text, docs = []) {
  const m = String(text || '').match(DOC_ID_RE)
  if (m) {
    const id = m[1]
    if (docs.some(d => d.id === id)) return id
  }
  const t = norm(text)
  for (const d of docs) {
    const sub = norm(d.sub || '')
    if (!sub) continue
    if (t.includes(sub.slice(0, Math.min(24, sub.length)))) return d.id
    if (sub.length >= 8 && t.includes(sub.slice(0, Math.min(12, sub.length)))) return d.id
  }
  return null
}

/**
 * Longest substring of catalog title (or whole title) that appears in the user message, or user phrase contained in title.
 */
function matchByTitlePhrase(text, docs = []) {
  const t = norm(text)
  if (t.length < 3) return null
  let bestId = null
  let bestScore = 0
  for (const d of docs) {
    const sub = norm(d.sub || '')
    if (!sub) continue
    let score = 0
    if (t.length >= 4 && sub.includes(t)) score = Math.max(score, 55 + Math.min(t.length, 40))
    if (sub.length >= 6 && t.includes(sub)) score = Math.max(score, 70 + Math.min(sub.length, 30))
    const maxLen = Math.min(sub.length, 64)
    for (let len = maxLen; len >= 5; len--) {
      for (let i = 0; i + len <= sub.length; i++) {
        const chunk = sub.slice(i, i + len)
        if (t.includes(chunk)) score = Math.max(score, len * 2 + (i === 0 ? 4 : 0))
      }
    }
    const area = norm(d.area || '')
    if (area.length > 5) {
      const ap = area.slice(0, Math.min(24, area.length))
      if (t.includes(ap)) score += 12
    }
    if (score > bestScore) {
      bestScore = score
      bestId = d.id
    }
  }
  return bestScore >= 10 ? { docId: bestId, matchSource: 'title_phrase' } : null
}

/**
 * Fuzzy match: tokens from document title appear in the message (shorter tokens allowed for casual queries).
 */
function fuzzyMatchDocumentMeta(text, docs = []) {
  const t = norm(text)
  if (!t) return null
  let bestId = null
  let bestScore = 0
  for (const d of docs) {
    const tokens = String(d.sub || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(x => x.length >= 4)
    const uniq = [...new Set(tokens)]
    let score = 0
    for (const tok of uniq) {
      if (t.includes(tok)) score += tok.length >= 8 ? 4 : 2
    }
    if (String(d.area || '').length > 4 && t.includes(String(d.area).toLowerCase().slice(0, 14))) score += 3
    if (score > bestScore) {
      bestScore = score
      bestId = d.id
    }
  }
  return bestScore >= 2 ? { docId: bestId, matchSource: 'fuzzy_tokens' } : null
}

/**
 * Prefer sidebar selection, then explicit ID / title substring, then title phrase overlap, then fuzzy tokens.
 * @returns {{ docId: string | null, matchSource: 'menu' | 'explicit_id' | 'title_prefix' | 'title_phrase' | 'fuzzy_tokens' | null }}
 */
export function resolveChatDocumentIdWithMeta(text, selectedDocId, docs = []) {
  if (selectedDocId && docs.some(d => d.id === selectedDocId)) {
    return { docId: selectedDocId, matchSource: 'menu' }
  }
  const raw = String(text || '')
  const idMatch = raw.match(DOC_ID_RE)
  if (idMatch) {
    const id = idMatch[1]
    if (docs.some(d => d.id === id)) return { docId: id, matchSource: 'explicit_id' }
  }
  const byExtract = extractDocumentId(text, docs)
  if (byExtract) {
    return { docId: byExtract, matchSource: idMatch ? 'explicit_id' : 'title_prefix' }
  }
  const phrase = matchByTitlePhrase(text, docs)
  if (phrase) return phrase
  const fuzzy = fuzzyMatchDocumentMeta(text, docs)
  if (fuzzy) return fuzzy
  return { docId: null, matchSource: null }
}

/**
 * Prefer sidebar selection, then explicit ID / title substring, then fuzzy title match.
 */
export function resolveChatDocumentId(text, selectedDocId, docs = []) {
  return resolveChatDocumentIdWithMeta(text, selectedDocId, docs).docId
}

/**
 * Human-readable line for chat: how the catalog document was chosen from free text.
 */
export function formatChatDocumentResolutionLine(userLine, doc, matchSource) {
  if (!doc) return ''
  const snippet = String(userLine || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 220)
  const safe = snippet || '(empty)'
  const label = doc.sub || doc.id
  switch (matchSource) {
    case 'menu':
      return `**Initialization** — Using the **catalog** row selected in the picker: **${label}** (\`${doc.id}\`).\n\n**Your message:** “${safe}”\n`
    case 'explicit_id':
      return `**Initialization** — Matched **catalog ID** in your message: **${label}** (\`${doc.id}\`).\n\n**Your message:** “${safe}”\n`
    case 'title_prefix':
      return `**Initialization** — Matched a **title prefix** from your text: **${label}** (\`${doc.id}\`).\n\n**Your message:** “${safe}”\n`
    case 'title_phrase':
      return `**Initialization** — Matched **document name / phrase** overlap: **${label}** (\`${doc.id}\`).\n\n**Your message:** “${safe}”\n`
    case 'fuzzy_tokens':
      return `**Initialization** — Matched **keywords** against catalog titles (best fit): **${label}** (\`${doc.id}\`).\n\n**Your message:** “${safe}”\n`
    default:
      return `**Initialization** — **${label}** (\`${doc.id}\`).\n\n**Your message:** “${safe}”\n`
  }
}

/** When the message does not map to wizard areas, use a small default patch so the chat session always has highlight targets. */
export function ensurePocChatPatches(patches) {
  const has = (patches?.sections?.length || 0) + (patches?.fields?.length || 0) > 0
  if (has) {
    return {
      sections: [...new Set(patches.sections || [])],
      fields: [...new Set(patches.fields || [])],
      usedFallback: false,
    }
  }
  return {
    sections: ['Basic Information'],
    fields: ['Document title', 'Review notes'],
    usedFallback: true,
  }
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

/**
 * Infer one focused patch per clause (split on “and” / commas). Uses text after an em/en dash when present (e.g. “K-5031 — update fees”).
 * First matching domain wins per clause so unrelated keywords do not light every tab.
 */
function inferFromSingleClause(clause) {
  const s = String(clause || '')
    .toLowerCase()
    .trim()
  if (!s) return { sections: [], fields: [] }
  if (/fee|standard fee|erf|franchise fee/i.test(s)) {
    return { sections: ['Standard fees (selected)'], fields: ['Active fee set'] }
  }
  if (/payment|billing|invoice|net\s*\d+/i.test(s)) {
    return { sections: ['Payment & Billing Terms'], fields: ['Payment terms'] }
  }
  if (/offering|rate|primary/i.test(s)) {
    return { sections: ['Configured offerings'], fields: ['Primary offering'] }
  }
  if (/service categor|solid waste|recycl/i.test(s)) {
    return { sections: ['Solid Waste'], fields: ['Category notes'] }
  }
  if (/basic|title|document name|activation|contract/i.test(s)) {
    const sections = ['Basic Information']
    const fields = []
    if (/title|name/i.test(s)) fields.push('Document title')
    if (/activation|date/i.test(s)) fields.push('Contract activation date')
    if (!fields.length) fields.push('Review notes')
    return { sections, fields }
  }
  return { sections: [], fields: [] }
}

/** Simulated sections/fields inferred from the user message for chat preview highlights. */
export function inferSimulatedPocPatches(text) {
  const raw = String(text || '').trim()
  if (isDuplicateReviewDateWorkflow(raw)) {
    return {
      sections: ['Basic Information'],
      fields: ['Document review date'],
    }
  }
  let body = raw
  const dashParts = raw.split(/\s*[—–]\s*/)
  if (dashParts.length >= 2) body = dashParts.slice(1).join(' — ').trim()
  const chunks = body
    .split(/\s+,\s*|\s+and\s+/i)
    .map(c => c.trim())
    .filter(Boolean)
  const useChunks = chunks.length ? chunks : [body]
  const sections = []
  const fields = []
  for (const ch of useChunks) {
    const p = inferFromSingleClause(ch)
    sections.push(...p.sections)
    fields.push(...p.fields)
  }
  return {
    sections: [...new Set(sections)],
    fields: [...new Set(fields)],
  }
}

export async function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * True when the reviewer message is asking to see POC’s changes / updates / resubmission.
 */
export function wantsPocChangeSummary(text) {
  const s = String(text || '').toLowerCase().trim()
  if (s.length === 0) return true
  return /poc|resubmit|resubmission|change|update|review|highlight|section|field|what changed|delta|diff|since rejection|after reject|show me|see the|need to see|what did|list of|which field|which section|mens/i.test(
    s,
  )
}

/**
 * Real POC update metadata from the document (BUFM/KMT chat). No simulation.
 */
export function getPocUpdateDataFromDoc(doc) {
  if (!doc) {
    return { sections: [], fields: [], note: '', hasAny: false }
  }
  const sections = Array.isArray(doc.poc_updated_sections)
    ? doc.poc_updated_sections.map(x => String(x).trim()).filter(Boolean)
    : []
  const fields = Array.isArray(doc.poc_updated_fields)
    ? doc.poc_updated_fields.map(x => String(x).trim()).filter(Boolean)
    : []
  const note = String(doc.pocResubmissionNote || '').trim()
  const hasAny = sections.length > 0 || fields.length > 0 || note.length > 0
  return { sections, fields, note, hasAny }
}

/**
 * Markdown-style text for chat: only sections / fields / note actually stored on the document.
 */
export function formatPocChangesForChat(doc, { roleLabel = 'POC' } = {}) {
  const { sections, fields, note, hasAny } = getPocUpdateDataFromDoc(doc)
  const title = doc ? `**${doc.sub || doc.id}** (\`${doc.id}\`)` : '**Document**'
  if (!hasAny) {
    return `${title}\n\nNo **${roleLabel} update metadata** on this document yet (no \`poc_updated_sections\` / \`poc_updated_fields\` / resubmission note). After a POC resubmits following rejection, those lists populate and highlights appear on the document view.\n\nYou can still open the document to review the full content and any reviewer flags.`
  }
  let out = `${title}\n\n**Sections ${roleLabel} updated**\n`
  out += sections.length ? sections.map(s => `• ${s}`).join('\n') : '• — (none listed)'
  out += `\n\n**Fields ${roleLabel} updated**\n`
  out += fields.length ? fields.map(f => `• ${f}`).join('\n') : '• — (none listed)'
  if (note) {
    out += `\n\n**${roleLabel} resubmission note**\n> ${note}`
  }
  out +=
    '\n\nOpen the document below — **green** styling marks POC-touched areas; **orange** marks reviewer-flagged items where applicable.'
  return out
}

/**
 * BUFM chat: review-date before/after (when stored) + full POC change lists (includes document title).
 */
export function formatBufmChatPocChangeSummary(doc) {
  if (!doc) return ''
  const fields = doc.poc_updated_fields || []
  const hasReviewDate = fields.some(f => /document review date/i.test(String(f)))
  const before = doc.poc_review_date_before
  const after = doc.readOnlyWizard?.step1?.reviewDate
  const dateBlock =
    hasReviewDate && (before != null || after)
      ? `**Document review date (POC)**\n**Previous:** ${before ?? '—'}\n**Updated to:** **${after ?? '—'}**`
      : ''
  const body = formatPocChangesForChat(doc, { roleLabel: 'POC' })
  return dateBlock ? `${dateBlock}\n\n---\n\n${body}` : body
}

/**
 * KMT chat: POC before/after, BUFM comments / flagged sections, then KMT context.
 */
export function formatKmtChatReviewSummary(doc) {
  if (!doc) return ''
  const pocBlock = formatBufmChatPocChangeSummary(doc)
  const bufmParts = []
  if (doc.rejection_comment_BUFM?.trim()) {
    bufmParts.push(`**BUFM comment (prior review):** ${String(doc.rejection_comment_BUFM).trim()}`)
  }
  const hs = doc.rejection_highlight_sections
  if (Array.isArray(hs) && hs.length) {
    bufmParts.push(`**Sections BUFM flagged (before POC resubmission):**\n${hs.map(s => `• ${s}`).join('\n')}`)
  }
  const hf = doc.rejection_highlight_fields
  if (Array.isArray(hf) && hf.length) {
    bufmParts.push(`**Fields BUFM flagged:**\n${hf.map(s => `• ${s}`).join('\n')}`)
  }
  const bufmBlock =
    bufmParts.length > 0 ? `### BUFM review (reference)\n\n${bufmParts.join('\n\n')}` : ''
  const kmtCtx = formatKmtReviewerContext(doc)?.trim()
  const parts = [`### POC updates\n\n${pocBlock}`]
  if (bufmBlock) parts.push(bufmBlock)
  if (kmtCtx) parts.push(kmtCtx)
  return parts.join('\n\n---\n\n')
}

/**
 * Payload for navigation: merge real POC highlights for the viewer session.
 */
export function buildChatWorkflowExtrasFromDoc(doc) {
  const { sections, fields, note, hasAny } = getPocUpdateDataFromDoc(doc)
  if (!hasAny) return null
  return {
    sections,
    fields,
    summary: note || 'POC-updated sections and fields from document metadata.',
  }
}

/**
 * BUFM/KMT chat → document navigation: prefer stored POC lists on the document; if none, infer highlight targets from the user message.
 */
export function buildNavigationExtrasForReviewer(doc, userLine = '') {
  const real = buildChatWorkflowExtrasFromDoc(doc)
  if (real) return real
  const fb = ensurePocChatPatches(inferSimulatedPocPatches(String(userLine || '')))
  return {
    sections: fb.sections,
    fields: fb.fields,
    summary:
      'No POC update lists are stored on this document yet; highlight targets are inferred from your message for this review visit.',
  }
}

/** Extra lines for KMT chat (BUFM / KMT comments on file). */
export function formatKmtReviewerContext(doc) {
  if (!doc) return ''
  const parts = []
  if (doc.approved_by_BUFM) {
    parts.push('**BUFM:** Approved toward KMT.')
  }
  if (doc.rejection_comment_BUFM) {
    parts.push(`**BUFM comment:** ${String(doc.rejection_comment_BUFM).trim()}`)
  }
  if (doc.rejection_comment_KMT) {
    parts.push(`**KMT (prior rejection):** ${String(doc.rejection_comment_KMT).trim()}`)
  }
  if (!parts.length) return ''
  return `\n\n---\n\n${parts.join('\n\n')}`
}

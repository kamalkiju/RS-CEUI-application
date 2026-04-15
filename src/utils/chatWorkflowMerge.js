/**
 * Merge chat-assistant simulated highlights into a document for one session (visual only).
 * @param {object | null} doc
 * @param {{ sections?: string[], fields?: string[], summary?: string } | null | undefined} extras
 */
export function mergeChatWorkflowHighlights(doc, extras) {
  if (!doc) return doc
  if (!extras || (!extras.sections?.length && !extras.fields?.length)) return doc
  const uniq = arr => [...new Set((arr || []).map(s => String(s).trim()).filter(Boolean))]
  return {
    ...doc,
    poc_updated_sections: uniq([...(doc.poc_updated_sections || []), ...(extras.sections || [])]),
    poc_updated_fields: uniq([...(doc.poc_updated_fields || []), ...(extras.fields || [])]),
  }
}

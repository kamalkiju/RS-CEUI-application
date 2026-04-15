/**
 * Merge chat-assistant simulated highlights into a document for one session (visual only).
 * @param {object | null} doc
 * @param {{ sections?: string[], fields?: string[], summary?: string } | null | undefined} extras
 * @param {{ replacePocHighlights?: boolean }} [options] When true, POC lists come only from `extras` (no union with stored doc) so chat shows just this session’s targets.
 */
export function mergeChatWorkflowHighlights(doc, extras, options = {}) {
  if (!doc) return doc
  if (!extras) return doc
  const uniq = arr => [...new Set((arr || []).map(s => String(s).trim()).filter(Boolean))]
  if (options.replacePocHighlights) {
    return {
      ...doc,
      poc_updated_sections: uniq(extras.sections || []),
      poc_updated_fields: uniq(extras.fields || []),
    }
  }
  if (!extras.sections?.length && !extras.fields?.length) return doc
  return {
    ...doc,
    poc_updated_sections: uniq([...(doc.poc_updated_sections || []), ...(extras.sections || [])]),
    poc_updated_fields: uniq([...(doc.poc_updated_fields || []), ...(extras.fields || [])]),
  }
}

import { normalizeLabel } from './reviewFeedback.js'

/**
 * Flat snapshot of RSA submission fields for diffing after rejection (same labels as RsaSubmissionDetailView).
 */
export function buildRsaSubmissionSnapshot(sub) {
  const rm = sub?.requestMeta || {}
  const sa = sub?.serviceArea || {}
  const entries = []
  const push = (sectionTitle, fieldLabel, value) => {
    const v = value === undefined || value === null ? '' : String(value)
    entries.push({ sectionTitle, fieldLabel, value: v })
  }

  push('Task details', 'Creator Name', sub?.pocName || rm.requestorName || '—')
  push('Task details', 'Creator Email', rm.requestorEmail || '—')
  push('Task details', 'Created Date', sub?.updated || '—')

  push('Requestor information', 'Requestor name', rm.requestorName || sub?.pocName || '—')
  push('Requestor information', 'Requestor email', rm.requestorEmail || '—')
  push('Requestor information', 'Requested on behalf of', rm.onBehalfOf || '—')
  push('Requestor information', 'Reason for request', rm.reasonForRequest || '—')

  push('Service area details', 'Service area name', sa.name || '—')
  push('Service area details', 'Polygon ID', sa.polygonId || '—')
  push('Service area details', 'Division', sa.division || '—')
  push('Service area details', 'Lawson ID', sa.lawsonId || '—')
  push('Service area details', 'Effective Date', sa.effectiveDate || '—')
  push('Service area details', 'Expiration Date', sa.expiryDate || '—')

  push('Request metadata', 'Request ID', sub?.id || '—')
  push('Request metadata', 'Request Type', sub?.requestType || 'Create Service Area')
  push('Request metadata', 'Version', sub?.version || 'v1.0')
  push('Request metadata', 'Status', sub?.status?.replace(/_/g, ' ') || '—')

  push('Categories', 'Product configuration', JSON.stringify(sub?.productTabs || {}))
  push('Pricing & product', 'Payload fingerprint', JSON.stringify({ p: sub?.pricing, r: sub?.product }))

  return { capturedAt: new Date().toISOString(), entries }
}

export function diffRsaSubmissionSnapshots(baseline, sub) {
  if (!baseline?.entries?.length) return { sections: [], fields: [] }
  const current = buildRsaSubmissionSnapshot(sub)
  const map = new Map()
  for (const e of current.entries) {
    const key = `${normalizeLabel(e.sectionTitle)}|${normalizeLabel(e.fieldLabel)}`
    map.set(key, e.value)
  }
  const changedSections = new Set()
  const changedFields = new Set()
  for (const e of baseline.entries) {
    const key = `${normalizeLabel(e.sectionTitle)}|${normalizeLabel(e.fieldLabel)}`
    const prev = e.value === undefined || e.value === null ? '' : String(e.value)
    const next = map.has(key) ? map.get(key) : ''
    if (prev !== next) {
      changedSections.add(e.sectionTitle)
      changedFields.add(e.fieldLabel)
    }
  }
  return { sections: [...changedSections], fields: [...changedFields] }
}

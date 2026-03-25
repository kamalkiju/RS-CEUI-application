/**
 * BUFM / POC document workflow labels for list views.
 */

export function getWorkflowStage(doc) {
  const s = String(doc?.status ?? 'draft')
  if (s === 'draft' || s === 'Draft') return { key: 'draft', label: 'Draft' }
  if (s === 'Pending_BUFM') return { key: 'pending_bufm', label: 'Sent for approval (BUFM)' }
  if (s === 'Pending_KMT') return { key: 'pending_kmt', label: 'Sent for approval (KMT)' }
  if (s === 'approved') return { key: 'approved', label: 'Approved' }
  if (s === 'Rejected_BUFM' || s === 'rejected_bufm') return { key: 'rejected_bufm', label: 'Rejected (BUFM)' }
  if (s === 'Rejected_KMT' || s === 'rejected_kmt') return { key: 'rejected_kmt', label: 'Rejected (KMT)' }
  if (s === 'pending') return { key: 'pending', label: 'In review' }
  return { key: s, label: s }
}

export function getDocumentProgressPercent(doc) {
  if (doc?.status === 'approved') return 100
  if (typeof doc?.completionPercent === 'number') return doc.completionPercent
  if (doc?.status === 'Pending_BUFM' || doc?.status === 'Pending_KMT') return Math.max(doc?.completionPercent ?? 0, 85)
  if (doc?.status === 'draft' || doc?.status === 'Draft') return doc?.completionPercent ?? 15
  return doc?.completionPercent ?? 0
}

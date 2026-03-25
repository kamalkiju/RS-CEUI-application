/**
 * Role-based status labels for knowledge documents.
 * POC: Approved + BUFM/KMT approval → display "Published" (backend remains approved).
 */

const BASE_LABELS = {
  rejected: 'Rejected',
  rejected_bufm: 'Rejected (BUFM)',
  rejected_kmt: 'Rejected (KMT)',
  Rejected_BUFM: 'Rejected (BUFM)',
  Rejected_KMT: 'Rejected (KMT)',
  Draft: 'Draft',
  Pending_BUFM: 'Pending BUFM',
  Pending_KMT: 'Pending KMT',
  Published: 'Published',
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
}

const ICON_KEYS = {
  rejected_bufm: 'rejected',
  rejected_kmt: 'rejected',
  Rejected_BUFM: 'rejected',
  Rejected_KMT: 'rejected',
  rejected: 'rejected',
  draft: 'draft',
  Draft: 'draft',
  pending: 'pending',
  Pending_BUFM: 'pending',
  Pending_KMT: 'pending',
  approved: 'approved',
  Published: 'approved',
  published: 'approved',
}

/**
 * @param {object} doc
 * @param {string} [userRole]
 * @returns {{ label: string, statusClass: string, iconKey: string }}
 */
export function getDisplayStatus(doc, userRole) {
  const raw = doc?.status ?? 'draft'
  const approvedByBufm = doc?.approved_by_BUFM === true
  const approvedByKmt = doc?.approved_by_KMT === true

  if (
    userRole === 'POC' &&
    raw === 'approved' &&
    (approvedByBufm || approvedByKmt)
  ) {
    return { label: 'Published', statusClass: 'published', iconKey: 'published' }
  }

  const label = BASE_LABELS[raw] ?? raw
  const statusClass =
    raw === 'Rejected_BUFM' || raw === 'rejected_bufm'
      ? 'rejected_bufm'
      : raw === 'Rejected_KMT' || raw === 'rejected_kmt'
        ? 'rejected_kmt'
        : raw
  const iconKey = ICON_KEYS[raw] ?? 'draft'

  return { label, statusClass, iconKey }
}

export function isRejectedTaskStatus(status) {
  if (status == null) return false
  const u = String(status)
  return (
    u === 'rejected_bufm' ||
    u === 'rejected_kmt' ||
    u === 'Rejected_BUFM' ||
    u === 'Rejected_KMT'
  )
}

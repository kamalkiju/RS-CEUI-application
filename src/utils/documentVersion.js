/**
 * Client-side display helpers for document version / case stage (no backend).
 * Prefer doc.version / doc.case_stage when present (API shape).
 */

export function inferDocVersion(doc) {
  if (!doc) return 'V1.0'
  if (doc.version) return doc.version
  const s = doc.status
  if (s === 'draft') return 'V0.3'
  if (s === 'approved') return 'V2.0'
  if (s === 'Pending_BUFM') return 'V1.0'
  if (s === 'Pending_KMT') return 'V1.0'
  if (s === 'Rejected_BUFM' || s === 'Rejected_KMT') return 'V2.0'
  return 'V1.0'
}

/** Human-readable case stage for headers and lists */
export function getCaseStageDisplay(doc) {
  if (!doc) return '—'
  if (doc.case_stage) return formatCaseStageCode(doc.case_stage)
  const s = doc.status
  if (s === 'draft') return 'Draft'
  if (s === 'Pending_BUFM') return 'Pending BUFM'
  if (s === 'Pending_KMT') return 'Pending KMT'
  if (s === 'approved') return 'Approved'
  if (s === 'Rejected_BUFM') return 'Rejected (BUFM)'
  if (s === 'Rejected_KMT') return 'Rejected (KMT)'
  return String(s || '—').replace(/_/g, ' ')
}

const CASE_STAGE_LABELS = {
  Pending_BUFM: 'Pending BUFM',
  Pending_KMT: 'Pending KMT',
  Rejected_BUFM: 'Rejected (BUFM)',
  Rejected_KMT: 'Rejected (KMT)',
  Draft: 'Draft',
  Approved: 'Approved',
}

function formatCaseStageCode(code) {
  const k = String(code)
  if (CASE_STAGE_LABELS[k]) return CASE_STAGE_LABELS[k]
  return k.replace(/_/g, ' ')
}

/** e.g. V2.0 → "Previous Version V1.x" */
export function getPreviousVersionLinkLabel(doc) {
  const v = inferDocVersion(doc)
  const m = v.match(/^V(\d+)\./)
  if (!m) return 'Previous version'
  const major = Math.max(0, parseInt(m[1], 10) - 1)
  if (major <= 0) return 'Previous Version V0.x'
  return `Previous Version V${major}.x`
}

export function bumpMajorVersion(current) {
  const m = String(current || 'V1.0').match(/^V(\d+)\.(\d+)/i)
  if (!m) return 'V2.0'
  return `V${parseInt(m[1], 10) + 1}.0`
}

/**
 * Demo helper: pick another document id to treat as "previous version" (same creator, earlier submission).
 * Optional explicit link: doc.previousVersionDocId
 */
export function resolveMockPreviousDocumentId(doc, allDocs) {
  if (!doc || !Array.isArray(allDocs) || !allDocs.length) return null
  if (doc.previousVersionDocId) return doc.previousVersionDocId
  const uid = doc.createdByUserId
  if (!uid) return null
  const parseTime = d => new Date(d.submittedDate || d.updated || '1970-01-01').getTime()
  const curT = parseTime(doc)
  const siblings = allDocs.filter(d => d.id !== doc.id && d.createdByUserId === uid)
  const older = siblings.filter(s => parseTime(s) < curT)
  if (!older.length) return null
  older.sort((a, b) => parseTime(a) - parseTime(b))
  return older[older.length - 1].id
}

/**
 * Mock timeline for Version History drawer (UI only).
 * When `allDocs` is passed, each entry gets `targetDocId` for navigation (document detail view).
 */
export function buildMockVersionHistory(doc, viewerRole = 'POC', allDocs = null) {
  const v = inferDocVersion(doc)
  const prevId = allDocs ? resolveMockPreviousDocumentId(doc, allDocs) : null
  const selfId = doc?.id
  const entries = []
  entries.push({
    id: 'h1',
    version: 'V1.0',
    title: 'V1.0 Submitted by POC',
    detail: 'Initial submission',
    tone: 'neutral',
  })
  if (doc?.status === 'Rejected_BUFM' || doc?.rejection_comment_BUFM || doc?.bufmRejectDate) {
    entries.push({
      id: 'h2',
      version: 'V1.0',
      title: 'Rejected by BUFM',
      detail: doc.rejection_comment_BUFM || 'BUFM requested changes',
      tone: 'reject',
    })
  } else if (doc?.approved_by_BUFM || doc?.bufmApproveDate) {
    entries.push({
      id: 'h2b',
      version: 'V1.0',
      title: 'Approved by BUFM',
      detail: doc.bufmApproveDate ? `Date: ${doc.bufmApproveDate}` : 'Forwarded to KMT',
      tone: 'ok',
    })
  }
  if (v !== 'V1.0' || doc?.status === 'Rejected_KMT' || doc?.kmtRejectDate) {
    entries.push({
      id: 'h3',
      version: 'V2.0',
      title: 'V2.0 Resubmitted',
      detail: 'POC addressed review comments',
      tone: 'neutral',
    })
  }
  if (doc?.approved_by_BUFM && doc?.status !== 'Rejected_BUFM') {
    entries.push({
      id: 'h4',
      version: v,
      title: 'Approved by BUFM',
      detail: '✓',
      tone: 'ok',
    })
  }
  if (doc?.status === 'Pending_KMT') {
    entries.push({
      id: 'h5',
      version: v,
      title: 'Pending KMT',
      detail: 'Awaiting KMT decision',
      tone: 'pending',
    })
  }
  if (doc?.status === 'approved' || doc?.approved_by_KMT) {
    entries.push({
      id: 'h6',
      version: v,
      title: 'Approved / Final',
      detail: doc.kmtApproveDate ? `KMT: ${doc.kmtApproveDate}` : 'Catalog ready',
      tone: 'ok',
    })
  }
  if (doc?.status === 'Rejected_KMT') {
    entries.push({
      id: 'h7',
      version: v,
      title: 'Rejected by KMT',
      detail: doc.rejection_comment_KMT || 'See comments',
      tone: 'reject',
    })
  }
  if (!allDocs || !selfId) return entries
  return entries.map((e, i) => ({
    ...e,
    targetDocId: i === 0 ? prevId || selfId : selfId,
  }))
}

/**
 * Simulates GET /documents/:id/comments — merged BUFM + KMT timeline, sorted by date.
 */

function parseDate(s) {
  if (!s) return ''
  return String(s)
}

/**
 * @param {object|null} doc
 * @returns {Array<{ comment_text: string, comment_by_role: string, comment_date: string, kind?: string }>}
 */
export function buildCommentTimeline(doc) {
  if (!doc) return []

  const items = []

  items.push({
    comment_text: `Document created${doc.pocName ? ` by ${doc.pocName}` : ''}.`,
    comment_by_role: 'System',
    comment_date: doc.submittedDate || doc.updated,
    kind: 'system_created',
  })

  items.push({
    comment_text: 'POC submitted document for BUFM review.',
    comment_by_role: 'POC',
    comment_date: doc.submittedDate || doc.updated,
    kind: 'poc_submitted',
  })

  for (const p of doc.pulseComments || []) {
    items.push({
      comment_text: p.comment_text,
      comment_by_role: p.comment_by_role || 'BUFM',
      comment_date: p.comment_date,
      comment_by_name: p.comment_by_name,
      kind: p.kind || 'pulse',
    })
  }

  if (
    doc.bufmApproveDate ||
    (doc.approved_by_BUFM && doc.status === 'Pending_KMT') ||
    (doc.approved_by_BUFM && doc.status === 'approved')
  ) {
    items.push({
      comment_text:
        doc.status === 'approved'
          ? 'BUFM approved — forwarded to KMT for final review.'
          : 'BUFM approved — sent to KMT queue.',
      comment_by_role: 'BUFM',
      comment_date: doc.bufmApproveDate || doc.updated,
      kind: 'bufm_approved',
    })
  }

  if (doc.rejection_comment_BUFM) {
    items.push({
      comment_text: doc.rejection_comment_BUFM,
      comment_by_role: 'BUFM',
      comment_date: doc.bufmRejectDate || doc.updated,
      kind: 'bufm_reject',
    })
  }

  if (doc.pocResubmitDate) {
    items.push({
      comment_text: doc.pocResubmitNote || 'POC resubmitted after BUFM feedback.',
      comment_by_role: 'POC',
      comment_date: doc.pocResubmitDate,
      kind: 'poc_resubmit',
    })
  }

  if (doc.rejection_comment_KMT) {
    items.push({
      comment_text: doc.rejection_comment_KMT,
      comment_by_role: 'KMT',
      comment_date: doc.kmtRejectDate || doc.updated,
      kind: 'kmt_reject',
    })
  }

  if (doc.approved_by_KMT && doc.status === 'approved') {
    items.push({
      comment_text: 'KMT approved — document published.',
      comment_by_role: 'KMT',
      comment_date: doc.kmtApproveDate || doc.updated,
      kind: 'kmt_approved',
    })
  }

  const seen = new Set()
  const deduped = []
  for (const row of items) {
    const key = `${row.kind}-${row.comment_date}-${row.comment_text?.slice(0, 40)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }

  return deduped.sort((a, b) => parseDate(a.comment_date).localeCompare(parseDate(b.comment_date)))
}

/**
 * Simulated network fetch for comments API.
 */
export function fetchDocumentComments(documentId, getDocumentById) {
  return new Promise(resolve => {
    window.setTimeout(() => {
      const doc = getDocumentById(documentId)
      resolve(buildCommentTimeline(doc))
    }, 180)
  })
}

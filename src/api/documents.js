/**
 * Documents API — query builders for list endpoints.
 * POC/BUFM use local DocContext; wire fetch() to these URLs when backend is available.
 *
 * Simulated today (see codebase):
 * - GET /documents?status=Pending_BUFM — BufmReviewQueue via listDocumentsByStatus
 * - GET /documents/:id/comments — fetchDocumentComments() in utils/bufmDocumentComments.js
 * - PATCH /documents/:id — useDocs().updateDoc (BufmDocumentView approve/reject)
 */

const STATUS_REJECTED_TASKS = 'Rejected_BUFM,Rejected_KMT'

/**
 * GET /documents?status=Rejected_BUFM,Rejected_KMT
 */
export function getRejectedTasksDocumentsUrl(basePath = '/documents') {
  const q = new URLSearchParams({ status: STATUS_REJECTED_TASKS })
  return `${basePath}?${q.toString()}`
}

export { STATUS_REJECTED_TASKS }

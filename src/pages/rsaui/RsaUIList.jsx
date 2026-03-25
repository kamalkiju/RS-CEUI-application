import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

const STATUS_CLASS = {
  [RSA_STATUS.Draft]: 'kd-status draft',
  [RSA_STATUS.Pending_BUFM]: 'kd-status pending',
  [RSA_STATUS.Rejected_BUFM]: 'kd-status rejected_bufm',
  [RSA_STATUS.Pending_KMT]: 'kd-status pending',
  [RSA_STATUS.Rejected_KMT]: 'kd-status rejected_kmt',
  [RSA_STATUS.Published]: 'kd-status approved',
}

/** Single queues: pending BUFM+KMT and rejected BUFM+KMT are mingled in one list each. */
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'awaiting', label: 'Awaiting approval' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'approved', label: 'Approved' },
]

function matchesFilter(sub, filterId) {
  switch (filterId) {
    case 'all':
      return true
    case 'draft':
      return sub.status === RSA_STATUS.Draft
    case 'awaiting':
      return sub.status === RSA_STATUS.Pending_BUFM || sub.status === RSA_STATUS.Pending_KMT
    case 'rejected':
      return sub.status === RSA_STATUS.Rejected_BUFM || sub.status === RSA_STATUS.Rejected_KMT
    case 'approved':
      return sub.status === RSA_STATUS.Published
    default:
      return true
  }
}

/** Human-readable queue for mingled lists (BUFM vs KMT). */
function approvalStageLabel(sub) {
  switch (sub.status) {
    case RSA_STATUS.Pending_BUFM:
      return 'Awaiting BUFM'
    case RSA_STATUS.Pending_KMT:
      return 'Awaiting KMT'
    case RSA_STATUS.Rejected_BUFM:
      return 'Rejected by BUFM'
    case RSA_STATUS.Rejected_KMT:
      return 'Rejected by KMT'
    case RSA_STATUS.Published:
      return 'Approved / published'
    case RSA_STATUS.Draft:
      return '—'
    default:
      return '—'
  }
}

function rejectionPreview(sub) {
  if (sub.status === RSA_STATUS.Rejected_BUFM && sub.rejection_comment_BUFM) {
    return sub.rejection_comment_BUFM
  }
  if (sub.status === RSA_STATUS.Rejected_KMT && sub.rejection_comment_KMT) {
    return sub.rejection_comment_KMT
  }
  return ''
}

function truncate(text, max = 96) {
  if (!text) return ''
  const t = String(text).trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export default function RsaUIList() {
  const navigate = useNavigate()
  const { submissions, createDraft, cloneSubmission, removeSubmission } = useRsaUI()
  const [filterId, setFilterId] = useState('all')

  const filtered = useMemo(() => {
    const list = submissions.filter(s => matchesFilter(s, filterId))
    // Stable order: awaiting = BUFM queue first, then KMT; rejected = BUFM then KMT; else by updated desc
    if (filterId === 'awaiting') {
      const rank = (s) => (s.status === RSA_STATUS.Pending_BUFM ? 0 : 1)
      return [...list].sort((a, b) => rank(a) - rank(b) || String(b.updated).localeCompare(String(a.updated)))
    }
    if (filterId === 'rejected') {
      const rank = (s) => (s.status === RSA_STATUS.Rejected_BUFM ? 0 : 1)
      return [...list].sort((a, b) => rank(a) - rank(b) || String(b.updated).localeCompare(String(a.updated)))
    }
    return [...list].sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
  }, [submissions, filterId])

  const startNew = () => {
    const id = createDraft()
    navigate(`/rsaui/service-area?submission=${encodeURIComponent(id)}&mode=edit`)
  }

  const open = (id, mode) => {
    navigate(`/rsaui/service-area?submission=${encodeURIComponent(id)}&mode=${mode}`)
  }

  const handleClone = (id) => {
    const newId = cloneSubmission(id)
    if (newId) {
      navigate(`/rsaui/service-area?submission=${encodeURIComponent(newId)}&mode=edit`)
    }
  }

  const handleDelete = (sub) => {
    if (sub.status !== RSA_STATUS.Draft) return
    if (!window.confirm(`Delete draft ${sub.id}? This cannot be undone.`)) return
    removeSubmission(sub.id)
  }

  return (
    <Layout>
      <main className="kd-main rsa-ui-list-page">
        <div className="kd-page-header">
          <div>
            <h1 className="kd-page-title">RSAUI</h1>
            <p className="kd-page-sub">
              Drafts and approved RSAUI records; items awaiting BUFM or KMT appear together under Awaiting approval; all rejections under Rejected.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={startNew}>
            + New RSAUI submission
          </button>
        </div>

        <div className="rsa-ui-list-filters" role="tablist" aria-label="RSAUI document lists">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filterId === f.id}
              className={`rsa-ui-list-filter${filterId === f.id ? ' rsa-ui-list-filter--active' : ''}`}
              onClick={() => setFilterId(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="kd-table-card rsa-ui-list-table-wrap">
          {filtered.length === 0 ? (
            <div className="kd-empty">
              <p>No submissions in this view. Change the filter or create a new submission.</p>
            </div>
          ) : (
            <div className="rsa-ui-table-scroll">
              <table className="kd-table rsa-ui-table-full">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Service area</th>
                    <th>Status</th>
                    <th>Approval stage</th>
                    <th>Rejection / notes</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(sub => {
                    const comment = rejectionPreview(sub)
                    return (
                      <tr key={sub.id}>
                        <td><strong>{sub.id}</strong></td>
                        <td>{sub.serviceArea?.name || '—'}</td>
                        <td>
                          <span className={STATUS_CLASS[sub.status] || 'kd-status draft'}>{sub.status}</span>
                        </td>
                        <td className="rsa-ui-list-stage">{approvalStageLabel(sub)}</td>
                        <td className="rsa-ui-list-comment" title={comment || undefined}>
                          {comment ? truncate(comment) : '—'}
                        </td>
                        <td>{sub.updated}</td>
                        <td className="kd-actions rsa-ui-list-actions">
                          <button type="button" className="kd-action-btn" title="View" onClick={() => open(sub.id, 'view')}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          <button type="button" className="kd-action-btn" title="Edit" onClick={() => open(sub.id, 'edit')}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button type="button" className="kd-action-btn" title="Clone as new draft" onClick={() => handleClone(sub.id)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                          {sub.status === RSA_STATUS.Draft && (
                            <button type="button" className="kd-action-btn rsa-ui-list-delete" title="Delete draft" onClick={() => handleDelete(sub)}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </Layout>
  )
}

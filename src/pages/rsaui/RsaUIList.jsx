import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft Tasks' },
  { id: 'awaiting', label: 'Awaiting Approval' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'approved', label: 'Approved' },
  { id: 'expiry', label: 'Expiry Queue' },
]

const FILTER_IDS = new Set(FILTERS.map(f => f.id))

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
    case 'expiry': {
      const exp = sub.serviceArea?.expiryDate
      if (!exp || sub.status !== RSA_STATUS.Published) return false
      const diff = Math.ceil((new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return diff <= 30
    }
    default:
      return true
  }
}

function isExpiryQueueRow(sub) {
  return matchesFilter(sub, 'expiry')
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

const BtnView = ({ onClick }) => (
  <button type="button" className="kd-action-btn" title="View details" onClick={onClick}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  </button>
)

const BtnEdit = ({ onClick }) => (
  <button type="button" className="kd-action-btn" title="Edit" onClick={onClick}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  </button>
)

const BtnClone = ({ onClick }) => (
  <button type="button" className="kd-action-btn" title="Clone as new draft" onClick={onClick}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
  </button>
)

export default function RsaUIList({ syncTabToUrl = false }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { submissions, createDraft, cloneSubmission, removeSubmission, getSubmission, submitToBufm } = useRsaUI()
  const tabFromUrl = searchParams.get('tab')
  const initialFilter = syncTabToUrl && tabFromUrl && FILTER_IDS.has(tabFromUrl) ? tabFromUrl : 'all'
  const [filterId, setFilterId] = useState(initialFilter)

  useEffect(() => {
    if (!syncTabToUrl) return
    if (tabFromUrl && FILTER_IDS.has(tabFromUrl)) {
      setFilterId(tabFromUrl)
    }
  }, [syncTabToUrl, tabFromUrl])

  const setFilter = next => {
    setFilterId(next)
    if (syncTabToUrl) {
      setSearchParams({ tab: FILTER_IDS.has(next) ? next : 'all' }, { replace: true })
    }
  }

  const filtered = useMemo(() => {
    const list = [...submissions]
    return list.sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
  }, [submissions])

  const visibleRows = useMemo(() => filtered.slice(0, 10), [filtered])

  const openView = (id, fromTab) => {
    const q = new URLSearchParams({ submission: id, mode: 'view' })
    if (fromTab) q.set('from', fromTab)
    navigate(`/rsaui/poc/create/view?${q.toString()}`)
  }

  const openEdit = id => {
    navigate(`/rsaui/poc/create/select?submission=${encodeURIComponent(id)}&mode=edit`)
  }

  const openEditConfigure = id => {
    navigate(`/rsaui/poc/create/configure?submission=${encodeURIComponent(id)}&mode=edit`)
  }

  const handleClone = id => {
    const newId = cloneSubmission(id)
    if (newId) {
      navigate(`/rsaui/poc/create/select?submission=${encodeURIComponent(newId)}&mode=edit`)
    }
  }

  const handleDelete = subRow => {
    if (subRow.status !== RSA_STATUS.Draft) return
    if (!window.confirm(`Delete draft ${subRow.id}? This cannot be undone.`)) return
    removeSubmission(subRow.id)
  }

  const sendForApproval = subRow => {
    const s = getSubmission(subRow.id)
    if (!s) return
    if (!window.confirm('Send this request for BUFM approval?')) return
    const rm = s.requestMeta || {}
    submitToBufm(s.id, {
      serviceArea: s.serviceArea,
      pricing: s.pricing,
      product: s.product,
      productTabs: s.productTabs,
      requestMeta: s.requestMeta,
      pocName: s.pocName || rm.requestorName,
      assignedBufmReviewer: s.assignedBufmReviewer || rm.assignedBUFM || 'Jane Wilson',
    })
    window.alert('✓ Sent for approval')
    navigate('/rsaui/poc/document-review?tab=awaiting')
  }

  const startNew = () => {
    const id = createDraft()
    navigate(`/rsaui/poc/create?submission=${encodeURIComponent(id)}&mode=edit`)
  }

  /** Which row actions to show depends on list tab + row status. */
  function renderRowActions(sub) {
    const st = sub.status
    const pending = st === RSA_STATUS.Pending_BUFM || st === RSA_STATUS.Pending_KMT
    const rejected = st === RSA_STATUS.Rejected_BUFM || st === RSA_STATUS.Rejected_KMT
    const published = st === RSA_STATUS.Published
    const draft = st === RSA_STATUS.Draft

    const fromKey = filterId

    const awaitingOnly = fromKey === 'awaiting' || (fromKey === 'all' && pending)
    if (awaitingOnly) {
      return (
        <>
          <BtnView onClick={() => openView(sub.id, fromKey)} />
          <BtnClone onClick={() => handleClone(sub.id)} />
        </>
      )
    }

    if (fromKey === 'rejected' || (fromKey === 'all' && rejected)) {
      return (
        <>
          <BtnView onClick={() => openView(sub.id, fromKey)} />
          <BtnEdit onClick={() => openEdit(sub.id)} />
          <BtnClone onClick={() => handleClone(sub.id)} />
        </>
      )
    }

    if (fromKey === 'expiry' || (fromKey === 'all' && published && isExpiryQueueRow(sub))) {
      return (
        <>
          <BtnView onClick={() => openView(sub.id, fromKey === 'all' ? 'expiry' : fromKey)} />
          <button type="button" className="btn btn-text btn-sm rsa-ui-list-textaction" onClick={() => openEditConfigure(sub.id)}>
            Offerings
          </button>
          <button type="button" className="btn btn-text btn-sm rsa-ui-list-textaction" onClick={() => openEdit(sub.id)}>
            Details
          </button>
          <button type="button" className="btn btn-text btn-sm rsa-ui-list-textaction" onClick={() => sendForApproval(sub)}>
            Send for review
          </button>
          <BtnClone onClick={() => handleClone(sub.id)} />
        </>
      )
    }

    if (fromKey === 'approved' || (fromKey === 'all' && published)) {
      return (
        <>
          <BtnView onClick={() => openView(sub.id, fromKey)} />
          <BtnEdit onClick={() => openEdit(sub.id)} />
          <button type="button" className="btn btn-text btn-sm rsa-ui-list-textaction" title="Send for approval" onClick={() => sendForApproval(sub)}>
            Send for approval
          </button>
          <BtnClone onClick={() => handleClone(sub.id)} />
        </>
      )
    }

    /* draft + default / all draft */
    return (
      <>
        <BtnView onClick={() => openView(sub.id, fromKey)} />
        <BtnEdit onClick={() => openEdit(sub.id)} />
        <BtnClone onClick={() => handleClone(sub.id)} />
        {draft && (
          <button type="button" className="kd-action-btn rsa-ui-list-delete" title="Delete draft" onClick={() => handleDelete(sub)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        )}
      </>
    )
  }

  return (
    <Layout>
      <main className="kd-main rsa-ui-list-page">
        <div className="kd-page-header">
          <div>
            <h1 className="kd-page-title">{syncTabToUrl ? 'Document Review' : 'RSAUI'}</h1>
            <p className="kd-page-sub">
              {syncTabToUrl
                ? 'Drafts, approval pipeline, rejections, approved service areas, and expiry queue.'
                : 'RSAUI submissions and queues.'}
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={startNew}>
            + Create Service Area
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
              onClick={() => setFilter(f.id)}
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
              {filtered.length > 10 ? (
                <p className="rsa-ui-list-cap-hint">Showing 10 of {filtered.length} in this tab (demo cap).</p>
              ) : null}
              <table className="kd-table rsa-ui-table-full">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Service area</th>
                    <th>Polygon ID</th>
                    <th>Status</th>
                    <th>Rejection / notes</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(sub => {
                    const comment = rejectionPreview(sub)
                    return (
                      <tr key={sub.id}>
                        <td><strong>{sub.id}</strong></td>
                        <td>{sub.serviceArea?.name || '—'}</td>
                        <td>{sub.serviceArea?.polygonId || '—'}</td>
                        <td>
                          <span className={STATUS_CLASS[sub.status] || 'kd-status draft'}>{sub.status?.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="rsa-ui-list-comment" title={comment || undefined}>
                          {comment ? truncate(comment) : '—'}
                        </td>
                        <td>{sub.updated}</td>
                        <td className="kd-actions rsa-ui-list-actions rsa-ui-list-actions--wrap">
                          {renderRowActions(sub)}
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

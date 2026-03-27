import { useParams, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

function daysRemaining(isoDate) {
  if (!isoDate) return null
  const d = new Date(isoDate).getTime()
  return Math.ceil((d - Date.now()) / (86400000))
}

function daysTone(d) {
  if (d == null) return ''
  if (d <= 7) return 'kmt-exp--crit'
  if (d <= 14) return 'kmt-exp--warn'
  if (d <= 30) return 'kmt-exp--yellow'
  return 'kmt-exp--ok'
}

export default function KmtRsaBody() {
  const { queue } = useParams()
  const navigate = useNavigate()
  const { submissions, RSA_STATUS, approveKMT } = useRsaUI()

  const rows = useMemo(() => {
    const list = submissions.filter(s => !s.archived)
    let out = []
    if (queue === 'review') out = list.filter(s => s.status === RSA_STATUS.Pending_KMT)
    else if (queue === 'rejected') out = list.filter(s => s.status === RSA_STATUS.Rejected_BUFM || s.status === RSA_STATUS.Rejected_KMT)
    else if (queue === 'approved') out = list.filter(s => s.status === RSA_STATUS.Pending_KMT || s.status === RSA_STATUS.Published)
    else if (queue === 'expiry') {
      out = list.filter(s => {
        if (s.status !== RSA_STATUS.Published) return false
        const d = daysRemaining(s.serviceArea?.expiryDate)
        return d != null && d <= 90
      })
    }
    return out.slice(0, 10)
  }, [submissions, queue, RSA_STATUS])

  const submissionPath = id => `/rsaui/kmt/submission/${encodeURIComponent(id)}`

  const kmtEditWizard = (id, from = 'review') =>
    `/rsaui/kmt/edit/select?submission=${encodeURIComponent(id)}&mode=edit&from=${encodeURIComponent(from)}`

  const publish = sub => {
    if (sub.status !== RSA_STATUS.Pending_KMT) return
    if (!window.confirm('Publish this RSAUI submission? It will go live as a published service area.')) return
    approveKMT(sub.id)
    window.alert('✓ Published')
  }

  if (queue === 'review') {
    return (
      <div className="kmt-rsa-body">
        <div className="kmt-reports__table-wrap">
          {rows.length === 0 ? (
            <p className="kmt-reports__empty">No requests in the KMT review queue.</p>
          ) : (
            <table className="kmt-reports-table">
              <thead>
                <tr>
                  <th>Service Area</th>
                  <th>Request Type</th>
                  <th>Status</th>
                  <th>Owner (POC)</th>
                  <th>Assigned BUFM</th>
                  <th>Priority</th>
                  <th>Version</th>
                  <th>SLA</th>
                  <th className="kmt-reports-table__actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(sub => (
                  <tr key={sub.id}>
                    <td><strong>{sub.serviceArea?.name || sub.id}</strong></td>
                    <td>{sub.requestType || 'Create Service Area'}</td>
                    <td>Pending KMT</td>
                    <td>{sub.pocName || '—'}</td>
                    <td>{sub.assignedBufmReviewer || '—'}</td>
                    <td>{sub.bufmPriority || '—'}</td>
                    <td>{sub.version || 'v1.0'}</td>
                    <td>{sub.bufmSlaExceeded ? '⚠ Exceeded' : `${sub.bufmSlaHoursRemaining ?? '—'}h`}</td>
                    <td className="kmt-reports-table__actions">
                      <div className="kmt-reports-table__action-row">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(submissionPath(sub.id), { state: {} })}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(kmtEditWizard(sub.id, 'review'))}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)', borderColor: '#fecaca' }}
                          onClick={() =>
                            navigate(submissionPath(sub.id), {
                              state: { openReject: true },
                            })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  if (queue === 'rejected') {
    return (
      <div className="kmt-rsa-body">
        <div className="kmt-reports__table-wrap">
          {rows.length === 0 ? (
            <p className="kmt-reports__empty">No rejected requests.</p>
          ) : (
            <table className="kmt-reports-table">
              <thead>
                <tr>
                  <th>Service Area</th>
                  <th>Request Type</th>
                  <th>Rejected By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="kmt-reports-table__actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(sub => (
                  <tr key={sub.id}>
                    <td><strong>{sub.serviceArea?.name || sub.id}</strong></td>
                    <td>{sub.requestType || 'Create Service Area'}</td>
                    <td>{sub.status === RSA_STATUS.Rejected_BUFM ? 'BUFM' : 'KMT'}</td>
                    <td>{sub.updated}</td>
                    <td>{sub.status?.replace(/_/g, ' ')}</td>
                    <td className="kmt-reports-table__actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(submissionPath(sub.id), { state: {} })}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  if (queue === 'approved') {
    return (
      <div className="kmt-rsa-body">
        <div className="kmt-reports__table-wrap">
          {rows.length === 0 ? (
            <p className="kmt-reports__empty">No approved / in-flight KMT items.</p>
          ) : (
            <table className="kmt-reports-table">
              <thead>
                <tr>
                  <th>Service Area</th>
                  <th>Request Type</th>
                  <th>Approved Date</th>
                  <th>Effective</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th className="kmt-reports-table__actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(sub => (
                  <tr key={sub.id}>
                    <td><strong>{sub.serviceArea?.name || sub.id}</strong></td>
                    <td>{sub.requestType || 'Create Service Area'}</td>
                    <td>{sub.updated}</td>
                    <td>{sub.serviceArea?.effectiveDate || '—'}</td>
                    <td>{sub.serviceArea?.expiryDate || '—'}</td>
                    <td>{sub.status === RSA_STATUS.Published ? 'Approved' : 'Pending KMT'}</td>
                    <td className="kmt-reports-table__actions">
                      <div className="kmt-reports-table__action-row">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(submissionPath(sub.id), { state: {} })}
                        >
                          View
                        </button>
                        {(sub.status === RSA_STATUS.Pending_KMT || sub.status === RSA_STATUS.Published) && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(kmtEditWizard(sub.id, 'approved'))}
                          >
                            Edit
                          </button>
                        )}
                        {sub.status === RSA_STATUS.Pending_KMT && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => publish(sub)}>
                            Quick publish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  /* expiry */
  return (
    <div className="kmt-rsa-body">
      <div className="kmt-reports__table-wrap">
        {rows.length === 0 ? (
          <p className="kmt-reports__empty">No expiring documents in the next 90 days.</p>
        ) : (
          <table className="kmt-reports-table">
            <thead>
              <tr>
                <th>Service Area</th>
                <th>Polygon ID</th>
                <th>Offering Name</th>
                <th>Expiry Date</th>
                <th>Days Remaining</th>
                <th>Division</th>
                <th>Status</th>
                <th className="kmt-reports-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(sub => {
                const d = daysRemaining(sub.serviceArea?.expiryDate)
                return (
                  <tr key={sub.id}>
                    <td><strong>{sub.serviceArea?.name || sub.id}</strong></td>
                    <td>{sub.serviceArea?.polygonId || '—'}</td>
                    <td>{sub.offeringExpiryLabel || sub.product?.name || '—'}</td>
                    <td>{sub.serviceArea?.expiryDate || '—'}</td>
                    <td><span className={daysTone(d)}>{d != null ? `${d} days` : '—'}</span></td>
                    <td>{sub.serviceArea?.division || '—'}</td>
                    <td>Expiring</td>
                    <td className="kmt-reports-table__actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(submissionPath(sub.id), { state: {} })}
                      >
                        View
                      </button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/rsaui/kmt/extend/${encodeURIComponent(sub.id)}`)}>
                        Extend
                      </button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/rsaui/kmt/archive/${encodeURIComponent(sub.id)}`)}>
                        Archive
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

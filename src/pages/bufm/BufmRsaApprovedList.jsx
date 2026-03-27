import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

export default function BufmRsaApprovedList() {
  const { submissions } = useRsaUI()
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      submissions
        .filter(
          s =>
            (s.status === RSA_STATUS.Pending_KMT || s.status === RSA_STATUS.Published) && !s.archived,
        )
        .slice(0, 10),
    [submissions],
  )

  return (
    <div className="bufm-doc-table-card">
      <div className="bufm-doc-table-card__head">
        <h2 className="bufm-doc-table-card__title">Approved (BUFM)</h2>
        <span className="bufm-doc-table-card__hint">Forwarded to KMT or published</span>
      </div>
      {rows.length === 0 ? (
        <p className="bufm-doc-table-card__empty">No approved items.</p>
      ) : (
        <div className="bufm-table-scroll">
          <table className="bufm-table">
            <thead>
              <tr>
                <th>Service Area</th>
                <th>Request Type</th>
                <th>Approved Date</th>
                <th>Submitted By</th>
                <th>Version</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(sub => (
                <tr key={sub.id}>
                  <td><strong>{sub.serviceArea?.name || sub.id}</strong></td>
                  <td>{sub.requestType || 'Create Service Area'}</td>
                  <td>{sub.updated}</td>
                  <td>{sub.pocName || '—'}</td>
                  <td>{sub.version || 'v1.0'}</td>
                  <td>{sub.status === RSA_STATUS.Published ? 'Published' : 'Pending KMT'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary bufm-table__view"
                      onClick={() => navigate(`/rsaui/bufm/review/${encodeURIComponent(sub.id)}`)}
                    >
                      View Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

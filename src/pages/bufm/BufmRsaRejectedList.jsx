import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

export default function BufmRsaRejectedList() {
  const { submissions } = useRsaUI()
  const navigate = useNavigate()

  const rows = useMemo(
    () => submissions.filter(s => s.status === RSA_STATUS.Rejected_BUFM).slice(0, 10),
    [submissions],
  )

  return (
    <div className="bufm-doc-table-card">
      <div className="bufm-doc-table-card__head">
        <h2 className="bufm-doc-table-card__title">Rejected</h2>
        <span className="bufm-doc-table-card__hint">Returned to POC</span>
      </div>
      {rows.length === 0 ? (
        <p className="bufm-doc-table-card__empty">No rejected RSAUI requests.</p>
      ) : (
        <div className="bufm-table-scroll">
          <table className="bufm-table">
            <thead>
              <tr>
                <th>Service Area</th>
                <th>Request Type</th>
                <th>Rejected Date</th>
                <th>Rejection Note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(sub => (
                <tr key={sub.id}>
                  <td><strong>{sub.serviceArea?.name || sub.id}</strong></td>
                  <td>{sub.requestType || 'Create Service Area'}</td>
                  <td>{sub.updated}</td>
                  <td className="bufm-truncate" title={sub.rejection_comment_BUFM}>{sub.rejection_comment_BUFM || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary bufm-table__view"
                      onClick={() => navigate(`/bufm/review/${encodeURIComponent(sub.id)}`)}
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

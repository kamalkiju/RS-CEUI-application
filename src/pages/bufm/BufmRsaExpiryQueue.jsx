import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

function isExpiryRow(sub) {
  const exp = sub.serviceArea?.expiryDate
  if (!exp || sub.status !== RSA_STATUS.Published) return false
  const diff = Math.ceil((new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff <= 30
}

export default function BufmRsaExpiryQueue() {
  const { submissions } = useRsaUI()
  const navigate = useNavigate()

  const rows = useMemo(() => submissions.filter(isExpiryRow).slice(0, 20), [submissions])

  return (
    <div className="bufm-doc-table-card">
      <div className="bufm-doc-table-card__head">
        <h2 className="bufm-doc-table-card__title">Expiry queue</h2>
        <span className="bufm-doc-table-card__hint">Published service areas with renewal within 30 days (demo)</span>
      </div>
      {rows.length === 0 ? (
        <p className="bufm-doc-table-card__empty">No RSAUI items in the expiry queue.</p>
      ) : (
        <div className="bufm-table-scroll">
          <table className="bufm-table">
            <thead>
              <tr>
                <th>Service Area</th>
                <th>Request Type</th>
                <th>Expiry date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(sub => (
                <tr key={sub.id}>
                  <td>
                    <strong>{sub.serviceArea?.name || sub.id}</strong>
                  </td>
                  <td>{sub.requestType || 'Create Service Area'}</td>
                  <td>{sub.serviceArea?.expiryDate || '—'}</td>
                  <td>Published</td>
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

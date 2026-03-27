import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useRsaUI } from '../../context/RsaUIContext.jsx'

function slaBadge(sub) {
  if (sub.bufmSlaExceeded) return { cls: 'bufm-sla--bad', text: '⚠ SLA EXCEEDED' }
  const h = sub.bufmSlaHoursRemaining
  if (h != null && h < 4) return { cls: 'bufm-sla--warn', text: `⏱ ${h}h remaining` }
  return { cls: 'bufm-sla--ok', text: `✓ ${h ?? '—'}h remaining` }
}

function priorityPill(p) {
  const map = { High: 'bufm-pri--high', Medium: 'bufm-pri--med', Low: 'bufm-pri--low' }
  return map[p] || 'bufm-pri--med'
}

export default function BufmRsaReviewQueue() {
  const { getPendingForBUFM } = useRsaUI()
  const navigate = useNavigate()

  const rows = useMemo(
    () => getPendingForBUFM().filter(s => !s.bufmUnclaimed).slice(0, 10),
    [getPendingForBUFM],
  )

  return (
    <div className="bufm-doc-table-card">
      <div className="bufm-doc-table-card__head">
        <h2 className="bufm-doc-table-card__title">Review queue</h2>
        <span className="bufm-doc-table-card__hint">RSAUI service area requests — Pending BUFM</span>
      </div>
      {rows.length === 0 ? (
        <p className="bufm-doc-table-card__empty">No tasks awaiting your review.</p>
      ) : (
        <div className="bufm-table-scroll">
          <table className="bufm-table">
            <thead>
              <tr>
                <th>Service Area</th>
                <th>Request Type</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Submitted By</th>
                <th>Version</th>
                <th>SLA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(sub => {
                const sla = slaBadge(sub)
                return (
                  <tr key={sub.id}>
                    <td><strong>{sub.serviceArea?.name || sub.id}</strong></td>
                    <td>{sub.requestType || 'Create Service Area'}</td>
                    <td>
                      <span className={`bufm-pri ${priorityPill(sub.bufmPriority)}`}>{sub.bufmPriority || 'Medium'}</span>
                    </td>
                    <td>{sub.bufmDueAt || sub.updated}</td>
                    <td>{sub.pocName || sub.requestMeta?.requestorName || '—'}</td>
                    <td>{sub.version || 'v1.0'}</td>
                    <td><span className={`bufm-sla ${sla.cls}`}>{sla.text}</span></td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary bufm-table__view"
                        onClick={() => navigate(`/rsaui/bufm/review/${encodeURIComponent(sub.id)}`)}
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

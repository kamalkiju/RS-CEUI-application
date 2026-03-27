import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useRsaUI } from '../../context/RsaUIContext.jsx'

function priorityPill(p) {
  const map = { High: 'bufm-pri--high', Medium: 'bufm-pri--med', Low: 'bufm-pri--low' }
  return map[p] || 'bufm-pri--med'
}

export default function BufmRsaUnclaimedQueue() {
  const { getBufmUnclaimed, claimBufmTask } = useRsaUI()
  const { user } = useAuth()
  const navigate = useNavigate()
  const rows = useMemo(() => getBufmUnclaimed().slice(0, 10), [getBufmUnclaimed])

  const claim = sub => {
    if (!window.confirm(`Claim this task?\n\n"${sub.serviceArea?.name || sub.id}"\n\nThis task will be assigned to you and added to your Review Queue.`)) return
    const name = user?.name || user?.email || 'Reviewer'
    claimBufmTask(sub.id, name)
    window.alert('✓ Task Claimed Successfully')
    navigate(`/rsaui/bufm/review/${encodeURIComponent(sub.id)}`)
  }

  return (
    <div className="bufm-doc-table-card">
      <div className="bufm-doc-table-card__head">
        <h2 className="bufm-doc-table-card__title">Unclaimed tasks</h2>
        <span className="bufm-doc-table-card__hint">Released to the BUFM pool</span>
      </div>
      {rows.length === 0 ? (
        <p className="bufm-doc-table-card__empty">No unclaimed RSAUI tasks.</p>
      ) : (
        <div className="bufm-table-scroll">
          <table className="bufm-table">
            <thead>
              <tr>
                <th>Service Area</th>
                <th>Request Type</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Released By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(sub => (
                <tr key={sub.id}>
                  <td><strong>{sub.serviceArea?.name || sub.id}</strong></td>
                  <td>{sub.requestType || 'Create Service Area'}</td>
                  <td><span className={`bufm-pri ${priorityPill(sub.bufmPriority)}`}>{sub.bufmPriority || 'Medium'}</span></td>
                  <td>{sub.bufmDueAt || sub.updated}</td>
                  <td>{sub.bufmReleaseNote ? 'Previous reviewer' : '—'}</td>
                  <td>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/rsaui/bufm/review/${encodeURIComponent(sub.id)}`)}>
                      View
                    </button>{' '}
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => claim(sub)}>
                      Claim Task
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

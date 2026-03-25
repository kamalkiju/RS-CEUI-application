import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useDocs } from '../../context/DocContext.jsx'
import VersionBadge from '../../components/VersionBadge.jsx'
import { getDisplayStatus } from '../../utils/documentStatus.js'

export default function BufmReviewQueue() {
  const { listDocumentsByStatus } = useDocs()
  const navigate = useNavigate()

  const rows = useMemo(() => listDocumentsByStatus('Pending_BUFM'), [listDocumentsByStatus])

  return (
    <div className="bufm-doc-table-card">
      <div className="bufm-doc-table-card__head">
        <h2 className="bufm-doc-table-card__title">Review queue</h2>
        <span className="bufm-doc-table-card__hint">Status = Pending_BUFM</span>
      </div>
      {rows.length === 0 ? (
        <p className="bufm-doc-table-card__empty">No documents awaiting BUFM review.</p>
      ) : (
        <div className="bufm-table-scroll">
          <table className="bufm-table">
            <thead>
              <tr>
                <th>Document title</th>
                <th>Version</th>
                <th>Service area</th>
                <th>POC name</th>
                <th>Submitted date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(doc => {
                const disp = getDisplayStatus(doc, 'BUFM')
                const areaLabel = doc.area || doc.areas?.[0]?.name || '—'
                return (
                  <tr key={doc.id}>
                    <td><strong>{doc.sub || doc.id}</strong></td>
                    <td><VersionBadge doc={doc} /></td>
                    <td>{areaLabel}</td>
                    <td>{doc.pocName || '—'}</td>
                    <td>{doc.submittedDate || doc.updated}</td>
                    <td>
                      <div className="bufm-status-stack">
                        <VersionBadge doc={doc} />
                        <span className={`bufm-status bufm-status--${disp.statusClass}`}>{disp.label}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary bufm-table__view"
                        onClick={() => navigate(`/bufm/document/${encodeURIComponent(doc.id)}`)}
                      >
                        View
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

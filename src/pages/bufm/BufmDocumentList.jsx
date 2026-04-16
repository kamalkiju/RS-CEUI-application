import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocs } from '../../context/DocContext.jsx'
import VersionBadge from '../../components/VersionBadge.jsx'
import { getDisplayStatus } from '../../utils/documentStatus.js'

function isRejectedForBufmReports(doc) {
  const s = doc.status
  return s === 'Rejected_BUFM' || s === 'Rejected_KMT' || s === 'rejected_bufm' || s === 'rejected_kmt'
}

export default function BufmDocumentList({ mode }) {
  const { docs } = useDocs()
  const navigate = useNavigate()

  const rows = useMemo(() => {
    if (mode === 'approved') {
      return docs.filter(d => d.status === 'approved')
    }
    if (mode === 'expiry') {
      return docs.filter(d => d.status === 'approved')
    }
    return docs.filter(isRejectedForBufmReports)
  }, [docs, mode])

  const title =
    mode === 'approved' ? 'Approved documents' : mode === 'expiry' ? 'Expiry queue' : 'Rejected documents'
  const hint =
    mode === 'approved'
      ? 'Fully approved / published path'
      : mode === 'expiry'
        ? 'Knowledge documents with upcoming review or renewal dates (demo)'
        : 'Rejected by BUFM or KMT'

  return (
    <div className="bufm-doc-table-card">
      <div className="bufm-doc-table-card__head">
        <h2 className="bufm-doc-table-card__title">{title}</h2>
        <span className="bufm-doc-table-card__hint">{hint}</span>
      </div>
      {rows.length === 0 ? (
        <p className="bufm-doc-table-card__empty">No documents in this list.</p>
      ) : (
        <div className="bufm-table-scroll">
          <table className="bufm-table">
            <thead>
              <tr>
                <th>Document title</th>
                <th>Version</th>
                <th>Service area</th>
                <th>POC name</th>
                <th>Last updated</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(doc => {
                const disp = getDisplayStatus(doc, 'BUFM')
                const areaLabel = doc.area || doc.areas?.[0]?.name || '—'
                const statusLabel =
                  mode === 'approved' || mode === 'expiry' ? 'Approved by BUFM' : disp.label
                const showComment =
                  mode === 'rejected' && (doc.rejection_comment_BUFM || doc.rejection_comment_KMT)
                return (
                  <tr key={doc.id}>
                    <td><strong>{doc.sub || doc.id}</strong></td>
                    <td><VersionBadge doc={doc} /></td>
                    <td>{areaLabel}</td>
                    <td>{doc.pocName || '—'}</td>
                    <td>{doc.updated}</td>
                    <td>
                      <div className="bufm-status-stack bufm-status-stack--row">
                        <span className={`bufm-status bufm-status--${disp.statusClass}`}>{statusLabel}</span>
                        {showComment && (
                          <span className="bufm-comment-indicator" title={doc.rejection_comment_BUFM || doc.rejection_comment_KMT || 'Comment'} aria-label="Has rejection comment">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          </span>
                        )}
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

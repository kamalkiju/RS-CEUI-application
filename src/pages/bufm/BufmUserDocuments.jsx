import { useParams, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import Layout from '../../components/Layout.jsx'
import { useDocs } from '../../context/DocContext.jsx'
import { getDisplayStatus } from '../../utils/documentStatus.js'

export default function BufmUserDocuments() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { listDocumentsByCreator } = useDocs()

  const rows = useMemo(() => {
    if (!userId) return []
    return listDocumentsByCreator(userId)
  }, [userId, listDocumentsByCreator])

  const sampleName = rows[0]?.pocName || userId

  return (
    <Layout>
      <div className="bufm-doc-table-card bufm-user-docs">
        <div className="bufm-doc-table-card__head">
          <button type="button" className="back-btn bufm-user-docs__back" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="bufm-user-docs__title">Documents by user</h1>
            <p className="bufm-user-docs__sub">
              <code>{userId}</code>
              {sampleName && sampleName !== userId ? ` · ${sampleName}` : ''} · {rows.length} document(s)
            </p>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="bufm-doc-table-card__empty">No documents for this user (createdBy = user id).</p>
        ) : (
          <div className="bufm-table-scroll">
            <table className="bufm-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Last updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(doc => {
                  const disp = getDisplayStatus(doc, 'BUFM')
                  return (
                    <tr key={doc.id}>
                      <td><strong>{doc.sub || doc.id}</strong></td>
                      <td>
                        <span className={`bufm-status bufm-status--${disp.statusClass}`}>{disp.label}</span>
                      </td>
                      <td>{doc.updated}</td>
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
    </Layout>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useDocs } from '../../context/DocContext.jsx'
import { getDisplayStatus } from '../../utils/documentStatus.js'

function aggregateUsers(docs) {
  const map = new Map()
  for (const d of docs) {
    const uid = d.createdByUserId || 'unknown'
    if (!map.has(uid)) {
      map.set(uid, {
        userId: uid,
        pocName: d.pocName || '—',
        pocEmail: d.pocEmail || '—',
        pocRegion: d.pocRegion || '—',
        documents: [],
      })
    }
    map.get(uid).documents.push(d)
  }
  return Array.from(map.values()).sort((a, b) => a.pocName.localeCompare(b.pocName))
}

export default function BufmUsersPage() {
  const navigate = useNavigate()
  const { docs } = useDocs()
  const users = useMemo(() => aggregateUsers(docs), [docs])
  const [drawerUserId, setDrawerUserId] = useState(null)

  const drawerUser = users.find(u => u.userId === drawerUserId) || null
  const sortedDocs = useMemo(() => {
    const list = drawerUser?.documents ?? []
    return [...list].sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
  }, [drawerUser])

  return (
    <Layout>
      <div className="bufm-users-page">
        <header className="bufm-users-page__header">
          <div>
            <h1 className="bufm-users-page__title">Users</h1>
            <p className="bufm-users-page__sub">POC contacts and their knowledge documents.</p>
          </div>
        </header>

        <div className="bufm-users-page__table-wrap bufm-users-page__table-wrap--full">
          {users.length === 0 ? (
            <p className="bufm-users-page__empty">No users found in document data.</p>
          ) : (
            <table className="bufm-users-table bufm-users-table--wide">
              <thead>
                <tr>
                  <th>User name</th>
                  <th>Email</th>
                  <th>Region</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.userId}>
                    <td>
                      <strong>{u.pocName}</strong>
                    </td>
                    <td>{u.pocEmail}</td>
                    <td>{u.pocRegion}</td>
                    <td>{u.documents.length}</td>
                    <td>
                      <button type="button" className="btn btn-primary bufm-table__view" onClick={() => setDrawerUserId(u.userId)}>
                        View documents
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {drawerUser && (
          <div className="kmt-drawer-backdrop" role="presentation" onClick={() => setDrawerUserId(null)}>
            <aside className="kmt-drawer kmt-drawer--wide bufm-user-docs-drawer" onClick={e => e.stopPropagation()}>
              <button type="button" className="kmt-drawer__close" aria-label="Close" onClick={() => setDrawerUserId(null)}>
                ×
              </button>
              <h2 className="bufm-user-docs-drawer__title">Documents — {drawerUser.pocName}</h2>
              <p className="bufm-user-docs-drawer__sub">{drawerUser.pocEmail}</p>
              {sortedDocs.length === 0 ? (
                <p className="bufm-users-page__empty">No documents for this user.</p>
              ) : (
                <div className="bufm-users-page__table-wrap">
                  <table className="bufm-users-docs-table">
                    <thead>
                      <tr>
                        <th>Document name</th>
                        <th>Status</th>
                        <th>Last updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDocs.map(doc => {
                        const disp = getDisplayStatus(doc, 'BUFM')
                        return (
                          <tr key={doc.id}>
                            <td>
                              <strong>{doc.sub || doc.id}</strong>
                            </td>
                            <td>
                              <span className={`bufm-status bufm-status--${disp.statusClass}`}>{disp.label}</span>
                            </td>
                            <td>{doc.updated || '—'}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-primary bufm-table__view"
                                onClick={() => {
                                  setDrawerUserId(null)
                                  navigate(`/bufm/document/${encodeURIComponent(doc.id)}`)
                                }}
                              >
                                View document
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </Layout>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useDocs } from '../../context/DocContext.jsx'
import { useKmtUsers } from '../../context/KmtUsersContext.jsx'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import { getDisplayStatus } from '../../utils/documentStatus.js'

function aggregateCeuiAuthors(docs) {
  const map = new Map()
  for (const d of docs) {
    const uid = d.createdByUserId || 'unknown'
    if (!map.has(uid)) {
      map.set(uid, {
        key: `ceui-${uid}`,
        kind: 'CEUI',
        userId: uid,
        displayName: d.pocName || '—',
        email: d.pocEmail || '—',
        region: d.pocRegion || '—',
        ceuiDocs: [],
        rsaCount: 0,
      })
    }
    map.get(uid).ceuiDocs.push(d)
  }
  return Array.from(map.values())
}

function aggregateRsaRequestors(submissions) {
  const map = new Map()
  for (const s of submissions) {
    const email = s.requestMeta?.requestorEmail || s.pocEmail || ''
    const name = s.requestMeta?.requestorName || s.pocName || 'Requestor'
    const key = email || s.id
    if (!map.has(key)) {
      map.set(key, {
        key: `rsa-${key}`,
        kind: 'RSAUI',
        userId: key,
        displayName: name,
        email: email || '—',
        region: s.serviceArea?.division || '—',
        ceuiDocs: [],
        rsaSubs: [],
      })
    }
    map.get(key).rsaSubs.push(s)
  }
  return Array.from(map.values()).map(row => ({
    ...row,
    rsaCount: row.rsaSubs.length,
  }))
}

export default function BufmUsersPage() {
  const navigate = useNavigate()
  const { docs } = useDocs()
  const { submissions } = useRsaUI()
  const { users: directoryUsers } = useKmtUsers()
  const [drawerKey, setDrawerKey] = useState(null)

  const ceuiAuthors = useMemo(() => aggregateCeuiAuthors(docs), [docs])
  const rsaAuthors = useMemo(() => aggregateRsaRequestors(submissions), [submissions])

  const directoryBufm = useMemo(
    () => directoryUsers.filter(u => u.role === 'BUFM' || u.role === 'POC'),
    [directoryUsers],
  )

  const drawerRow = useMemo(() => {
    if (!drawerKey) return null
    const c = ceuiAuthors.find(x => x.key === drawerKey)
    if (c) return { type: 'CEUI', row: c }
    const r = rsaAuthors.find(x => x.key === drawerKey)
    if (r) return { type: 'RSAUI', row: r }
    return null
  }, [drawerKey, ceuiAuthors, rsaAuthors])

  return (
    <Layout>
      <div className="bufm-users-page">
        <header className="bufm-users-page__header">
          <div>
            <h1 className="bufm-users-page__title">Users</h1>
            <p className="bufm-users-page__sub">
              CEUI knowledge document authors, RSAUI service-area requestors, and directory users — with workspace tags.
            </p>
          </div>
        </header>

        <h2 className="bufm-users-page__section-title">Directory (CEUI / RSAUI)</h2>
        <div className="bufm-users-page__table-wrap bufm-users-page__table-wrap--full">
          <table className="bufm-users-table bufm-users-table--wide">
            <thead>
              <tr>
                <th>Name</th>
                <th>Workspace</th>
                <th>Role</th>
                <th>Email</th>
                <th>Region</th>
              </tr>
            </thead>
            <tbody>
              {directoryBufm.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>
                    <span className={`workspace-pill workspace-pill--${(u.workspace || 'CEUI').toLowerCase()}`}>
                      {u.workspace || 'CEUI'}
                    </span>
                  </td>
                  <td>{u.role}</td>
                  <td>{u.email}</td>
                  <td>{u.region}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="bufm-users-page__section-title">CEUI — knowledge documents by author</h2>
        <div className="bufm-users-page__table-wrap bufm-users-page__table-wrap--full">
          {ceuiAuthors.length === 0 ? (
            <p className="bufm-users-page__empty">No CEUI authors in document data.</p>
          ) : (
            <table className="bufm-users-table bufm-users-table--wide">
              <thead>
                <tr>
                  <th>POC name</th>
                  <th>Workspace</th>
                  <th>Email</th>
                  <th>Region</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ceuiAuthors.map(u => (
                  <tr key={u.key}>
                    <td><strong>{u.displayName}</strong></td>
                    <td><span className="workspace-pill workspace-pill--ceui">CEUI</span></td>
                    <td>{u.email}</td>
                    <td>{u.region}</td>
                    <td>{u.ceuiDocs.length}</td>
                    <td>
                      <button type="button" className="btn btn-primary bufm-table__view" onClick={() => setDrawerKey(u.key)}>
                        View documents
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h2 className="bufm-users-page__section-title">RSAUI — service-area submissions by requestor</h2>
        <div className="bufm-users-page__table-wrap bufm-users-page__table-wrap--full">
          {rsaAuthors.length === 0 ? (
            <p className="bufm-users-page__empty">No RSAUI requestors in submission data.</p>
          ) : (
            <table className="bufm-users-table bufm-users-table--wide">
              <thead>
                <tr>
                  <th>Requestor</th>
                  <th>Workspace</th>
                  <th>Email</th>
                  <th>Division</th>
                  <th>Submissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rsaAuthors.map(u => (
                  <tr key={u.key}>
                    <td><strong>{u.displayName}</strong></td>
                    <td><span className="workspace-pill workspace-pill--rsaui">RSAUI</span></td>
                    <td>{u.email}</td>
                    <td>{u.region}</td>
                    <td>{u.rsaCount}</td>
                    <td>
                      <button type="button" className="btn btn-primary bufm-table__view" onClick={() => setDrawerKey(u.key)}>
                        View list
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {drawerRow && (
          <div className="kmt-drawer-backdrop" role="presentation" onClick={() => setDrawerKey(null)}>
            <aside className="kmt-drawer kmt-drawer--wide bufm-user-docs-drawer" onClick={e => e.stopPropagation()}>
              <button type="button" className="kmt-drawer__close" aria-label="Close" onClick={() => setDrawerKey(null)}>
                ×
              </button>
              {drawerRow.type === 'CEUI' && (
                <>
                  <h2 className="bufm-user-docs-drawer__title">CEUI documents — {drawerRow.row.displayName}</h2>
                  <p className="bufm-user-docs-drawer__sub">{drawerRow.row.email}</p>
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
                        {[...drawerRow.row.ceuiDocs]
                          .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
                          .map(doc => {
                            const disp = getDisplayStatus(doc, 'BUFM')
                            return (
                              <tr key={doc.id}>
                                <td><strong>{doc.sub || doc.id}</strong></td>
                                <td>
                                  <span className={`bufm-status bufm-status--${disp.statusClass}`}>{disp.label}</span>
                                </td>
                                <td>{doc.updated || '—'}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-primary bufm-table__view"
                                    onClick={() => {
                                      setDrawerKey(null)
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
                </>
              )}
              {drawerRow.type === 'RSAUI' && (
                <>
                  <h2 className="bufm-user-docs-drawer__title">RSAUI submissions — {drawerRow.row.displayName}</h2>
                  <p className="bufm-user-docs-drawer__sub">{drawerRow.row.email}</p>
                  <div className="bufm-users-page__table-wrap">
                    <table className="bufm-users-docs-table">
                      <thead>
                        <tr>
                          <th>Service area</th>
                          <th>Status</th>
                          <th>Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawerRow.row.rsaSubs.map(sub => (
                          <tr key={sub.id}>
                            <td><strong>{sub.serviceArea?.name || sub.id}</strong></td>
                            <td>{sub.status?.replace(/_/g, ' ')}</td>
                            <td>{sub.updated || '—'}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-primary bufm-table__view"
                                onClick={() => {
                                  setDrawerKey(null)
                                  navigate(`/bufm/review/${encodeURIComponent(sub.id)}`)
                                }}
                              >
                                Open review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </Layout>
  )
}

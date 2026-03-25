import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useDocs } from '../../context/DocContext.jsx'
import { useKmtUsers } from '../../context/KmtUsersContext.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'

const ROLES = ['POC', 'BUFM', 'KMT']

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  role: 'POC',
  region: '',
  title: '',
})

export default function KmtUsersPage() {
  const navigate = useNavigate()
  const { users, addUser, updateUser, deleteUser } = useKmtUsers()
  const { docs } = useDocs()

  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editUserId, setEditUserId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [docModalUser, setDocModalUser] = useState(null)

  const enriched = useMemo(
    () =>
      users.map(u => {
        const myDocs =
          u.role === 'POC'
            ? docs.filter(d => d.createdByUserId === u.id)
            : u.role === 'BUFM'
              ? docs.filter(d => d.status === 'Pending_BUFM' || d.approved_by_BUFM)
              : docs.filter(d => d.approved_by_KMT || d.status === 'Pending_KMT')
        return { ...u, documents: myDocs, status: u.status || 'Active' }
      }),
    [users, docs],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return enriched
    return enriched.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.region.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q),
    )
  }, [enriched, search])

  const toDelete = deleteId ? users.find(u => u.id === deleteId) : null

  const openAdd = () => {
    setForm(emptyForm())
    setEditUserId(null)
    setModal('add')
  }

  const openEdit = u => {
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      region: u.region,
      title: u.title,
    })
    setEditUserId(u.id)
    setModal('edit')
  }

  const saveUser = () => {
    if (!form.name.trim() || !form.email.trim()) return
    if (modal === 'add') {
      addUser({
        ...form,
        id: `user-${Date.now()}`,
        status: 'Active',
      })
    } else if (modal === 'edit' && editUserId) {
      updateUser(editUserId, form)
    }
    setModal(null)
  }

  return (
    <Layout>
      <div className="kmt-page kmt-users-directory">
        <div className="kmt-users-directory__head">
          <div>
            <h1 className="kmt-page__title">Users</h1>
            <p className="kmt-page__sub">Directory — POC, BUFM, and KMT. Add, edit, or remove users.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            Add user
          </button>
        </div>

        <div className="kmt-users-directory__toolbar">
          <input
            className="kmt-input kmt-users-directory__search"
            type="search"
            aria-label="Search users"
            placeholder="Search by name, email, role, region…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="kmt-users-table-wrap">
          <table className="kmt-users-table">
            <thead>
              <tr>
                <th>User name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  <td>{u.email}</td>
                  <td>{u.status}</td>
                  <td className="kmt-users-table__actions">
                    <button type="button" className="btn btn-outline kmt-btn-compact" onClick={() => setDocModalUser(u)}>
                      View Documents
                    </button>
                    <button type="button" className="btn btn-outline kmt-btn-compact" onClick={() => openEdit(u)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline kmt-btn-compact"
                      style={{ color: 'var(--danger)', borderColor: '#fecaca' }}
                      onClick={() => setDeleteId(u.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <p className="kmt-reports__empty">No users match your search.</p>}

        {docModalUser && (
          <div className="confirm-modal-backdrop" role="presentation" onClick={() => setDocModalUser(null)}>
            <div className="confirm-modal confirm-modal--wide" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
              <button type="button" className="kmt-drawer__close" aria-label="Close" onClick={() => setDocModalUser(null)}>
                ×
              </button>
              <h2 className="confirm-modal__title">Documents — {docModalUser.name}</h2>
              <div className="kmt-users-doc-modal__table-wrap">
                <table className="kmt-users-doc-modal__table">
                  <thead>
                    <tr>
                      <th>Document name</th>
                      <th>Status</th>
                      <th>Last updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docModalUser.documents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="kmt-users-doc-modal__empty">
                          No documents in this view.
                        </td>
                      </tr>
                    )}
                    {docModalUser.documents.map(d => (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.sub || d.id}</strong>
                        </td>
                        <td>{d.status}</td>
                        <td>{d.updated || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-primary kmt-btn-compact"
                            onClick={() => {
                              setDocModalUser(null)
                              navigate(`/kmt/document/${encodeURIComponent(d.id)}`)
                            }}
                          >
                            View document
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="confirm-modal__actions">
                <button type="button" className="btn btn-primary" onClick={() => setDocModalUser(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {modal && (
          <div className="confirm-modal-backdrop" role="presentation" onClick={() => setModal(null)}>
            <div className="confirm-modal confirm-modal--wide kmt-user-modal" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
              <h2 className="confirm-modal__title">{modal === 'add' ? 'Add user' : 'Edit user'}</h2>
              <div className="kmt-user-modal__fields">
                <label className="kmt-field">
                  <span>Name</span>
                  <input className="kmt-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </label>
                <label className="kmt-field">
                  <span>Email</span>
                  <input className="kmt-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </label>
                <label className="kmt-field">
                  <span>Phone</span>
                  <input className="kmt-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </label>
                <label className="kmt-field">
                  <span>Role</span>
                  <select className="kmt-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="kmt-field">
                  <span>Title</span>
                  <input className="kmt-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </label>
                <label className="kmt-field">
                  <span>Region</span>
                  <input className="kmt-input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
                </label>
              </div>
              <div className="confirm-modal__actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" disabled={!form.name.trim() || !form.email.trim()} onClick={saveUser}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          open={!!deleteId}
          title="Delete user?"
          message={toDelete ? `Remove ${toDelete.name} from the directory?` : ''}
          confirmLabel="Delete"
          danger
          onClose={() => setDeleteId(null)}
          onConfirm={() => {
            if (deleteId) {
              deleteUser(deleteId)
            }
            setDeleteId(null)
          }}
        />
      </div>
    </Layout>
  )
}

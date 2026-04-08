import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useKmtTemplates } from '../../context/KmtTemplateContext.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'

const TABS = [
  { id: 'draft', label: 'Draft' },
  { id: 'published', label: 'Published' },
]

export default function ItDocumentsPage() {
  const navigate = useNavigate()
  const { templates, deleteTemplate } = useKmtTemplates()
  const [tab, setTab] = useState('draft')
  const [deleteId, setDeleteId] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const list =
      tab === 'draft' ? templates.filter(t => t.status === 'draft') : templates.filter(t => t.status === 'published')
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.docType || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q) ||
        (t.lineOfBusiness || '').toLowerCase().includes(q) ||
        (t.marketSegment || '').toLowerCase().includes(q) ||
        (t.targetApp || '').toLowerCase().includes(q),
    )
  }, [templates, tab, search])

  const del = deleteId ? templates.find(t => t.id === deleteId) : null

  return (
    <Layout>
      <div className="kmt-page kmt-templates">
        <div className="kmt-templates__head">
          <div>
            <h1 className="kmt-page__title">Document templates</h1>
            <p className="kmt-page__sub">
              Create and publish templates for CEUI or RSAUI. Drafts stay private until you publish.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/it/documents/new')}>
            Create document template
          </button>
        </div>

        <nav className="kmt-templates__tabs" aria-label="Template status">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`kmt-templates__tab${tab === t.id ? ' kmt-templates__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="kmt-templates__toolbar">
          <input
            className="kmt-input kmt-templates__search"
            type="search"
            aria-label="Search templates"
            placeholder="Search by name, document type, application, line of business, market type, or template ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="kmt-templates__table-wrap">
          {filtered.length > 0 ? (
            <table className="kmt-templates-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Document name</th>
                  <th>Document type</th>
                  <th>Line of business</th>
                  <th>Market type</th>
                  <th>Status</th>
                  <th>Last updated</th>
                  <th className="kmt-templates-table__actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>{t.targetApp || 'CEUI'}</td>
                    <td>
                      <strong>{t.name}</strong>
                    </td>
                    <td>{t.docType || '—'}</td>
                    <td>{t.lineOfBusiness || '—'}</td>
                    <td>{t.marketSegment || '—'}</td>
                    <td>
                      <span className="kmt-templates-table__status">{t.status}</span>
                    </td>
                    <td>{t.updatedAt?.slice(0, 10) || '—'}</td>
                    <td className="kmt-templates-table__actions">
                      <button type="button" className="btn btn-outline kmt-btn-compact" onClick={() => navigate(`/it/documents/${t.id}`)}>
                        View
                      </button>
                      <button type="button" className="btn btn-primary kmt-btn-compact" onClick={() => navigate(`/it/documents/${t.id}/edit`)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline kmt-btn-compact"
                        style={{ color: 'var(--danger)', borderColor: '#fecaca' }}
                        onClick={() => setDeleteId(t.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="kmt-reports__empty">No templates in this tab.</p>
          )}
        </div>

        <ConfirmModal
          open={!!deleteId}
          title="Delete template?"
          message={del ? `Remove "${del.name}" permanently? ${del.status === 'published' ? 'This was published — confirm removal.' : ''}` : ''}
          confirmLabel="Delete"
          danger
          onClose={() => setDeleteId(null)}
          onConfirm={() => {
            if (deleteId) deleteTemplate(deleteId)
            setDeleteId(null)
          }}
        />
      </div>
    </Layout>
  )
}

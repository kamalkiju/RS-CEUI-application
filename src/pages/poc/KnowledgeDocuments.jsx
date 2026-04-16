import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import VersionBadge from '../../components/VersionBadge.jsx'
import { useDocs, generateDocId } from '../../context/DocContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import { getDisplayStatus, isRejectedTaskStatus } from '../../utils/documentStatus.js'
import { bumpMajorVersion, inferDocVersion } from '../../utils/documentVersion.js'
import ReviewerHighlightBadges from '../../components/ReviewerHighlightBadges.jsx'

const STATUS_ICONS = {
  rejected: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  draft:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  pending:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  approved: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  published: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
}

const TABS = [
  { key: 'all', label: 'All Documents' },
  { key: 'approval', label: 'Awaiting Approval' },
  { key: 'draft', label: 'Draft Documents' },
  { key: 'rejected-tasks', label: 'Rejected' },
  { key: 'approved', label: 'Approved' },
]

export default function KnowledgeDocuments() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { docs, addDoc, removeDoc } = useDocs()
  const { submissions, removeSubmission } = useRsaUI()
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  const rsaRejectedRows = submissions
    .filter(s => isRejectedTaskStatus(s.status))
    .map(s => ({
      _kind: 'rsa',
      id: s.id,
      sub: `RSAUI — ${s.serviceArea?.name || 'Submission'}`,
      area: s.serviceArea?.division || '—',
      market: 'RSAUI',
      lob: 'RSAUI',
      status: s.status,
      updated: s.updated,
      tabs: ['rejected-tasks'],
      rejection_comment_BUFM: s.rejection_comment_BUFM,
      rejection_comment_KMT: s.rejection_comment_KMT,
      rejection_highlight_sections: s.rejection_highlight_sections,
      rejection_highlight_fields: s.rejection_highlight_fields,
      rejection_feedback_items: s.rejection_feedback_items,
      reviewAuditTrail: s.reviewAuditTrail,
    }))

  const mergedRows = [
    ...docs.map(d => ({ ...d, _kind: 'doc' })),
    ...rsaRejectedRows,
  ]

  const filtered = mergedRows.filter(row => {
    const tabMatch = (() => {
      if (activeTab === 'all') return row._kind === 'doc' || row._kind === 'rsa'
      if (activeTab === 'rejected-tasks') return isRejectedTaskStatus(row.status)
      if (activeTab === 'approved') return row._kind === 'doc' && row.status === 'approved'
      if (activeTab === 'draft') return row._kind === 'doc' && row.status === 'draft'
      if (activeTab === 'approval') {
        if (row._kind === 'rsa') return false
        return row.status === 'Pending_BUFM' || row.status === 'Pending_KMT'
      }
      if (row._kind === 'rsa') return false
      return (row.tabs || []).includes(activeTab)
    })()
    const searchMatch = !search || [row.id, row.sub, row.area, row.market, row.lob].join(' ').toLowerCase().includes(search.toLowerCase())
    return tabMatch && searchMatch
  })

  const goEditor = (row, state) => {
    if (row._kind === 'rsa') {
      const m = state?.mode || 'edit'
      navigate(`/poc/service-area?submission=${encodeURIComponent(row.id)}&mode=${m}`)
      return
    }
    navigate('/poc/editor', { state: { doc: row, ...state } })
  }

  const openApprovalPreview = (row) => {
    goEditor(row, { mode: 'view', previewOnly: true })
  }

  const openView = (row) => goEditor(row, { mode: 'view' })

  const openEdit = (row) => {
    if (row._kind === 'rsa') return goEditor(row, { mode: 'edit' })
    if (activeTab === 'approval') return openApprovalPreview(row)
    if (isRejectedTaskStatus(row.status)) return goEditor(row, { mode: 'rework' })
    if (row.status === 'approved') return goEditor(row, { mode: 'view' })
    return goEditor(row, { mode: 'edit' })
  }

  const openCreate = () => navigate('/poc/create')

  const cloneDoc = (doc) => {
    const { _kind, ...rest } = doc
    const newDoc = {
      ...rest,
      id:     generateDocId(),
      sub:    `Copy of ${doc.sub || doc.id}`,
      status: 'draft',
      tabs:   ['draft', 'all'],
      rejectionNote: undefined,
      rejectionSummary: undefined,
      rejection_comment_BUFM: undefined,
      rejection_comment_KMT: undefined,
      completionPercent: undefined,
      updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }
    addDoc(newDoc)
    navigate('/poc/editor', { state: { doc: newDoc, mode: 'edit' } })
  }

  const createNewVersion = (doc) => {
    const { _kind, ...rest } = doc
    if (_kind === 'rsa') return
    const nextV = bumpMajorVersion(inferDocVersion(doc))
    const newDoc = {
      ...rest,
      id: generateDocId(),
      version: nextV,
      previousDocumentId: doc.id,
      status: 'draft',
      case_stage: 'Draft',
      tabs: ['draft', 'all'],
      approved_by_BUFM: false,
      approved_by_KMT: false,
      bufmApproveDate: undefined,
      kmtApproveDate: undefined,
      bufmRejectDate: undefined,
      kmtRejectDate: undefined,
      rejection_comment_BUFM: undefined,
      rejection_comment_KMT: undefined,
      rejectionNote: undefined,
      rejectionSummary: undefined,
      completionPercent: undefined,
      updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }
    addDoc(newDoc)
    navigate('/poc/editor', { state: { doc: newDoc, mode: 'edit' } })
  }

  const deleteRow = (row) => {
    if (!window.confirm(`Remove ${row.id} from the list? This cannot be undone in the POC.`)) return
    if (row._kind === 'rsa') removeSubmission(row.id)
    else removeDoc(row.id)
  }

  const showRejectedRowActions = activeTab === 'rejected-tasks'
  const approvalRowPreview = activeTab === 'approval'

  return (
    <Layout>
      <main className="kd-main">
        <div className="kd-page-header">
          <div>
            <h1 className="kd-page-title">Knowledge Documents</h1>
            <p className="kd-page-sub">Manage and track knowledge documents</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create New Document
          </button>
        </div>

        <div className="kd-toolbar">
          <div className="kd-tabs">
            {TABS.map(t => (
              <button key={t.key} className={`kd-tab${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="kd-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text" className="kd-search" placeholder="Search documents..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="kd-table-card">
          {filtered.length > 0 ? (
            <table className="kd-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Version</th>
                  <th>Service Area</th>
                  <th>Market Type</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
              {filtered.map(row => {
                const { label, statusClass, iconKey } = getDisplayStatus(row, user?.role)
                const icon = STATUS_ICONS[iconKey] ?? STATUS_ICONS.draft
                const rowKey = row._kind === 'rsa' ? `rsa-${row.id}` : row.id
                const versionNode = row._kind === 'doc'
                  ? <VersionBadge doc={row} />
                  : <span className="kd-muted">—</span>
                return (
                  <tr
                    key={rowKey}
                    className={approvalRowPreview && row._kind === 'doc' ? 'kd-row--click-preview' : undefined}
                    onClick={() => {
                      if (approvalRowPreview && row._kind === 'doc') openApprovalPreview(row)
                    }}
                  >
                    <td>
                      <button
                        type="button"
                        className="kd-doc-link"
                        onClick={e => {
                          e.stopPropagation()
                          if (approvalRowPreview && row._kind === 'doc') openApprovalPreview(row)
                          else if (activeTab === 'approved' && row._kind === 'doc') openView(row)
                          else openEdit(row)
                        }}
                      >
                        {row.id}
                      </button>
                      <div className="kd-doc-sub">{row.sub}</div>
                      {(activeTab === 'rejected-tasks' || activeTab === 'approval') && (
                        <ReviewerHighlightBadges
                          source={row}
                          variant={row._kind === 'rsa' ? 'rsa' : 'default'}
                          stacked
                        />
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>{versionNode}</td>
                    <td>{row.area}</td>
                    <td>{row.market}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <span className={`kd-status ${statusClass}`}>
                        {icon} {label}
                      </span>
                      {activeTab === 'approval' && row._kind === 'doc' && (
                        <div className="kd-stage-hint">{row.status === 'Pending_KMT' ? 'Pending KMT' : 'Pending BUFM'}</div>
                      )}
                    </td>
                    <td>{row.updated}</td>
                    <td className="kd-actions" onClick={e => e.stopPropagation()}>
                      <button className="kd-action-btn" title="View" onClick={() => openView(row)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button
                        className="kd-action-btn"
                        title={activeTab === 'approval' ? 'Preview (read-only)' : 'Edit'}
                        onClick={() => openEdit(row)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {row._kind === 'doc' && activeTab !== 'approved' && (
                        <button className="kd-action-btn" title="Clone" onClick={() => cloneDoc(row)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                      )}
                      {row._kind === 'doc' && activeTab === 'approved' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm kd-new-version-btn"
                          title="Create new major version (mock)"
                          onClick={() => createNewVersion(row)}
                        >
                          Create New Version
                        </button>
                      )}
                      {showRejectedRowActions && (
                        <button className="kd-action-btn kd-action-btn--danger" title="Delete" onClick={() => deleteRow(row)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              </tbody>
            </table>
          ) : (
            <div className="kd-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#b0bec5" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>No documents found</p>
            </div>
          )}
        </div>
      </main>
    </Layout>
  )
}

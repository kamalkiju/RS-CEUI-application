import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useDocs } from '../../context/DocContext.jsx'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import { getDisplayStatus } from '../../utils/documentStatus.js'
import VersionBadge from '../../components/VersionBadge.jsx'

const L2 = [
  { path: 'review', label: 'Review Queue' },
  { path: 'approved', label: 'Approved' },
  { path: 'rejected', label: 'Rejected' },
]

function bufmStatusLabel(doc) {
  const d = getDisplayStatus(doc, 'BUFM')
  return d.label
}

function kmtKnowledgeStatusLabel(doc, queue) {
  if (queue === 'review') return 'Pending KMT'
  if (queue === 'approved') return 'Final Approved'
  return getDisplayStatus(doc, 'KMT').label
}

function matchesSearch(q, ...parts) {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return parts.some(p => (p != null && String(p).toLowerCase().includes(s)))
}

export default function KmtReportsBody() {
  const { docType, queue } = useParams()
  const resolvedType = docType || 'knowledge'
  const resolvedQueue = queue || 'review'
  const navigate = useNavigate()
  const { docs, updateDoc } = useDocs()
  const { submissions, RSA_STATUS, approveKMT } = useRsaUI()
  const [search, setSearch] = useState('')

  const knowledgeFiltered = useMemo(() => {
    if (resolvedType !== 'knowledge') return []
    let list
    if (resolvedQueue === 'review') list = docs.filter(d => d.status === 'Pending_KMT')
    else if (resolvedQueue === 'approved') list = docs.filter(d => d.status === 'approved')
    else list = docs.filter(d => d.status === 'Rejected_KMT')
    return list.filter(d =>
      matchesSearch(
        search,
        d.sub,
        d.id,
        d.pocName,
        d.pocEmail,
        d.area,
        d.status,
        d.lob,
        d.market,
        bufmStatusLabel(d),
      ),
    )
  }, [docs, resolvedType, resolvedQueue, search])

  const rsaFiltered = useMemo(() => {
    if (resolvedType !== 'rsaui') return []
    let list
    if (resolvedQueue === 'review') list = submissions.filter(s => s.status === RSA_STATUS.Pending_KMT)
    else if (resolvedQueue === 'approved') list = submissions.filter(s => s.status === RSA_STATUS.Published)
    else
      list = submissions.filter(
        s => s.status === RSA_STATUS.Rejected_BUFM || s.status === RSA_STATUS.Rejected_KMT,
      )
    return list.filter(s =>
      matchesSearch(
        search,
        s.serviceArea?.name,
        s.id,
        s.pocName,
        s.pocEmail,
        s.status,
        s.serviceArea?.division,
        String(s.serviceArea?.polygonId || ''),
      ),
    )
  }, [submissions, resolvedType, resolvedQueue, RSA_STATUS, search])

  const base = `/kmt/document-review/${resolvedType}`

  const publishKnowledgeDoc = doc => {
    if (doc.status !== 'Pending_KMT') return
    if (!window.confirm('Publish this knowledge document? It will be recorded as final approved by KMT.')) return
    const today = new Date().toISOString().slice(0, 10)
    updateDoc(doc.id, {
      status: 'approved',
      approved_by_KMT: true,
      kmtApproveDate: today,
      tabs: Array.from(new Set([...(doc.tabs || []), 'all'])),
    })
  }

  const publishRsaSubmission = sub => {
    if (sub.status !== RSA_STATUS.Pending_KMT) return
    if (!window.confirm('Publish this RSAUI submission? It will go live as a published service area.')) return
    approveKMT(sub.id)
  }

  const showKnowledgePublish = resolvedQueue === 'review'

  return (
    <>
      <nav className="kmt-reports__l2" aria-label="Review status">
        {L2.map(t => (
          <NavLink
            key={t.path}
            to={`${base}/${t.path}`}
            className={({ isActive }) =>
              `kmt-reports__l2-tab${isActive ? ' kmt-reports__l2-tab--active' : ''}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="kmt-reports__toolbar">
        <input
          className="kmt-input kmt-reports__search"
          type="search"
          aria-label="Search documents in this queue"
          placeholder="Search by title, POC, email, area, LOB, market, ID, status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="kmt-reports__table-wrap">
        {resolvedType === 'knowledge' && knowledgeFiltered.length > 0 && (
          <table className="kmt-reports-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>POC name</th>
                <th>LOB / market</th>
                <th>Area</th>
                <th>Status</th>
                <th>Last updated</th>
                <th className="kmt-reports-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {knowledgeFiltered.map(doc => {
                const disp = getDisplayStatus(doc, 'KMT')
                const stLabel = kmtKnowledgeStatusLabel(doc, resolvedQueue)
                const showReason = resolvedQueue === 'rejected' && doc.rejection_comment_KMT
                return (
                  <tr key={doc.id}>
                    <td>
                      <strong>{doc.sub || doc.id}</strong>
                    </td>
                    <td><VersionBadge doc={doc} /></td>
                    <td>{doc.pocName || '—'}</td>
                    <td>
                      {doc.lob || '—'} · {doc.market || '—'}
                    </td>
                    <td>{doc.area || '—'}</td>
                    <td>
                      <div className="bufm-status-stack bufm-status-stack--row">
                        <span className={`bufm-status bufm-status--${disp.statusClass || 'draft'}`}>{stLabel}</span>
                        {showReason && (
                          <span className="bufm-comment-indicator" title={doc.rejection_comment_KMT} aria-label="Rejection reason">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{doc.updated || '—'}</td>
                    <td className="kmt-reports-table__actions">
                      <div className="kmt-reports-table__action-row">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() =>
                            navigate(`/kmt/document/${encodeURIComponent(doc.id)}`, { state: { kmtEdit: false } })
                          }
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() =>
                            navigate(`/kmt/document/${encodeURIComponent(doc.id)}`, { state: { kmtEdit: true } })
                          }
                        >
                          Edit
                        </button>
                        {showKnowledgePublish && doc.status === 'Pending_KMT' && (
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => publishKnowledgeDoc(doc)}>
                            Publish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {resolvedType === 'knowledge' && knowledgeFiltered.length === 0 && (
          <p className="kmt-reports__empty">No knowledge documents in this queue.</p>
        )}

        {resolvedType === 'rsaui' && rsaFiltered.length > 0 && (
          <table className="kmt-reports-table">
            <thead>
              <tr>
                <th>Submission / service area</th>
                <th>POC name</th>
                <th>Status</th>
                <th>Last updated</th>
                <th className="kmt-reports-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rsaFiltered.map(sub => (
                <tr key={sub.id}>
                  <td>
                    <strong>{sub.serviceArea?.name || sub.id}</strong>
                  </td>
                  <td>{sub.pocName || '—'}</td>
                  <td>
                    <span className="kmt-doc-card__rsa-status">{sub.status?.replace(/_/g, ' ')}</span>
                  </td>
                  <td>{sub.updated || '—'}</td>
                  <td className="kmt-reports-table__actions">
                    <div className="kmt-reports-table__action-row">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                          navigate(`/kmt/rsaui-submission/${encodeURIComponent(sub.id)}`, { state: { kmtEdit: false } })
                        }
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                          navigate(`/kmt/rsaui-submission/${encodeURIComponent(sub.id)}`, { state: { kmtEdit: true } })
                        }
                      >
                        Edit
                      </button>
                      {resolvedQueue === 'review' && sub.status === RSA_STATUS.Pending_KMT && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => publishRsaSubmission(sub)}>
                          Publish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {resolvedType === 'rsaui' && rsaFiltered.length === 0 && (
          <p className="kmt-reports__empty">No RSAUI submissions in this queue.</p>
        )}
      </div>
    </>
  )
}

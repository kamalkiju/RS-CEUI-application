import { useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useDocs } from '../../context/DocContext.jsx'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import { getDisplayStatus } from '../../utils/documentStatus.js'
import VersionBadge from '../../components/VersionBadge.jsx'

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
  const { stream: streamParam, queue: queueParam } = useParams()
  const stream = streamParam === 'rsaui' ? 'rsaui' : 'ceui'
  const resolvedQueue = queueParam || 'review'
  const navigate = useNavigate()
  const { docs, updateDoc } = useDocs()
  const { submissions, RSA_STATUS, approveKMT } = useRsaUI()
  const [search, setSearch] = useState('')

  const knowledgeFiltered = useMemo(() => {
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
  }, [docs, resolvedQueue, search])

  const rsaFiltered = useMemo(() => {
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
  }, [submissions, resolvedQueue, RSA_STATUS, search])

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
  const showCeui = stream === 'ceui'
  const showRsaui = stream === 'rsaui'
  const hasKnowledge = showCeui && knowledgeFiltered.length > 0
  const hasRsa = showRsaui && rsaFiltered.length > 0

  return (
    <>
      <div className="kmt-reports__toolbar">
        <input
          className="kmt-input kmt-reports__search"
          type="search"
          aria-label="Search in this queue"
          placeholder="Search by title, POC, email, area, LOB, market, ID, status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="kmt-reports__table-wrap">
        {showCeui && (
          <>
            <h3 className="kmt-reports__section-title">CEUI knowledge documents</h3>
            {hasKnowledge ? (
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
                    const pocUpdate =
                      resolvedQueue === 'review' &&
                      doc.status === 'Pending_KMT' &&
                      (doc.poc_updated_sections?.length > 0 ||
                        doc.poc_updated_fields?.length > 0 ||
                        Boolean(doc.pocResubmissionNote?.trim?.()))
                    return (
                      <tr key={doc.id}>
                        <td>
                          <strong>{doc.sub || doc.id}</strong>
                          {pocUpdate && (
                            <span className="queue-poc-update-badge" style={{ marginLeft: 8 }} title="POC updated since last rejection">
                              POC update
                            </span>
                          )}
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
            ) : (
              <p className="kmt-reports__empty">No CEUI documents in this queue.</p>
            )}
          </>
        )}

        {showRsaui && (
          <>
            <h3 className={`kmt-reports__section-title${showCeui ? ' kmt-reports__section-title--spaced' : ''}`}>RSAUI service-area submissions</h3>
            {hasRsa ? (
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
                  {rsaFiltered.map(sub => {
                    const pocUpdate =
                      resolvedQueue === 'review' &&
                      sub.status === RSA_STATUS.Pending_KMT &&
                      Boolean(sub.pocResubmissionNote?.trim?.())
                    return (
                    <tr key={sub.id}>
                      <td>
                        <strong>{sub.serviceArea?.name || sub.id}</strong>
                        {pocUpdate && (
                          <span
                            className="queue-poc-update-badge queue-poc-update-badge--rsa"
                            style={{ marginLeft: 8 }}
                            title="POC resubmitted with a note for reviewers"
                          >
                            POC update
                          </span>
                        )}
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
                              navigate(`/kmt/rsaui-submission/${encodeURIComponent(sub.id)}`, { state: {} })
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
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="kmt-reports__empty">No RSAUI submissions in this queue.</p>
            )}
          </>
        )}

      </div>
    </>
  )
}

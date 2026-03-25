import { useEffect, useState } from 'react'
import { fetchDocumentComments } from '../utils/bufmDocumentComments.js'

function initials(name) {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/)
  return (p[0]?.[0] || '') + (p[1]?.[0] || p[0]?.[1] || '').toUpperCase()
}

/**
 * Pulse / Comments card — timeline + optional add comment (BUFM review).
 */
export default function DocumentPulseComments({
  documentId,
  getDocumentById,
  updateDoc,
  viewerName = 'BUFM',
  revision = 0,
  allowAddComment = true,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchDocumentComments(documentId, getDocumentById).then(data => {
      if (!cancelled) {
        setRows(Array.isArray(data) ? data : [])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [documentId, getDocumentById, revision])

  const handlePost = () => {
    const text = draft.trim()
    if (!text || !updateDoc) return
    const doc = getDocumentById(documentId)
    if (!doc) return
    setPosting(true)
    try {
      const now = new Date()
      const dateStr = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
      const entry = {
        comment_text: text,
        comment_by_role: 'BUFM',
        comment_by_name: viewerName,
        comment_date: dateStr,
        kind: 'pulse',
      }
      updateDoc(documentId, {
        pulseComments: [...(doc.pulseComments || []), entry],
      })
      setDraft('')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="pulse-comments">
      <div className="pulse-comments__head">
        <div className="pulse-comments__head-icon" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="pulse-comments__title">Pulse / Comments ({rows.length})</h3>
          <p className="pulse-comments__sub">Document activity log and team comments.</p>
        </div>
      </div>
      <div className="pulse-comments__divider" />

      {loading ? (
        <p className="pulse-comments__loading">Loading…</p>
      ) : (
        <ul className="pulse-comments__list">
          {rows.map((row, i) => {
            const isSystem = row.comment_by_role === 'System'
            const displayName = row.comment_by_name || row.comment_by_role
            return (
              <li key={`${row.kind}-${row.comment_date}-${i}`} className="pulse-comments__item">
                <div className={`pulse-comments__avatar${isSystem ? ' pulse-comments__avatar--system' : ''}`}>
                  {isSystem ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  ) : (
                    <span>{initials(displayName)}</span>
                  )}
                </div>
                <div className="pulse-comments__body">
                  <div className="pulse-comments__item-head">
                    <span className={`pulse-comments__name${isSystem ? ' pulse-comments__name--system' : ''}`}>
                      {displayName}
                    </span>
                    <span className="pulse-comments__time">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {row.comment_date}
                    </span>
                    {isSystem && <span className="pulse-comments__pill">System</span>}
                  </div>
                  <p className={`pulse-comments__text${isSystem ? ' pulse-comments__text--system' : ''}`}>
                    {row.comment_text}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {allowAddComment && updateDoc && (
        <div className="pulse-comments__composer">
          <label className="pulse-comments__composer-label" htmlFor="pulse-new-comment">Add comment</label>
          <textarea
            id="pulse-new-comment"
            className="pulse-comments__textarea"
            rows={3}
            placeholder="Share an update for the team (visible on this document timeline)…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <div className="pulse-comments__composer-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!draft.trim() || posting}
              onClick={handlePost}
            >
              Post comment
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { fetchDocumentComments } from '../utils/bufmDocumentComments.js'

/**
 * Vertical timeline — comment_text, comment_by_role, comment_date (from GET /documents/:id/comments simulation).
 */
export default function CommentTimeline({ documentId, getDocumentById }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

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
  }, [documentId, getDocumentById])

  if (loading) {
    return <p className="comment-timeline__loading">Loading comment timeline…</p>
  }

  if (!rows.length) {
    return <p className="comment-timeline__empty">No comments yet.</p>
  }

  return (
    <div className="comment-timeline">
      <h3 className="comment-timeline__title">Comment timeline</h3>
      <ul className="comment-timeline__list">
        {rows.map((row, i) => (
          <li key={`${row.comment_date}-${i}`} className="comment-timeline__item">
            <div className="comment-timeline__dot" />
            <div className="comment-timeline__card">
              <div className="comment-timeline__meta">
                <span className="comment-timeline__role">{row.comment_by_role}</span>
                <span className="comment-timeline__date">{row.comment_date}</span>
              </div>
              <p className="comment-timeline__text">{row.comment_text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

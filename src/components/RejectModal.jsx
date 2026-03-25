import { useState, useEffect } from 'react'

/**
 * BUFM / KMT rejection — comment is required.
 */
export default function RejectModal({ open, title, onClose, onConfirm, roleLabel = 'Reviewer' }) {
  const [comment, setComment] = useState('')
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (open) {
      setComment('')
      setErr(false)
    }
  }, [open])

  if (!open) return null

  const submit = () => {
    const t = comment.trim()
    if (!t) {
      setErr(true)
      return
    }
    onConfirm(t)
    onClose()
  }

  return (
    <div className="reject-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="reject-modal" role="dialog" aria-labelledby="reject-modal-title">
        <h2 id="reject-modal-title" className="reject-modal__title">{title || 'Reject submission'}</h2>
        <p className="reject-modal__sub">{roleLabel} — a comment is required for the POC to address feedback.</p>
        <label className="reject-modal__label" htmlFor="reject-comment">Comment <span className="req">*</span></label>
        <textarea
          id="reject-comment"
          className={`reject-modal__textarea${err ? ' reject-modal__textarea--err' : ''}`}
          rows={5}
          value={comment}
          onChange={e => { setComment(e.target.value); setErr(false) }}
          placeholder="Explain what must change before resubmission…"
        />
        {err && <p className="reject-modal__err">Please enter a comment.</p>}
        <div className="reject-modal__actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary reject-modal__confirm" onClick={submit}>
            Save rejection
          </button>
        </div>
      </div>
    </div>
  )
}

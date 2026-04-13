import { useState, useEffect } from 'react'

/**
 * BUFM / KMT rejection — comment required. Optional audit trail: sections / fields to highlight for POC.
 */
export default function RejectModal({
  open,
  title,
  onClose,
  onConfirm,
  roleLabel = 'Reviewer',
  enableAuditTrail = false,
}) {
  const [comment, setComment] = useState('')
  const [sections, setSections] = useState('')
  const [fields, setFields] = useState('')
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (open) {
      setComment('')
      setSections('')
      setFields('')
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
    if (enableAuditTrail) {
      onConfirm({
        comment: t,
        highlightSections: sections
          .split(/[,;\n]/)
          .map(s => s.trim())
          .filter(Boolean),
        highlightFields: fields
          .split(/[,;\n]/)
          .map(s => s.trim())
          .filter(Boolean),
      })
    } else {
      onConfirm(t)
    }
    onClose()
  }

  return (
    <div className="reject-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="reject-modal reject-modal--wide" role="dialog" aria-labelledby="reject-modal-title">
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

        {enableAuditTrail && (
          <>
            <p className="reject-modal__audit-hint">
              Audit trail (optional): list wizard <strong>sections</strong> or <strong>fields</strong> the POC should focus on — shown as highlights when they rework the document.
            </p>
            <label className="reject-modal__label" htmlFor="reject-sections">Sections to highlight</label>
            <textarea
              id="reject-sections"
              className="reject-modal__textarea reject-modal__textarea--sm"
              rows={2}
              value={sections}
              onChange={e => setSections(e.target.value)}
              placeholder="e.g. Knowledge Area, Fees — comma or newline separated"
            />
            <label className="reject-modal__label" htmlFor="reject-fields">Fields to highlight</label>
            <textarea
              id="reject-fields"
              className="reject-modal__textarea reject-modal__textarea--sm"
              rows={2}
              value={fields}
              onChange={e => setFields(e.target.value)}
              placeholder="e.g. Contract effective date, Recycling contamination — comma or newline separated"
            />
          </>
        )}

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

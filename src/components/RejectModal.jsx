import { useState, useEffect } from 'react'
import { buildFeedbackItem, buildHighlightsFromFeedbackItems } from '../utils/reviewFeedback.js'

const emptyRow = () => ({ scope: 'section', label: '', comment: '' })

/**
 * BUFM / KMT rejection — comment required. Optional structured audit: section/field rows with per-item comments.
 */
/** CEUI knowledge wizard vs RSAUI service-area submission — adjusts examples and placeholders. */
const VARIANT = { ceui: 'ceui', rsa: 'rsa' }

export default function RejectModal({
  open,
  title,
  onClose,
  onConfirm,
  roleLabel = 'Reviewer',
  enableAuditTrail = false,
  /** @type {'ceui' | 'rsa'} */
  variant = VARIANT.ceui,
  /** Pre-fill audit rows from on-document picks: { scope, label } */
  initialFeedbackRows = null,
}) {
  const [comment, setComment] = useState('')
  const [rows, setRows] = useState([emptyRow()])
  const [err, setErr] = useState(false)
  const [rowErr, setRowErr] = useState('')

  const initialKey =
    initialFeedbackRows && initialFeedbackRows.length
      ? JSON.stringify(initialFeedbackRows.map(r => ({ scope: r.scope, label: r.label })))
      : ''

  useEffect(() => {
    if (!open) return
    setComment('')
    setErr(false)
    setRowErr('')
    if (enableAuditTrail && initialFeedbackRows?.length) {
      const seeded = initialFeedbackRows.map(r => ({
        scope: r.scope === 'field' ? 'field' : 'section',
        label: String(r.label || '').trim(),
        comment: String(r.comment || '').trim(),
      }))
      setRows([...seeded, emptyRow()])
    } else {
      setRows([emptyRow()])
    }
  }, [open, enableAuditTrail, initialKey])

  if (!open) return null

  const isRsa = variant === VARIANT.rsa
  const auditHint = isRsa ? (
    <>
      <strong>Specific feedback (recommended):</strong> add one row per RSAUI section or field label. Use the same names as on the submission (e.g.{' '}
      <em>Service area details</em>, <em>Division</em>, <em>Categories</em>, <em>Polygon ID</em>) so the POC view highlights them.
    </>
  ) : (
    <>
      <strong>Specific feedback (recommended):</strong> add one row per section or field. Use the same names as in the document (e.g. <em>Fees</em>,{' '}
      <em>Contract effective date</em>) so the POC view can highlight them.
    </>
  )
  const labelPlaceholder = isRsa
    ? 'e.g. Service area details / Division / Categories'
    : 'e.g. Fees / Knowledge Area'

  const updateRow = (index, patch) => {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    setRowErr('')
  }

  const addRow = () => setRows(prev => [...prev, emptyRow()])
  const removeRow = index => {
    setRows(prev => (prev.length <= 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)))
    setRowErr('')
  }

  const submit = () => {
    const t = comment.trim()
    if (!t) {
      setErr(true)
      return
    }

    if (enableAuditTrail) {
      const feedbackItems = []
      for (const r of rows) {
        const label = r.label.trim()
        const c = r.comment.trim()
        if (!label && !c) continue
        if (!label || !c) {
          setRowErr('Each started row needs both a label and a comment (or clear the row).')
          return
        }
        const item = buildFeedbackItem(r.scope, label, c)
        if (item) feedbackItems.push(item)
      }
      const { highlightSections, highlightFields } = buildHighlightsFromFeedbackItems(feedbackItems)
      onConfirm({
        comment: t,
        feedbackItems,
        highlightSections,
        highlightFields,
      })
    } else {
      onConfirm(t)
    }
    onClose()
  }

  return (
    <div className="reject-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="reject-modal reject-modal--wide" role="dialog" aria-labelledby="reject-modal-title">
        <div className="reject-modal__scroll">
          <h2 id="reject-modal-title" className="reject-modal__title">{title || 'Reject submission'}</h2>
          <p className="reject-modal__sub">
            {roleLabel} — a summary comment is required for the POC to address feedback.
            {isRsa && ' Labels should match the RSAUI read-only detail view (task, requestor, service area, categories).'}
          </p>
          <label className="reject-modal__label" htmlFor="reject-comment">Summary comment <span className="req">*</span></label>
          <textarea
            id="reject-comment"
            className={`reject-modal__textarea${err ? ' reject-modal__textarea--err' : ''}`}
            rows={5}
            value={comment}
            onChange={e => { setComment(e.target.value); setErr(false) }}
            placeholder="Summarize what must change before resubmission…"
          />
          {err && <p className="reject-modal__err">Please enter a comment.</p>}

          {enableAuditTrail && (
            <>
              <p className="reject-modal__audit-hint">{auditHint}</p>
              {isRsa && (
                <datalist id="rsa-reject-labels">
                  <option value="Task details" />
                  <option value="Requestor information" />
                  <option value="Service area details" />
                  <option value="Categories" />
                  <option value="Creator Name" />
                  <option value="Requestor name" />
                  <option value="Service area name" />
                  <option value="Polygon ID" />
                  <option value="Division" />
                  <option value="Effective Date" />
                  <option value="Expiration Date" />
                </datalist>
              )}
              <div className="reject-modal__feedback-rows">
                {rows.map((r, i) => (
                  <div key={i} className="reject-modal__feedback-row">
                    <div className="reject-modal__feedback-row-head">
                      <select
                        className="reject-modal__select"
                        aria-label={`Row ${i + 1} scope`}
                        value={r.scope}
                        onChange={e => updateRow(i, { scope: e.target.value })}
                      >
                        <option value="section">Section</option>
                        <option value="field">Field</option>
                      </select>
                      <button type="button" className="btn btn-text btn-sm reject-modal__row-remove" onClick={() => removeRow(i)}>
                        Remove
                      </button>
                    </div>
                    <label className="reject-modal__label reject-modal__label--sm" htmlFor={`rf-label-${i}`}>
                      Section or field label
                    </label>
                    <input
                      id={`rf-label-${i}`}
                      className="reject-modal__input"
                      value={r.label}
                      onChange={e => updateRow(i, { label: e.target.value })}
                      placeholder={labelPlaceholder}
                      list={isRsa ? 'rsa-reject-labels' : undefined}
                    />
                    <label className="reject-modal__label reject-modal__label--sm" htmlFor={`rf-com-${i}`}>
                      Comment for this item
                    </label>
                    <textarea
                      id={`rf-com-${i}`}
                      className="reject-modal__textarea reject-modal__textarea--sm"
                      rows={2}
                      value={r.comment}
                      onChange={e => updateRow(i, { comment: e.target.value })}
                      placeholder="What to fix here…"
                    />
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-outline btn-sm reject-modal__add-row" onClick={addRow}>
                + Add section / field
              </button>
              {rowErr && <p className="reject-modal__err">{rowErr}</p>}
            </>
          )}
        </div>

        <div className="reject-modal__actions reject-modal__actions--footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary reject-modal__confirm" onClick={submit}>
            Save rejection
          </button>
        </div>
      </div>
    </div>
  )
}

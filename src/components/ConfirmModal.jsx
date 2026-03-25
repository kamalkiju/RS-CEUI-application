export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger, onClose, onConfirm }) {
  if (!open) return null
  return (
    <div className="confirm-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="confirm-modal" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
        <h2 className="confirm-modal__title">{title}</h2>
        {message && <p className="confirm-modal__msg">{message}</p>}
        <div className="confirm-modal__actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-primary' : 'btn-primary'}`}
            style={danger ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}
            onClick={() => {
              onConfirm?.()
              onClose?.()
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

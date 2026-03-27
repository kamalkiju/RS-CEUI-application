import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Full-viewport read-only document shell for RSA submission summaries (POC / KMT / BUFM).
 */
export default function RsaDocumentFullscreenModal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="rsa-doc-fullscreen" role="dialog" aria-modal="true" aria-labelledby="rsa-doc-fs-title">
      <header className="rsa-doc-fullscreen__bar">
        <div className="rsa-doc-fullscreen__bar-text">
          <h2 id="rsa-doc-fs-title" className="rsa-doc-fullscreen__title">
            {title || 'Document'}
          </h2>
          {subtitle ? <p className="rsa-doc-fullscreen__sub">{subtitle}</p> : null}
        </div>
        <button type="button" className="btn btn-outline rsa-doc-fullscreen__close" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="rsa-doc-fullscreen__body">{children}</div>
    </div>,
    document.body,
  )
}

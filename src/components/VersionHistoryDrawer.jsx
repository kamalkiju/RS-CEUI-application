import { buildMockVersionHistory } from '../utils/documentVersion.js'

export default function VersionHistoryDrawer({ open, onClose, doc, viewerRole = 'POC' }) {
  if (!open) return null
  const entries = doc ? buildMockVersionHistory(doc, viewerRole) : []

  return (
    <div className="version-history-backdrop" role="presentation" onClick={onClose}>
      <aside className="version-history-drawer" onClick={e => e.stopPropagation()} aria-label="Version history">
        <div className="version-history-drawer__head">
          <h2>Version history</h2>
          <button type="button" className="version-history-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="version-history-drawer__sub">{doc?.sub || doc?.id || 'Document'}</p>
        <ul className="version-history-timeline">
          {entries.map((e, i) => (
            <li key={e.id}>
              <button type="button" className={`version-history-timeline__item version-history-timeline__item--${e.tone}`}>
                <span className="version-history-timeline__dot" />
                <span className="version-history-timeline__line" aria-hidden={i === entries.length - 1} />
                <div className="version-history-timeline__body">
                  <div className="version-history-timeline__title">{e.title}</div>
                  {e.detail && <div className="version-history-timeline__detail">{e.detail}</div>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

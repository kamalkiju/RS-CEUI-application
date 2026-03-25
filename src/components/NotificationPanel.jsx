import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'

const TYPE_STYLES = {
  approval: { color: '#166534', bg: '#e8f5e9', icon: '✓' },
  rejection: { color: '#b91c1c', bg: '#fef2f2', icon: '✕' },
  pending: { color: '#b45309', bg: '#fef9e7', icon: '◷' },
  reminder: { color: '#c2410c', bg: '#fff7ed', icon: '⏱' },
  delegation: { color: '#6b21a8', bg: '#f5f3ff', icon: '⇄' },
  publish: { color: '#1256a3', bg: '#e0f2fe', icon: '▣' },
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function NotificationPanel({ open, onClose }) {
  const { user } = useAuth()
  const { getNotificationsForRole, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')

  const list = user?.role ? getNotificationsForRole(user.role) : []
  const filtered = tab === 'unread' ? list.filter(n => !n.isRead) : list

  if (!open) return null

  const role = user?.role

  return (
    <div className="notif-panel-backdrop" role="presentation" onClick={onClose}>
      <aside className="notif-panel" onClick={e => e.stopPropagation()}>
        <header className="notif-panel__head">
          <h2 className="notif-panel__title">Notifications</h2>
          <div className="notif-panel__head-actions">
            <button type="button" className="notif-panel__link" onClick={() => role && markAllRead(role)}>
              Mark all read
            </button>
            <button type="button" className="notif-panel__close" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </header>

        <nav className="notif-panel__tabs" aria-label="Filter">
          <button type="button" className={`notif-panel__tab${tab === 'all' ? ' notif-panel__tab--active' : ''}`} onClick={() => setTab('all')}>
            All
          </button>
          <button
            type="button"
            className={`notif-panel__tab${tab === 'unread' ? ' notif-panel__tab--active' : ''}`}
            onClick={() => setTab('unread')}
          >
            Unread
          </button>
        </nav>

        <ul className="notif-panel__list">
          {filtered.map(n => {
            const st = TYPE_STYLES[n.statusType] || TYPE_STYLES.pending
            return (
              <li key={n.id} className={`notif-card${n.isRead ? '' : ' notif-card--unread'}`}>
                <div className="notif-card__icon" style={{ background: st.bg, color: st.color }}>
                  {st.icon}
                </div>
                <div className="notif-card__body">
                  <div className="notif-card__title">{n.title}</div>
                  <p className="notif-card__msg">{n.message}</p>
                  <div className="notif-card__meta">
                    <span>{n.actor}</span>
                    {n.documentName && n.documentName !== '—' && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{n.documentName}</span>
                      </>
                    )}
                  </div>
                  <div className="notif-card__time">{formatTime(n.timestamp)}</div>
                  <div className="notif-card__actions">
                    {n.ctaAction?.path && (
                      <button
                        type="button"
                        className="btn btn-primary kmt-btn-compact"
                        onClick={() => {
                          markRead(n.id)
                          navigate(n.ctaAction.path)
                          onClose?.()
                        }}
                      >
                        {n.ctaAction.label}
                      </button>
                    )}
                    {!n.isRead && (
                      <button type="button" className="btn btn-outline kmt-btn-compact" onClick={() => markRead(n.id)}>
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {filtered.length === 0 && <p className="notif-panel__empty">No notifications.</p>}
      </aside>
    </div>
  )
}

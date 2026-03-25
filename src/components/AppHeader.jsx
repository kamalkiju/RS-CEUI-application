import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import NotificationPanel from './NotificationPanel.jsx'

export default function AppHeader({ onMobileMenuClick, isMobile }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { unreadCountForRole } = useNotifications()
  const [panelOpen, setPanelOpen] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const unread = user?.role ? unreadCountForRole(user.role) : 0

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <header className="app-header">
        {isMobile && (
          <button
            className="mobile-menu-btn"
            onClick={onMobileMenuClick}
            aria-label="Open menu"
            style={{ display: 'flex' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        )}

        <div className="header-spacer" />

        <button
          type="button"
          className="header-notif-btn"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          onClick={() => setPanelOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unread > 0 && <span className="header-notif-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>

        <div className="header-user">
          <div className="header-avatar">{initials}</div>
          <div>
            <div className="header-user-name">{user?.name || 'User'}</div>
            <div className="header-user-role">{user?.role || ''}</div>
          </div>
        </div>

        <button className="header-logout-btn" onClick={handleLogout} title="Sign out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Logout</span>
        </button>
      </header>

      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  )
}

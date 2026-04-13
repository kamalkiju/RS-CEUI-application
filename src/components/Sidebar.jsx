import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import RsAppBrand from './RsAppBrand.jsx'

const ICON_OVERVIEW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const ICON_REPORT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

const ICON_USERS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const ICON_SETTINGS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const ICON_DOC = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const ICON_SERVICE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const ICON_DELEGATION = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="3" />
    <circle cx="16" cy="10" r="3" />
    <path d="M8 14v4M16 16v2" />
    <path d="M11 10h2l2 2" />
  </svg>
)

/** POC: knowledge list, RSA-style review & create service, settings */
const NAV_ITEMS_POC = [
  { label: 'Knowledge Documents', path: '/poc', icon: ICON_DOC },
  { label: 'Document Review', path: '/poc/document-review', icon: ICON_REPORT },
  { label: 'Create service area', path: '/poc/service-area', icon: ICON_SERVICE },
  { label: 'Settings', path: '/poc/settings', icon: ICON_SETTINGS },
]

const NAV_ITEMS_BUFM = [
  { label: 'Dashboard', path: '/bufm', icon: ICON_OVERVIEW },
  { label: 'Document Review', path: '/bufm/document-review', icon: ICON_REPORT },
  { label: 'Users', path: '/bufm/users', icon: ICON_USERS },
  { label: 'Settings', path: '/bufm/settings', icon: ICON_SETTINGS },
]

/** KMT: documents & templates before document review (per unified nav order) */
const NAV_ITEMS_KMT = [
  { label: 'Dashboard', path: '/kmt', icon: ICON_OVERVIEW },
  {
    label: 'Documents',
    path: '/kmt/documents',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  { label: 'Document Review', path: '/kmt/document-review', icon: ICON_REPORT },
  { label: 'Users', path: '/kmt/users', icon: ICON_USERS },
  { label: 'Delegations', path: '/kmt/delegations', icon: ICON_DELEGATION },
  { label: 'Settings', path: '/kmt/settings', icon: ICON_SETTINGS },
]

function getNavItems(role) {
  if (role === 'BUFM') return NAV_ITEMS_BUFM
  if (role === 'KMT') return NAV_ITEMS_KMT
  return NAV_ITEMS_POC
}

function isNavPathActive(pathname, path) {
  if (!path || path === '#') return false
  if (path === '/poc') return pathname === '/poc' || pathname === '/poc/'
  if (path === '/poc/document-review') return pathname.startsWith('/poc/document-review')
  if (path === '/poc/service-area') return pathname.startsWith('/poc/service-area')
  if (path === '/poc/settings') return pathname.startsWith('/poc/settings')
  if (path === '/bufm') return pathname === '/bufm' || pathname === '/bufm/'
  if (path === '/bufm/document-review') return pathname.startsWith('/bufm/document-review')
  if (path === '/bufm/users') return pathname.startsWith('/bufm/users')
  if (path === '/bufm/settings') return pathname.startsWith('/bufm/settings')
  if (path === '/kmt') return pathname === '/kmt' || pathname === '/kmt/'
  if (path === '/kmt/documents') return pathname.startsWith('/kmt/documents')
  if (path === '/kmt/document-review') {
    return (
      pathname.startsWith('/kmt/document-review') ||
      pathname.startsWith('/kmt/edit') ||
      pathname.startsWith('/kmt/escalate') ||
      pathname.startsWith('/kmt/extend') ||
      pathname.startsWith('/kmt/archive')
    )
  }
  if (path === '/kmt/users') return pathname.startsWith('/kmt/users')
  if (path === '/kmt/delegations') return pathname.startsWith('/kmt/delegations')
  if (path === '/kmt/settings') return pathname.startsWith('/kmt/settings')
  return pathname === path || pathname.startsWith(`${path}/`)
}

function isParentActive(item, pathname) {
  if (!item.children) return false
  return item.children.some(sub => isNavPathActive(pathname, sub.path))
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState(null)

  const navItems = getNavItems(user?.role)

  useEffect(() => {
    const items = getNavItems(user?.role)
    for (const item of items) {
      if (!item.children) continue
      const hit = item.children.some(sub => isNavPathActive(location.pathname, sub.path))
      if (hit) {
        setOpenMenu(item.label)
        return
      }
    }
    setOpenMenu(null)
  }, [location.pathname, user?.role])

  return (
    <>
      {mobileOpen && (
        <div className="overlay active" onClick={onClose} />
      )}

      <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-header">
          <button type="button" className="hamburger" onClick={onToggle} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
          <div className="sidebar-brand-wrap">
            <RsAppBrand appLabel="CEUI" variant="sidebar" />
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            if (item.children) {
              const parentActive = isParentActive(item, location.pathname)
              return (
                <div key={item.label}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`nav-item nav-item--parent${parentActive ? ' active' : ''}`}
                    onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpenMenu(openMenu === item.label ? null : item.label)
                      }
                    }}
                  >
                    {item.icon}
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-item-chevron" aria-hidden>
                      {openMenu === item.label ? '▼' : '▶'}
                    </span>
                  </div>

                  {openMenu === item.label && (
                    <div className="nav-submenu">
                      {item.children.map(sub => {
                        const subActive = isNavPathActive(location.pathname, sub.path)
                        return (
                          <div
                            key={sub.label}
                            role="button"
                            tabIndex={0}
                            className={`nav-subitem${subActive ? ' nav-subitem--active' : ''}`}
                            onClick={() => {
                              navigate(sub.path)
                              onClose?.()
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                navigate(sub.path)
                                onClose?.()
                              }
                            }}
                          >
                            {sub.label}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const isActive = isNavPathActive(location.pathname, item.path)
            return (
              <a
                key={item.label}
                className={`nav-item${isActive ? ' active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  if (item.path !== '#') {
                    navigate(item.path)
                    onClose?.()
                  }
                }}
                href={item.path}
              >
                {item.icon}
                <span className="nav-label">{item.label}</span>
              </a>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

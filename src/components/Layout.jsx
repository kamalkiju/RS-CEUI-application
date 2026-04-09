import { useState, useEffect } from 'react'
import Sidebar from './Sidebar.jsx'
import AppHeader from './AppHeader.jsx'

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900)

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen(prev => !prev)
    } else {
      setCollapsed(prev => !prev)
    }
  }

  const handleClose = () => setMobileOpen(false)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 900
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const mainStyle = isMobile
    ? { marginLeft: 0 }
    : { marginLeft: collapsed ? 64 : 220 }

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onClose={handleClose}
      />
      <div className="main" style={mainStyle}>
        <AppHeader
          onMobileMenuClick={handleToggle}
          isMobile={isMobile}
          showHeaderBrand={isMobile && !mobileOpen}
        />
        {children}
      </div>
    </>
  )
}

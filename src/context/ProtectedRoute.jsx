import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

const CEUI_HOME = {
  POC: '/poc',
  BUFM: '/bufm',
  KMT: '/kmt',
}

const RSAUI_HOME = {
  POC: '/rsaui/poc/document-review',
  BUFM: '/rsaui/bufm/dashboard',
  KMT: '/rsaui/kmt/dashboard',
}

/**
 * @param {{ role: 'POC'|'BUFM'|'KMT', app?: 'CEUI'|'RSAUI' }} props
 */
export default function ProtectedRoute({ role, app = 'CEUI' }) {
  const { user } = useAuth()
  const location = useLocation()

  const loginPath = app === 'RSAUI' ? '/rsaui/login' : '/login'
  const homes = app === 'RSAUI' ? RSAUI_HOME : CEUI_HOME

  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }

  const userApp = user.app || 'CEUI'

  if (userApp !== app) {
    const fallback = userApp === 'RSAUI' ? RSAUI_HOME[user.role] : CEUI_HOME[user.role]
    return <Navigate to={fallback || '/'} replace />
  }

  if (user.role !== role) {
    const redirect = homes[user.role] || loginPath
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

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

  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }

  const userApp = user.app || 'CEUI'

  if (userApp !== app) {
    let fallback = '/'
    if (userApp === 'RSAUI') fallback = RSAUI_HOME[user.role] || '/rsaui/login'
    else fallback = CEUI_HOME[user.role] || '/login'
    return <Navigate to={fallback} replace />
  }

  if (user.role !== role) {
    let redirect = loginPath
    if (app === 'RSAUI') redirect = RSAUI_HOME[user.role] || loginPath
    else redirect = CEUI_HOME[user.role] || loginPath
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

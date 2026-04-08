import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

const CEUI_HOME = {
  POC: '/poc',
  BUFM: '/bufm',
  KMT: '/kmt',
  IT: '/it/documents',
}

const RSAUI_HOME = {
  POC: '/rsaui/poc/document-review',
  BUFM: '/rsaui/bufm/dashboard',
  KMT: '/rsaui/kmt/dashboard',
}

const IT_HOME = '/it/documents'

/**
 * @param {{ role: 'POC'|'BUFM'|'KMT'|'IT', app?: 'CEUI'|'RSAUI'|'IT' }} props
 */
export default function ProtectedRoute({ role, app = 'CEUI' }) {
  const { user } = useAuth()
  const location = useLocation()

  const loginPath = app === 'RSAUI' ? '/rsaui/login' : app === 'IT' ? '/it/login' : '/login'

  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }

  const userApp = user.app || 'CEUI'

  if (userApp !== app) {
    let fallback = '/'
    if (userApp === 'RSAUI') fallback = RSAUI_HOME[user.role] || '/rsaui/login'
    else if (userApp === 'IT') fallback = IT_HOME
    else fallback = CEUI_HOME[user.role] || '/login'
    return <Navigate to={fallback} replace />
  }

  if (user.role !== role) {
    let redirect = loginPath
    if (app === 'RSAUI') redirect = RSAUI_HOME[user.role] || loginPath
    else if (app === 'IT') redirect = IT_HOME
    else redirect = CEUI_HOME[user.role] || loginPath
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

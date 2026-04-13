import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

const ROLE_HOME = {
  POC: '/poc',
  BUFM: '/bufm',
  KMT: '/kmt',
}

/**
 * @param {{ role: 'POC'|'BUFM'|'KMT' }} props
 */
export default function ProtectedRoute({ role }) {
  const { user } = useAuth()
  const location = useLocation()
  const loginPath = '/login'

  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }

  if (user.role !== role) {
    const redirect = ROLE_HOME[user.role] || loginPath
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

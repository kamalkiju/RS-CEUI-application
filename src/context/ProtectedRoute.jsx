import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

const ROLE_PATHS = { POC: '/poc', BUFM: '/bufm', KMT: '/kmt' }

export default function ProtectedRoute({ role }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    const redirect = ROLE_PATHS[user.role] || '/login'
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

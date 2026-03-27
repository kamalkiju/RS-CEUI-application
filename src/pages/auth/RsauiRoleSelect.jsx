import { Navigate } from 'react-router-dom'

/**
 * Role is chosen on the login screen (email, password, role dropdown).
 * Legacy route kept so old links still work.
 */
export default function RsauiRoleSelect() {
  return <Navigate to="/rsaui/login" replace />
}

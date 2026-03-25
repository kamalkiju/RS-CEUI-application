import { Navigate, useLocation } from 'react-router-dom'

/** Legacy: /bufm/reports/* → /bufm/document-review/* (and KMT equivalent). */
export default function DocumentReviewRedirect({ fromPrefix, toPrefix }) {
  const loc = useLocation()
  const to = loc.pathname.replace(fromPrefix, toPrefix) + loc.search
  return <Navigate to={to} replace />
}

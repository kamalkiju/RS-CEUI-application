import { Navigate, useLocation } from 'react-router-dom'

/**
 * Old bookmarks under /rsaui/* → unified CEUI routes.
 */
export default function LegacyRsauiRedirect() {
  const { pathname, search } = useLocation()

  let to = pathname

  if (pathname.startsWith('/rsaui/poc/create')) {
    to = pathname.replace('/rsaui/poc/create', '/poc/service-area')
  } else if (pathname.startsWith('/rsaui/poc')) {
    to = pathname.replace('/rsaui/poc', '/poc')
  } else if (pathname.startsWith('/rsaui/bufm')) {
    to = pathname.replace('/rsaui/bufm', '/bufm')
    if (to.startsWith('/bufm/document-review/')) {
      const rest = to.slice('/bufm/document-review/'.length)
      if (rest && !rest.startsWith('ceui/') && !rest.startsWith('rsaui/')) {
        const sub = rest.split('/')[0]
        to = `/bufm/document-review/rsaui/${sub}`
      }
    }
  } else if (pathname.startsWith('/rsaui/kmt')) {
    to = pathname.replace('/rsaui/kmt', '/kmt')
  } else if (pathname === '/rsaui' || pathname === '/rsaui/') {
    to = '/poc/document-review'
  }

  return <Navigate to={`${to}${search || ''}`} replace />
}

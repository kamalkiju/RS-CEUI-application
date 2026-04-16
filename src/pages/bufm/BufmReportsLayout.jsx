import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'

const CEUI_TABS = [
  { path: 'ceui/review', label: 'Review queue' },
  { path: 'ceui/rejected', label: 'Rejected' },
  { path: 'ceui/approved', label: 'Approved' },
  { path: 'ceui/expiry', label: 'Expiry queue' },
]

const RSAUI_TABS = [
  { path: 'rsaui/review', label: 'Review queue' },
  { path: 'rsaui/rejected', label: 'Rejected' },
  { path: 'rsaui/approved', label: 'Approved' },
  { path: 'rsaui/expiry', label: 'Expiry queue' },
]

export default function BufmReportsLayout() {
  const { pathname } = useLocation()
  const isRsauiStream = pathname.includes('/document-review/rsaui/')
  const stream = isRsauiStream ? 'rsaui' : 'ceui'
  const subTabs = stream === 'rsaui' ? RSAUI_TABS : CEUI_TABS

  return (
    <Layout>
      <div className="bufm-reports-page">
        <div className="bufm-reports-page__head">
          <h1 className="bufm-reports-page__title">Document Review</h1>
          <p className="bufm-reports-page__sub">
            CEUI knowledge documents and RSAUI service-area requests — choose a stream, then a queue.
          </p>
        </div>

        <nav className="bufm-reports-page__streams" aria-label="Document source">
          <NavLink
            to="ceui/review"
            className={() =>
              `bufm-reports-page__stream${!isRsauiStream ? ' bufm-reports-page__stream--active' : ''}`
            }
          >
            CEUI documents
          </NavLink>
          <NavLink
            to="rsaui/review"
            className={() =>
              `bufm-reports-page__stream${isRsauiStream ? ' bufm-reports-page__stream--active' : ''}`
            }
          >
            RSAUI service areas
          </NavLink>
        </nav>

        <nav className="bufm-reports-page__tabs" aria-label="Document review views">
          {subTabs.map(t => (
            <NavLink
              key={t.path}
              to={t.path}
              className={({ isActive }) =>
                `bufm-reports-page__tab${isActive ? ' bufm-reports-page__tab--active' : ''}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="bufm-reports-page__body">
          <Outlet />
        </div>
      </div>
    </Layout>
  )
}

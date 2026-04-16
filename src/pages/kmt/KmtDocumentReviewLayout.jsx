import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'

const CEUI_TABS = [
  { path: 'ceui/review', label: 'Review queue' },
  { path: 'ceui/rejected', label: 'Rejected' },
  { path: 'ceui/approved', label: 'Approved' },
]

const RSAUI_TABS = [
  { path: 'rsaui/review', label: 'Review queue' },
  { path: 'rsaui/rejected', label: 'Rejected' },
  { path: 'rsaui/approved', label: 'Approved' },
]

export default function KmtDocumentReviewLayout() {
  const { pathname } = useLocation()
  const isRsaui = pathname.includes('/document-review/rsaui/')
  const subTabs = isRsaui ? RSAUI_TABS : CEUI_TABS

  return (
    <Layout>
      <div className="kmt-page kmt-reports bufm-reports-page">
        <div className="bufm-reports-page__head">
          <h1 className="kmt-page__title">Document Review</h1>
          <p className="kmt-page__sub bufm-reports-page__sub">
            CEUI knowledge documents and RSAUI service-area submissions — pick a stream, then a queue.
          </p>
        </div>

        <nav className="bufm-reports-page__streams" aria-label="Document source">
          <NavLink
            to="ceui/review"
            className={() =>
              `bufm-reports-page__stream${!isRsaui ? ' bufm-reports-page__stream--active' : ''}`
            }
          >
            CEUI documents
          </NavLink>
          <NavLink
            to="rsaui/review"
            className={() =>
              `bufm-reports-page__stream${isRsaui ? ' bufm-reports-page__stream--active' : ''}`
            }
          >
            RSAUI submissions
          </NavLink>
        </nav>

        <nav className="kmt-reports__l2 bufm-reports-page__tabs" aria-label="Review status">
          {subTabs.map(t => (
            <NavLink
              key={t.path}
              to={t.path}
              className={({ isActive }) =>
                `kmt-reports__l2-tab bufm-reports-page__tab${isActive ? ' bufm-reports-page__tab--active kmt-reports__l2-tab--active' : ''}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="kmt-reports__body-outlet">
          <Outlet />
        </div>
      </div>
    </Layout>
  )
}

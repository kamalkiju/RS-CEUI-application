import { NavLink, Outlet } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'

const TABS = [
  { path: 'review', label: 'Review Queue' },
  { path: 'approved', label: 'Approved' },
  { path: 'rejected', label: 'Rejected' },
]

export default function BufmReportsLayout() {
  return (
    <Layout>
      <div className="bufm-reports-page">
        <div className="bufm-reports-page__head">
          <h1 className="bufm-reports-page__title">Document Review</h1>
          <p className="bufm-reports-page__sub">
            Knowledge documents — review queue, approved, and rejected (BUFM).
          </p>
        </div>
        <nav className="bufm-reports-page__tabs" aria-label="Document review views">
          {TABS.map(t => (
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

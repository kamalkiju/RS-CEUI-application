import { NavLink, Outlet } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'

const TABS = [
  { path: 'review', label: 'Review Queue' },
  { path: 'rejected', label: 'Rejected' },
  { path: 'approved', label: 'Approved' },
  { path: 'expiry', label: 'Expiry Documents' },
]

export default function KmtRsaShell() {
  const base = '/kmt/document-review/rsaui'

  return (
    <Layout>
      <div className="kmt-page kmt-reports kmt-rsa-shell">
        <div className="kmt-reports__head">
          <h1 className="kmt-page__title">Document Review</h1>
          <p className="kmt-page__sub">RSAUI — KMT publish queue, outcomes, rejected items, and expiring offerings.</p>
        </div>
        <nav className="kmt-rsa-tabs" aria-label="KMT document review">
          {TABS.map(t => (
            <NavLink
              key={t.path}
              to={`${base}/${t.path}`}
              className={({ isActive }) => `kmt-rsa-tabs__tab${isActive ? ' kmt-rsa-tabs__tab--active' : ''}`}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </Layout>
  )
}

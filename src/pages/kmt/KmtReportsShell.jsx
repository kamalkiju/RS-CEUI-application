import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'

const L1 = [
  { id: 'knowledge', label: 'Knowledge Documents' },
  { id: 'rsaui', label: 'RSAUI Documents' },
]

export default function KmtReportsShell() {
  const { pathname } = useLocation()

  return (
    <Layout>
      <div className="kmt-page kmt-reports">
        <div className="kmt-reports__head">
          <h1 className="kmt-page__title">Document Review</h1>
          <p className="kmt-page__sub">Knowledge and RSAUI documents — review, approved, and rejected.</p>
        </div>

        <nav className="kmt-reports__l1" aria-label="Document source">
          {L1.map(t => {
            const active = pathname.startsWith(`/kmt/document-review/${t.id}/`)
            return (
              <NavLink
                key={t.id}
                to={`/kmt/document-review/${t.id}/review`}
                className={() => `kmt-reports__l1-tab${active ? ' kmt-reports__l1-tab--active' : ''}`}
              >
                {t.label}
              </NavLink>
            )
          })}
        </nav>

        <Outlet />
      </div>
    </Layout>
  )
}

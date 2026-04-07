import { Outlet } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'

export default function KmtReportsShell() {
  return (
    <Layout>
      <div className="kmt-page kmt-reports">
        <div className="kmt-reports__head">
          <h1 className="kmt-page__title">Document Review</h1>
          <p className="kmt-page__sub">Knowledge documents and RSAUI submissions — review, approved, and rejected queues.</p>
        </div>

        <Outlet />
      </div>
    </Layout>
  )
}

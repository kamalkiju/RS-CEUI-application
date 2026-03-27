import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'

export default function RsauiPocDashboard() {
  const navigate = useNavigate()
  const { submissions, createDraft } = useRsaUI()

  const counts = useMemo(() => {
    const draft = submissions.filter(s => s.status === RSA_STATUS.Draft).length
    const awaiting = submissions.filter(
      s => s.status === RSA_STATUS.Pending_BUFM || s.status === RSA_STATUS.Pending_KMT,
    ).length
    const rejected = submissions.filter(
      s => s.status === RSA_STATUS.Rejected_BUFM || s.status === RSA_STATUS.Rejected_KMT,
    ).length
    const approved = submissions.filter(s => s.status === RSA_STATUS.Published).length
    return { draft, awaiting, rejected, approved }
  }, [submissions])

  const goReview = tab => {
    navigate(`/rsaui/poc/document-review?tab=${tab}`)
  }

  const createServiceArea = () => {
    const id = createDraft()
    navigate(`/rsaui/poc/create/select?submission=${encodeURIComponent(id)}&mode=edit`)
  }

  const cards = [
    {
      key: 'draft',
      label: 'Draft requests',
      value: counts.draft,
      sub: 'In progress — not submitted',
      border: '#94a3b8',
    },
    {
      key: 'awaiting',
      label: 'Awaiting approval',
      value: counts.awaiting,
      sub: 'Pending BUFM or KMT',
      border: '#1976d2',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: counts.rejected,
      sub: 'Returned for correction',
      border: '#e74c3c',
    },
    {
      key: 'approved',
      label: 'Approved service areas',
      value: counts.approved,
      sub: 'Published / live',
      border: '#27ae60',
    },
  ]

  return (
    <Layout>
      <main className="kd-main rsaui-poc-dash">
        <div className="kd-page-header">
          <div>
            <h1 className="kd-page-title">RSAUI · POC workspace</h1>
            <p className="kd-page-sub">
              Service area requests — jump to Document Review by status or create a new request.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={createServiceArea}>
            + Create Service Area
          </button>
        </div>

        <div className="rsaui-poc-dash__grid">
          {cards.map(c => (
            <button
              key={c.key}
              type="button"
              className="rsaui-poc-dash__card"
              style={{ borderLeftColor: c.border }}
              onClick={() => goReview(c.key)}
            >
              <span className="rsaui-poc-dash__card-value">{c.value}</span>
              <span className="rsaui-poc-dash__card-label">{c.label}</span>
              <span className="rsaui-poc-dash__card-sub">{c.sub}</span>
            </button>
          ))}
        </div>

        <p className="rsaui-poc-dash__hint">
          <button type="button" className="btn btn-text" onClick={() => goReview('all')}>
            Open full Document Review →
          </button>
        </p>
      </main>
    </Layout>
  )
}

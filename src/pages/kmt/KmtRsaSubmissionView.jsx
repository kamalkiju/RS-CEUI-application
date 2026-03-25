import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import RejectModal from '../../components/RejectModal.jsx'

export default function KmtRsaSubmissionView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const kmtEdit = Boolean(location.state?.kmtEdit)
  const { getSubmission, approveKMT, rejectKMT, patchSubmission, RSA_STATUS } = useRsaUI()
  const sub = id ? getSubmission(id) : null
  const [rejectOpen, setRejectOpen] = useState(false)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (!sub) {
      setDraft(null)
      return
    }
    setDraft({
      serviceArea: { ...sub.serviceArea },
      pricing: { ...sub.pricing },
      product: { ...sub.product },
    })
  }, [sub?.id])

  if (!sub) {
    return (
      <Layout>
        <div className="kmt-page kmt-rsa-view kmt-rsa-view--missing">
          <p>Submission not found.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/kmt/document-review/rsaui/review')}>
            Back to document review
          </button>
        </div>
      </Layout>
    )
  }

  const canPublish = sub.status === RSA_STATUS.Pending_KMT

  const saveEdits = () => {
    if (!draft) return
    patchSubmission(sub.id, {
      serviceArea: draft.serviceArea,
      pricing: draft.pricing,
      product: draft.product,
    })
  }

  const handlePublish = () => {
    approveKMT(sub.id)
    navigate('/kmt/document-review/rsaui/approved')
  }

  return (
    <Layout>
      <div className="kmt-page kmt-rsa-view">
        <header className="kmt-rsa-view__header">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="kmt-page__title">{sub.serviceArea?.name || sub.id}</h1>
            <p className="kmt-page__sub">
              RSAUI · <span className="kmt-doc-card__rsa-status">{sub.status?.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <div className="kmt-rsa-view__actions">
            {canPublish && (
              <button type="button" className="btn btn-primary" onClick={handlePublish}>
                Publish
              </button>
            )}
            {canPublish && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ color: 'var(--danger)', borderColor: '#fecaca' }}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </button>
            )}
          </div>
        </header>

        {kmtEdit && (
          <div className="kmt-doc-view__kmt-edit-banner" role="status">
            KMT edit mode — update submission fields below, then save. Use Publish when this submission is pending KMT.
          </div>
        )}

        {kmtEdit && draft ? (
          <div className="kmt-rsa-view__grid kmt-rsa-view__edit-grid">
            <section className="kmt-rsa-view__card">
              <h2>POC</h2>
              <p>
                <strong>Name</strong> {sub.pocName || '—'}
              </p>
            </section>
            <section className="kmt-rsa-view__card">
              <h2>Service area</h2>
              <label className="kmt-field">
                <span>Name</span>
                <input
                  className="kmt-input"
                  value={draft.serviceArea?.name || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      serviceArea: { ...d.serviceArea, name: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="kmt-field">
                <span>Division</span>
                <input
                  className="kmt-input"
                  value={draft.serviceArea?.division || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      serviceArea: { ...d.serviceArea, division: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="kmt-field">
                <span>Polygon ID</span>
                <input
                  className="kmt-input"
                  value={draft.serviceArea?.polygonId || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      serviceArea: { ...d.serviceArea, polygonId: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="kmt-field">
                <span>Service type</span>
                <input
                  className="kmt-input"
                  value={draft.serviceArea?.serviceType || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      serviceArea: { ...d.serviceArea, serviceType: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="kmt-field">
                <span>Notes</span>
                <textarea
                  className="kmt-input"
                  rows={3}
                  value={draft.serviceArea?.notes || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      serviceArea: { ...d.serviceArea, notes: e.target.value },
                    }))
                  }
                />
              </label>
            </section>
            <section className="kmt-rsa-view__card">
              <h2>Pricing</h2>
              <label className="kmt-field">
                <span>Model</span>
                <input
                  className="kmt-input"
                  value={draft.pricing?.model || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      pricing: { ...d.pricing, model: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="kmt-field">
                <span>Base rate</span>
                <input
                  className="kmt-input"
                  value={draft.pricing?.baseRate || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      pricing: { ...d.pricing, baseRate: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="kmt-field">
                <span>Surcharges</span>
                <input
                  className="kmt-input"
                  value={draft.pricing?.surcharges || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      pricing: { ...d.pricing, surcharges: e.target.value },
                    }))
                  }
                />
              </label>
            </section>
            <section className="kmt-rsa-view__card">
              <h2>Product</h2>
              <label className="kmt-field">
                <span>Name</span>
                <input
                  className="kmt-input"
                  value={draft.product?.name || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      product: { ...d.product, name: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="kmt-field">
                <span>SKU</span>
                <input
                  className="kmt-input"
                  value={draft.product?.sku || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      product: { ...d.product, sku: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="kmt-field">
                <span>Description</span>
                <textarea
                  className="kmt-input"
                  rows={3}
                  value={draft.product?.description || ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      product: { ...d.product, description: e.target.value },
                    }))
                  }
                />
              </label>
            </section>
            <div className="kmt-rsa-view__edit-actions">
              <button type="button" className="btn btn-primary" onClick={saveEdits}>
                Save changes
              </button>
            </div>
          </div>
        ) : (
          <div className="kmt-rsa-view__grid">
            <section className="kmt-rsa-view__card">
              <h2>POC</h2>
              <p>
                <strong>Name</strong> {sub.pocName || '—'}
              </p>
            </section>
            <section className="kmt-rsa-view__card">
              <h2>Service area</h2>
              <dl className="kmt-rsa-view__dl">
                {Object.entries(sub.serviceArea || {}).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="kmt-rsa-view__card">
              <h2>Pricing</h2>
              <dl className="kmt-rsa-view__dl">
                {Object.entries(sub.pricing || {}).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="kmt-rsa-view__card">
              <h2>Product</h2>
              <dl className="kmt-rsa-view__dl">
                {Object.entries(sub.product || {}).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        )}
      </div>

      <RejectModal
        open={rejectOpen}
        title="Reject RSAUI submission"
        roleLabel="KMT"
        onClose={() => setRejectOpen(false)}
        onConfirm={comment => {
          rejectKMT(sub.id, comment)
          navigate('/kmt/document-review/rsaui/rejected')
        }}
      />
    </Layout>
  )
}

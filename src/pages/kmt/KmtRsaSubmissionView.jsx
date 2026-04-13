import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import RejectModal from '../../components/RejectModal.jsx'
import RsaSubmissionDetailView from '../../components/rsa/RsaSubmissionDetailView.jsx'
import RsaDocumentFullscreenModal from '../../components/rsa/RsaDocumentFullscreenModal.jsx'

export default function KmtRsaSubmissionView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { getSubmission, approveKMT, rejectKMT, patchSubmission, RSA_STATUS } = useRsaUI()

  const paths = useMemo(
    () => ({
      review: '/kmt/document-review/review',
      approved: '/kmt/document-review/approved',
      rejected: '/kmt/document-review/rejected',
    }),
    [],
  )
  const decodedId = id ? decodeURIComponent(id) : ''
  const sub = decodedId ? getSubmission(decodedId) : null
  const [rejectOpen, setRejectOpen] = useState(false)
  const [draft, setDraft] = useState(null)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const canPublish = sub?.status === RSA_STATUS.Pending_KMT
  const canKmtFieldEdit =
    sub?.status === RSA_STATUS.Pending_KMT || sub?.status === RSA_STATUS.Published
  const showKmtFieldEditor =
    Boolean(sub) &&
    canKmtFieldEdit &&
    (Boolean(location.state?.kmtFieldEdit) || location.state?.kmtEdit === true)

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

  useEffect(() => {
    if (!sub || !location.state?.openReject) return
    setRejectOpen(true)
    navigate(location.pathname, { replace: true, state: {} })
  }, [sub?.id, location.state?.openReject, location.pathname, navigate, sub])

  if (!sub) {
    return (
      <Layout>
        <div className="kmt-page kmt-rsa-view kmt-rsa-view--missing">
          <p>Submission not found.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate(paths.review)}>
            Back to document review
          </button>
        </div>
      </Layout>
    )
  }

  const goViewOnly = () => {
    navigate({ pathname: location.pathname, search: location.search || '' }, { replace: true, state: {} })
  }

  const goFieldEdit = () => {
    navigate(
      { pathname: location.pathname, search: location.search || '' },
      { replace: true, state: { kmtFieldEdit: true } },
    )
  }

  const saveEdits = () => {
    if (!draft) return
    patchSubmission(sub.id, {
      serviceArea: draft.serviceArea,
      pricing: draft.pricing,
      product: draft.product,
    })
    window.alert('✓ Changes saved')
  }

  const handlePublish = () => {
    approveKMT(sub.id)
    navigate(paths.approved)
  }

  const rejectionNote =
    sub.status === RSA_STATUS.Rejected_BUFM
      ? sub.rejection_comment_BUFM || undefined
      : sub.status === RSA_STATUS.Rejected_KMT
        ? sub.rejection_comment_KMT || undefined
        : undefined

  const detailProps = {
    submission: sub,
    creatorName: sub.pocName || sub.requestMeta?.requestorName || '—',
    creatorEmail: sub.requestMeta?.requestorEmail || '—',
    unifiedPanel: true,
    showWorkflowTimeline: false,
    rejectionNote,
    rejectionTitle: sub.status === RSA_STATUS.Rejected_KMT ? 'KMT rejection' : 'BUFM rejection',
  }

  const fullscreenDetailProps = {
    ...detailProps,
    showWorkflowTimeline: false,
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
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setFullscreenOpen(true)}>
              Full screen
            </button>
            {canKmtFieldEdit && !showKmtFieldEditor && (
              <button type="button" className="btn btn-outline" onClick={goFieldEdit}>
                Edit details
              </button>
            )}
            {canKmtFieldEdit && showKmtFieldEditor && (
              <button type="button" className="btn btn-text btn-sm" onClick={goViewOnly}>
                View only
              </button>
            )}
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

        {showKmtFieldEditor && (
          <div className="kmt-doc-view__kmt-edit-banner" role="status">
            {canPublish
              ? 'Edit mode — the read-only summary stays above; update fields in the card below, then Save changes. Use View only to collapse the editor.'
              : 'Edit mode — published request. Update fields below, then Save changes. Use View only when done.'}
          </div>
        )}

        <div className="kmt-rsa-view__detail rsa-detail-view-wrap">
          <div className="rsa-read-surface rsa-read-surface--kmt">
            <RsaSubmissionDetailView {...detailProps} />
          </div>
        </div>

        {showKmtFieldEditor && draft ? (
          <div className="rsa-read-surface rsa-read-surface--kmt rsa-kmt-edit-surface rsa-detail-view-wrap">
            <div className="rsa-kmt-edit-surface__inner">
              <h2 className="rsa-kmt-edit-surface__title">Edit submission details</h2>
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
              </div>
            </div>
            <footer className="rsa-read-surface__footer">
              <button type="button" className="btn btn-outline" onClick={goViewOnly}>
                Cancel
              </button>
              <div className="rsa-read-surface__footer-right">
                <button type="button" className="btn btn-primary" onClick={saveEdits}>
                  Save changes
                </button>
              </div>
            </footer>
          </div>
        ) : null}
      </div>

      <RsaDocumentFullscreenModal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        title={sub.serviceArea?.name || sub.id}
        subtitle={`RSAUI · ${sub.status?.replace(/_/g, ' ') || '—'} · ${sub.id}`}
      >
        <div className="rsa-read-surface rsa-read-surface--kmt">
          <RsaSubmissionDetailView {...fullscreenDetailProps} />
        </div>
      </RsaDocumentFullscreenModal>

      <RejectModal
        open={rejectOpen}
        title="Reject RSAUI submission"
        roleLabel="KMT"
        onClose={() => setRejectOpen(false)}
        onConfirm={comment => {
          rejectKMT(sub.id, comment)
          navigate(paths.rejected)
        }}
      />
    </Layout>
  )
}

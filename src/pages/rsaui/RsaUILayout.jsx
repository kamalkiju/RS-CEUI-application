import { NavLink, Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'
import RejectionBanner from '../../components/RejectionBanner.jsx'

const TABS = [
  { to: '/rsaui/service-area', label: 'Service Area', end: false },
  { to: '/rsaui/pricing', label: 'Pricing', end: false },
  { to: '/rsaui/products', label: 'Product', end: false },
]

const STEP_PATHS = TABS.map(t => t.to)

export default function RsaUILayout() {
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const submissionId = sp.get('submission') || ''
  const mode = sp.get('mode') === 'view' ? 'view' : 'edit'
  const { getSubmission, saveDraft, submitToBufm, createDraft, removeSubmission } = useRsaUI()
  const [saving, setSaving] = useState(false)

  const stepIndex = Math.max(0, STEP_PATHS.indexOf(location.pathname))
  const prevStepPath = stepIndex > 0 ? STEP_PATHS[stepIndex - 1] : null
  const nextStepPath = stepIndex < STEP_PATHS.length - 1 ? STEP_PATHS[stepIndex + 1] : null

  const sub = submissionId ? getSubmission(submissionId) : null

  useEffect(() => {
    if (submissionId) return
    const id = createDraft()
    const next = new URLSearchParams()
    next.set('submission', id)
    next.set('mode', 'edit')
    setSp(next, { replace: true })
  }, [submissionId, setSp, createDraft])

  const readOnly =
    mode === 'view' ||
    sub?.status === RSA_STATUS.Pending_BUFM ||
    sub?.status === RSA_STATUS.Pending_KMT ||
    sub?.status === RSA_STATUS.Published

  const draftLike =
    sub &&
    (sub.status === RSA_STATUS.Draft ||
      sub.status === RSA_STATUS.Rejected_BUFM ||
      sub.status === RSA_STATUS.Rejected_KMT)

  const showEdit = mode === 'view' && draftLike

  const tabQs = new URLSearchParams()
  if (submissionId) tabQs.set('submission', submissionId)
  tabQs.set('mode', mode)
  const tabSuffix = `?${tabQs.toString()}`

  const ensureSubmission = () => {
    if (!submissionId) {
      const id = createDraft()
      setSp({ submission: id, mode: 'edit' }, { replace: true })
      return id
    }
    return submissionId
  }

  const handleSaveDraft = async () => {
    const id = ensureSubmission()
    const current = getSubmission(id)
    if (!current) return
    setSaving(true)
    try {
      await saveDraft(id, {
        serviceArea: current.serviceArea,
        pricing: current.pricing,
        product: current.product,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    const id = ensureSubmission()
    const current = getSubmission(id)
    if (!current) return
    setSaving(true)
    try {
      await submitToBufm(id, {
        serviceArea: current.serviceArea,
        pricing: current.pricing,
        product: current.product,
      })
      navigate('/rsaui')
    } finally {
      setSaving(false)
    }
  }

  const goStep = (path) => {
    if (!path || !submissionId) return
    navigate(`${path}?${tabQs.toString()}`)
  }

  const handleDeleteDraft = () => {
    if (!submissionId || !sub || sub.status !== RSA_STATUS.Draft) return
    if (!window.confirm(`Delete draft ${submissionId}? This cannot be undone.`)) return
    removeSubmission(submissionId)
    navigate('/rsaui')
  }

  const tabClass = ({ isActive }) => `rsa-ui-tab${isActive ? ' rsa-ui-tab--active' : ''}`

  return (
    <Layout>
      <main className="rsa-ui-flow">
        <div className="rsa-ui-flow__head">
          <button type="button" className="back-btn rsa-ui-back" onClick={() => navigate('/rsaui')} aria-label="Back to list">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <h1 className="rsa-ui-flow__title">RSAUI submission</h1>
            <p className="rsa-ui-flow__sub">
              {submissionId ? <code>{submissionId}</code> : 'Create a new submission'} ·{' '}
              {sub?.status || RSA_STATUS.Draft}
            </p>
          </div>
          <div className="rsa-ui-flow__head-actions">
            {showEdit && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const next = new URLSearchParams(sp)
                  next.set('mode', 'edit')
                  setSp(next, { replace: true })
                }}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {sub && (
          <RejectionBanner
            status={sub.status}
            rejection_comment_BUFM={sub.rejection_comment_BUFM}
            rejection_comment_KMT={sub.rejection_comment_KMT}
          />
        )}

        <nav className="rsa-ui-tabs" aria-label="RSAUI steps">
          {TABS.map(t => (
            <NavLink
              key={t.to}
              to={`${t.to}${tabSuffix}`}
              className={tabClass}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="rsa-ui-flow__body">
          <Outlet context={{ submissionId: submissionId || null, readOnly, ensureSubmission }} />
        </div>

        {!readOnly && submissionId && sub && (
          <div className="rsa-ui-flow__footer">
            <div className="rsa-ui-flow__footer-left">
              {prevStepPath && (
                <button type="button" className="btn btn-outline" disabled={saving} onClick={() => goStep(prevStepPath)}>
                  Back
                </button>
              )}
              {sub.status === RSA_STATUS.Draft && (
                <button type="button" className="btn btn-outline rsa-ui-flow__delete" disabled={saving} onClick={handleDeleteDraft}>
                  Delete draft
                </button>
              )}
            </div>
            <div className="rsa-ui-flow__footer-right">
              <button type="button" className="btn btn-outline" disabled={saving} onClick={handleSaveDraft}>
                Save Draft
              </button>
              {nextStepPath && (
                <button type="button" className="btn btn-primary" disabled={saving} onClick={() => goStep(nextStepPath)}>
                  Next
                </button>
              )}
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSubmit}>
                Submit for approval
              </button>
            </div>
          </div>
        )}
      </main>
    </Layout>
  )
}

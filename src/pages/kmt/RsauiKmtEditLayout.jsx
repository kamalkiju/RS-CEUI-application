import { NavLink, Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'
import { getProductConfigureBlockers } from '../../utils/rsaProductTabs.js'

const KMT_BASE = '/rsaui/kmt/edit'

const STEPS = [
  { path: 'select', label: '1. Select Area' },
  { path: 'configure', label: '2. Product Config' },
  { path: 'review', label: '3. Review' },
  { path: 'submit', label: '4. Publish' },
]

function stepIndexFromPath(pathname) {
  const seg = pathname.split('/').pop() || 'select'
  const i = STEPS.findIndex(s => s.path === seg)
  return i >= 0 ? i : 0
}

export default function RsauiKmtEditLayout() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const submissionId = sp.get('submission') || ''
  const fromQueue = sp.get('from') === 'approved' ? 'approved' : 'review'
  const backToList = `/rsaui/kmt/document-review/${fromQueue}`

  const { getSubmission, patchSubmission, removeSubmission } = useRsaUI()
  const [saving, setSaving] = useState(false)

  const sub = submissionId ? getSubmission(submissionId) : null
  const stepIdx = stepIndexFromPath(location.pathname)

  const kmtEditable =
    Boolean(sub) && (sub.status === RSA_STATUS.Pending_KMT || sub.status === RSA_STATUS.Published)

  useEffect(() => {
    if (!submissionId) {
      navigate('/rsaui/kmt/document-review/review', { replace: true })
      return
    }
    if (!sub) {
      navigate('/rsaui/kmt/document-review/review', { replace: true })
      return
    }
    if (sub.status !== RSA_STATUS.Pending_KMT && sub.status !== RSA_STATUS.Published) {
      navigate(backToList, { replace: true })
    }
  }, [submissionId, sub?.id, sub?.status, navigate, backToList])

  const readOnly = false
  const isEditDetailsFlow = true
  const mode = 'edit'
  const isBlankCreateDraft = false

  const tabQs = useMemo(() => {
    const q = new URLSearchParams()
    if (submissionId) q.set('submission', submissionId)
    q.set('mode', 'edit')
    q.set('from', fromQueue)
    return q
  }, [submissionId, fromQueue])

  const tabSuffix = `?${tabQs.toString()}`

  const ensureSubmission = () => submissionId

  const handleSaveProgress = () => {
    const id = submissionId
    const current = getSubmission(id)
    if (!current) return
    setSaving(true)
    try {
      patchSubmission(id, {
        serviceArea: { ...current.serviceArea },
        pricing: { ...current.pricing },
        product: { ...current.product },
        productTabs: current.productTabs,
        replaceProductTabs: true,
        requestMeta: { ...current.requestMeta },
      })
      window.alert('✓ Saved successfully')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDraft = () => {
    if (!submissionId || !sub || sub.status !== RSA_STATUS.Draft) return
    if (!window.confirm(`Delete draft ${submissionId}? This cannot be undone.`)) return
    removeSubmission(submissionId)
    navigate('/rsaui/kmt/document-review/review')
  }

  const goStep = delta => {
    const next = Math.min(STEPS.length - 1, Math.max(0, stepIdx + delta))
    navigate(`${KMT_BASE}/${STEPS[next].path}${tabSuffix}`)
  }

  const handleFooterContinue = () => {
    if (!submissionId || !sub) {
      goStep(1)
      return
    }
    if (stepIdx === 0) {
      const sa = sub.serviceArea || {}
      if (!String(sa.name || '').trim() || !String(sa.polygonId || '').trim()) {
        window.alert('Please select a service area to continue.')
        return
      }
    }
    if (stepIdx === 1) {
      const missing = getProductConfigureBlockers(sub.productTabs)
      if (missing.length) {
        window.alert(`Add at least one primary offering for:\n• ${missing.join('\n• ')}`)
        return
      }
    }
    goStep(1)
  }

  const tabClass = ({ isActive }) => `rsa-ui-tab${isActive ? ' rsa-ui-tab--active' : ''}`

  const outletCtx = useMemo(
    () => ({
      submissionId: submissionId || null,
      readOnly,
      ensureSubmission,
      tabSuffix,
      goStep,
      stepIdx,
      mode,
      isBlankCreateDraft,
      isEditDetailsFlow,
      wizardBase: KMT_BASE,
      kmtFinalizeMode: true,
      kmtReturnPath: backToList,
    }),
    [submissionId, readOnly, ensureSubmission, tabSuffix, goStep, stepIdx, mode, isBlankCreateDraft, backToList],
  )

  if (!submissionId || !sub || !kmtEditable) {
    return (
      <Layout>
        <main className="rsa-ui-flow rsa-ui-flow--wizard">
          <p className="rsa-ui-hint" style={{ padding: 24 }}>
            Loading KMT editor…
          </p>
        </main>
      </Layout>
    )
  }

  return (
    <Layout>
      <main className="rsa-ui-flow rsa-ui-flow--wizard">
        <div className="rsa-ui-flow__head rsa-ui-flow__head--wizard">
          <button
            type="button"
            className="back-btn rsa-ui-back"
            onClick={() => navigate(backToList)}
            aria-label="Back to document review"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="rsa-ui-flow__title">Edit request (KMT)</h1>
            <p className="rsa-ui-flow__sub">
              <code>{submissionId}</code> · {sub.status?.replace(/_/g, ' ') || '—'}
            </p>
          </div>
        </div>

        <div className="rsa-ui-flow__shell">
          <nav className="rsa-ui-flow__shell-section rsa-ui-tabs rsa-ui-tabs--in-shell" aria-label="KMT edit steps">
            {STEPS.map(t => (
              <NavLink key={t.path} to={`${KMT_BASE}/${t.path}${tabSuffix}`} className={tabClass}>
                {t.label}
              </NavLink>
            ))}
          </nav>

          <div className="rsa-ui-flow__shell-divider" aria-hidden />

          <div className="rsa-ui-flow__shell-body">
            <Outlet context={outletCtx} />
          </div>

          {submissionId && sub && stepIdx < 3 ? (
            <>
              <div className="rsa-ui-flow__shell-divider" aria-hidden />
              <div className="rsa-ui-flow__shell-footer rsa-ui-flow__footer">
                <div className="rsa-ui-flow__footer-left">
                  <button type="button" className="btn btn-outline" disabled={saving || stepIdx === 0} onClick={() => goStep(-1)}>
                    Back
                  </button>
                  {sub.status === RSA_STATUS.Draft && (
                    <button type="button" className="btn btn-outline rsa-ui-flow__delete" disabled={saving} onClick={handleDeleteDraft}>
                      Delete draft
                    </button>
                  )}
                </div>
                <div className="rsa-ui-flow__footer-right">
                  <button type="button" className="btn btn-outline" disabled={saving} onClick={handleSaveProgress}>
                    Save
                  </button>
                  <button type="button" className="btn btn-primary" disabled={saving || stepIdx >= STEPS.length - 1} onClick={handleFooterContinue}>
                    Continue →
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </Layout>
  )
}

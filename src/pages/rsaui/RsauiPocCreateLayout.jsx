import { NavLink, Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { useRsaUI, RSA_STATUS } from '../../context/RsaUIContext.jsx'
import RejectionBanner from '../../components/RejectionBanner.jsx'
import { getProductConfigureBlockers } from '../../utils/rsaProductTabs.js'

const BASE = '/poc/service-area'

const STEPS = [
  { path: 'select', label: '1. Select Area' },
  { path: 'configure', label: '2. Product Config' },
  { path: 'review', label: '3. Review' },
  { path: 'submit', label: '4. Submit' },
]

function stepIndexFromPath(pathname) {
  const seg = pathname.split('/').pop() || 'select'
  const i = STEPS.findIndex(s => s.path === seg)
  return i >= 0 ? i : 0
}

export default function RsauiPocCreateLayout() {
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const submissionId = sp.get('submission') || ''
  const mode = sp.get('mode') === 'view' ? 'view' : 'edit'
  const { getSubmission, createDraft, saveDraft, removeSubmission } = useRsaUI()
  const [saving, setSaving] = useState(false)

  const isViewRoute = /\/poc\/service-area\/view\/?$/.test(location.pathname)

  const sub = submissionId ? getSubmission(submissionId) : null
  const stepIdx = stepIndexFromPath(location.pathname)

  const isBlankCreateDraft =
    Boolean(sub) &&
    sub.status === RSA_STATUS.Draft &&
    !(sub.serviceArea?.name || '').trim() &&
    !(sub.serviceArea?.polygonId || '').trim()

  const wizardTitle = mode === 'edit' && sub && !isBlankCreateDraft ? 'Edit details' : 'Create Service Area'
  const isEditDetailsFlow = Boolean(mode === 'edit' && sub && !isBlankCreateDraft)

  /** Pending approval: always read-only in wizard. Published: editable when mode=edit (approved tab flow). */
  const readOnly =
    mode === 'view' ||
    sub?.status === RSA_STATUS.Pending_BUFM ||
    sub?.status === RSA_STATUS.Pending_KMT

  const draftLike =
    sub &&
    (sub.status === RSA_STATUS.Draft ||
      sub.status === RSA_STATUS.Rejected_BUFM ||
      sub.status === RSA_STATUS.Rejected_KMT)

  const isPending =
    sub?.status === RSA_STATUS.Pending_BUFM || sub?.status === RSA_STATUS.Pending_KMT

  /** Header Edit on full-page view: draft, rejected, published — not while awaiting approval. */
  const showHeaderEdit =
    isViewRoute &&
    mode === 'view' &&
    sub &&
    !isPending &&
    (draftLike || sub.status === RSA_STATUS.Published)

  useEffect(() => {
    if (mode !== 'view' || !submissionId || isViewRoute) return
    const seg = location.pathname.split('/').pop() || ''
    if (['select', 'configure', 'review', 'submit'].includes(seg)) {
      navigate(`${BASE}/view?${sp.toString()}`, { replace: true })
    }
  }, [mode, submissionId, isViewRoute, location.pathname, navigate, sp])

  const tabQs = useMemo(() => {
    const q = new URLSearchParams()
    if (submissionId) q.set('submission', submissionId)
    q.set('mode', mode)
    const from = sp.get('from')
    if (from) q.set('from', from)
    return q
  }, [submissionId, mode, sp])

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
        productTabs: current.productTabs,
        requestMeta: current.requestMeta,
        progress: current.progress,
      })
      window.alert('✓ Draft saved successfully')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDraft = () => {
    if (!submissionId || !sub || sub.status !== RSA_STATUS.Draft) return
    if (!window.confirm(`Delete draft ${submissionId}? This cannot be undone.`)) return
    removeSubmission(submissionId)
    navigate('/poc/document-review?tab=draft')
  }

  const goStep = delta => {
    const next = Math.min(STEPS.length - 1, Math.max(0, stepIdx + delta))
    navigate(`${BASE}/${STEPS[next].path}${tabSuffix}`)
  }

  const pocWizardExitPath =
    isEditDetailsFlow || sp.get('from')
      ? sp.get('from')
        ? `/poc/document-review?tab=${encodeURIComponent(sp.get('from'))}`
        : '/poc/document-review'
      : '/poc/document-review'

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
      wizardBase: BASE,
      kmtFinalizeMode: false,
      kmtReturnPath: null,
    }),
    [submissionId, readOnly, ensureSubmission, tabSuffix, goStep, stepIdx, mode, sub, isBlankCreateDraft, isEditDetailsFlow],
  )

  const backTarget = sp.get('from')
    ? `/poc/document-review?tab=${encodeURIComponent(sp.get('from'))}`
    : '/poc/document-review'

  if (isViewRoute) {
    return (
      <Layout>
        <main className="rsa-ui-flow rsa-ui-flow--view-detail">
          <div className="rsa-ui-flow__head">
            <button
              type="button"
              className="back-btn rsa-ui-back"
              onClick={() => navigate(backTarget)}
              aria-label="Back"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <h1 className="rsa-ui-flow__title">View details</h1>
              <p className="rsa-ui-flow__sub">
                {submissionId ? <code>{submissionId}</code> : '—'} · {sub?.status?.replace(/_/g, ' ') || '—'}
              </p>
            </div>
            <div className="rsa-ui-flow__head-actions">
              {showHeaderEdit && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const next = new URLSearchParams(sp)
                    next.set('mode', 'edit')
                    navigate(`${BASE}/select?${next.toString()}`)
                  }}
                >
                  Edit details
                </button>
              )}
            </div>
          </div>

          {sub && (
            <RejectionBanner
              status={sub.status}
              rejection_comment_BUFM={sub.rejection_comment_BUFM}
              rejection_comment_KMT={sub.rejection_comment_KMT}
              highlightSections={sub.rejection_highlight_sections || []}
              highlightFields={sub.rejection_highlight_fields || []}
              feedbackItems={sub.rejection_feedback_items || []}
            />
          )}

          <div className="rsa-ui-flow__body">
            <Outlet context={outletCtx} />
          </div>
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
            onClick={() => navigate(pocWizardExitPath)}
            aria-label="Back to document review"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="rsa-ui-flow__title">{wizardTitle}</h1>
            <p className="rsa-ui-flow__sub">
              {isEditDetailsFlow ? (
                <>
                  <code>{submissionId}</code> · {sub?.status?.replace(/_/g, ' ') || '—'}
                </>
              ) : (
                <>
                  {submissionId ? <code>{submissionId}</code> : 'New request'} · {sub?.status || RSA_STATUS.Draft}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="rsa-ui-flow__shell">
          {sub &&
            (sub.status === RSA_STATUS.Rejected_BUFM || sub.status === RSA_STATUS.Rejected_KMT) && (
              <div className="rsa-ui-flow__shell-section rsa-ui-flow__shell-section--banner">
                <RejectionBanner
                  status={sub.status}
                  rejection_comment_BUFM={sub.rejection_comment_BUFM}
                  rejection_comment_KMT={sub.rejection_comment_KMT}
                  highlightSections={sub.rejection_highlight_sections || []}
                  highlightFields={sub.rejection_highlight_fields || []}
                  feedbackItems={sub.rejection_feedback_items || []}
                />
              </div>
            )}

          <nav
            className="rsa-ui-flow__shell-section rsa-ui-tabs rsa-ui-tabs--in-shell"
            aria-label={wizardTitle === 'Edit details' ? 'Edit steps' : 'Create steps'}
          >
            {STEPS.map(t => (
              <NavLink key={t.path} to={`${BASE}/${t.path}${tabSuffix}`} className={tabClass}>
                {t.label}
              </NavLink>
            ))}
          </nav>

          <div className="rsa-ui-flow__shell-divider" aria-hidden />

          <div className="rsa-ui-flow__shell-body">
            <Outlet context={outletCtx} />
          </div>

          {!readOnly && submissionId && sub && stepIdx < 3 ? (
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
                  <button type="button" className="btn btn-outline" disabled={saving} onClick={handleSaveDraft}>
                    Save Draft
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

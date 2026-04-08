import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useMemo, useState } from 'react'
import Layout from '../../components/Layout.jsx'
import { useKmtTemplates } from '../../context/KmtTemplateContext.jsx'
import { useKmtUsers } from '../../context/KmtUsersContext.jsx'
import { normalizeTemplateForm } from './pocReferenceFormSeed.js'
import { normalizeRsauiTemplateForm } from './rsauiReferenceFormSeed.js'
import ReadOnlyFieldsAccordion from '../../components/ReadOnlyFieldsAccordion.jsx'

function fieldToReadOnly(f, isDraft) {
  const label = `${f.label}${f.mandatory ? ' *' : ''}`
  if (isDraft) {
    return {
      label,
      value: '—',
      multiline: false,
    }
  }
  const value = (f.defaultValue && String(f.defaultValue).trim()) || (f.placeholder && String(f.placeholder).trim()) || '—'
  const multiline = f.type === 'notes' || String(value).length > 100
  return { label, value, multiline }
}

export default function KmtTemplateView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { getTemplate } = useKmtTemplates()
  const { users } = useKmtUsers()
  const t = id ? getTemplate(id) : null

  const basePath = location.pathname.startsWith('/rsaui/kmt') ? '/rsaui/kmt/documents' : '/kmt/documents'

  const [activeStep, setActiveStep] = useState(1)

  const formModel = useMemo(() => {
    if (!t?.form) return normalizeTemplateForm({ tabs: [], headerGroups: [] })
    return (t.targetApp === 'RSAUI' ? normalizeRsauiTemplateForm : normalizeTemplateForm)(t.form)
  }, [t])

  const nameById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u.name])), [users])

  const levels = useMemo(() => {
    if (!t) return []
    const raw =
      Array.isArray(t.approvalLevels) && t.approvalLevels.length
        ? t.approvalLevels
        : [
            { id: 'x', name: 'POC' },
            { id: 'y', name: 'BUFM' },
            { id: 'z', name: 'KMT' },
          ]
    return raw.map(l => ({
      id: l.id,
      name: String(l.name ?? l.role ?? 'Stage').trim() || 'Stage',
    }))
  }, [t])

  const assigneesByLevelDisplay = useMemo(() => {
    if (!t) return {}
    const by = t.assigneesByLevel
    if (by && typeof by === 'object' && Object.keys(by).length) {
      return by
    }
    const a = t.assignees || {}
    const out = {}
    levels.forEach(l => {
      const n = l.name.toUpperCase()
      if (n === 'POC') out[l.id] = [...(a.pocUserIds || [])]
      else if (n === 'BUFM') out[l.id] = [...(a.bufmUserIds || [])]
      else if (n === 'KMT') out[l.id] = [...(a.kmtUserIds || [])]
      else out[l.id] = []
    })
    return out
  }, [t, levels])

  const tabCount = formModel.tabs?.length || 5
  const activeTab = formModel.tabs[activeStep - 1]
  const headingTitle = activeTab?.title || 'Form'
  const isDraft = t?.status === 'draft'
  const headingSub = isDraft
    ? 'Draft: field names only — sample values and placeholders are hidden until this template is published or submitted.'
    : 'Template form fields (read-only preview).'

  if (!t) {
    return (
      <Layout>
        <div className="kmt-page">
          <p>Template not found.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate(basePath)}>
            Back to documents
          </button>
        </div>
      </Layout>
    )
  }

  const isPublished = t.status === 'published'
  const isApproved = t.status === 'approved'
  const isSubmitted = t.status === 'submitted'
  const showApprovalPipeline = !isDraft

  return (
    <Layout>
      <div className="bufm-doc-view kmt-template-view--poc">
        <div className="bufm-doc-view__inner">
          <div className="bufm-doc-view__sticky">
            <header className="bufm-doc-view__header">
              <button type="button" className="back-btn bufm-doc-view__back" onClick={() => navigate(basePath)} aria-label="Back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="bufm-doc-view__header-main">
                <h1 className="bufm-doc-view__title">{t.name}</h1>
                <p className="bufm-doc-view__subline">
                  {(t.targetApp || 'CEUI') + ' · '}
                  {t.docType} · {t.status}
                  {t.updatedAt && (
                    <>
                      {' '}
                      · Updated {t.updatedAt.slice(0, 10)}
                    </>
                  )}
                </p>
              </div>
              <div className="bufm-doc-view__header-actions">
                <button type="button" className="btn btn-outline" onClick={() => navigate(`${basePath}/${t.id}/edit`)}>
                  Edit template
                </button>
              </div>
            </header>

            <section className="bufm-doc-view__poc-card">
              <h2 className="bufm-doc-view__section-title">Template details</h2>
              <div className="bufm-poc-grid">
                <div className="bufm-poc-grid__cell">
                  <span className="bufm-poc-grid__label">Application</span>
                  <p className="bufm-poc-grid__value">{t.targetApp || 'CEUI'}</p>
                </div>
                <div className="bufm-poc-grid__cell">
                  <span className="bufm-poc-grid__label">Document name</span>
                  <p className="bufm-poc-grid__value">{t.name}</p>
                </div>
                <div className="bufm-poc-grid__cell">
                  <span className="bufm-poc-grid__label">Document type</span>
                  <p className="bufm-poc-grid__value">{t.docType}</p>
                </div>
                <div className="bufm-poc-grid__cell">
                  <span className="bufm-poc-grid__label">Line of business</span>
                  <p className="bufm-poc-grid__value">{t.lineOfBusiness || '—'}</p>
                </div>
                <div className="bufm-poc-grid__cell">
                  <span className="bufm-poc-grid__label">Market type</span>
                  <p className="bufm-poc-grid__value">{t.marketSegment || '—'}</p>
                </div>
              </div>
            </section>

            <section className="kmt-template-view__wf-strip" aria-label="Workflow roles">
              <h3 className="kmt-template-view__wf-title">Workflow roles</h3>
              <ol className="kmt-template-view__approval-order-list">
                {levels.map(lvl => (
                  <li key={lvl.id}>{lvl.name}</li>
                ))}
              </ol>
            </section>

            <section className="kmt-template-view__wf-strip" aria-label="Assignees by role">
              <h3 className="kmt-template-view__wf-title">Assignees by role</h3>
              <div className="kmt-template-view__assignees-by-stage">
                {levels.map((lvl, i) => {
                  const ids = assigneesByLevelDisplay[lvl.id] || []
                  const names = ids.map(uid => nameById[uid]).filter(Boolean)
                  return (
                    <div key={lvl.id} className="kmt-template-view__assignees-stage">
                      <strong>
                        {i + 1}. {lvl.name}
                      </strong>
                      <p>{names.length ? names.join(', ') : '—'}</p>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="bufm-doc-view__stepper-bar">
            <nav className="bufm-stepper bufm-stepper--doc-view" aria-label="Form steps">
              {(formModel.tabs || []).slice(0, 5).map((tab, i) => {
                const n = i + 1
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`bufm-stepper__tab${activeStep === n ? ' bufm-stepper__tab--active' : ''}`}
                    onClick={() => setActiveStep(n)}
                  >
                    <span className="bufm-stepper__num">{n}</span>
                    <span className="bufm-stepper__label">{tab.title}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="bufm-doc-view__scroll">
            {(formModel.headerGroups || []).map(hg => (
              <section key={hg.id} className="bufm-doc-view__step-content kmt-template-view__above-tabs">
                <h2 className="bufm-doc-view__step-heading">{hg.title}</h2>
                <p className="bufm-doc-view__step-sub">Section above workflow steps</p>
                <div className="bufm-doc-view__accordions">
                  {(hg.fields || []).length ? (
                    <ReadOnlyFieldsAccordion
                      title="Fields"
                      badge={`${(hg.fields || []).length} field(s)`}
                      fields={(hg.fields || []).map(f => fieldToReadOnly(f, isDraft))}
                    />
                  ) : (
                    <p className="kmt-template-view__empty-tab">No fields in this section.</p>
                  )}
                </div>
              </section>
            ))}

            <section className="bufm-doc-view__step-content">
              <h2 className="bufm-doc-view__step-heading">{headingTitle}</h2>
              <p className="bufm-doc-view__step-sub">{headingSub}</p>
              <div className="bufm-doc-view__accordions">
                {activeTab?.groups?.length ? (
                  activeTab.groups.map((g, i) => (
                    <ReadOnlyFieldsAccordion
                      key={`${activeStep}-${g.id}-${i}`}
                      title={g.title}
                      badge={g.fields?.length ? `${g.fields.length} field(s)` : undefined}
                      fields={(g.fields || []).map(f => fieldToReadOnly(f, isDraft))}
                    />
                  ))
                ) : (
                  <p className="kmt-template-view__empty-tab">No groups on this tab yet. Edit the template to add form content.</p>
                )}
              </div>
            </section>

            <footer className="bufm-doc-view__footer">
              <div className="bufm-doc-view__footer-nav">
                <button type="button" className="btn btn-outline" disabled={activeStep <= 1} onClick={() => setActiveStep(s => Math.max(1, s - 1))}>
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={activeStep >= tabCount}
                  onClick={() => setActiveStep(s => Math.min(tabCount, s + 1))}
                >
                  Next
                </button>
              </div>
            </footer>

            {isDraft && (
              <section className="kmt-template-view__draft-note" aria-label="Draft notice">
                <p>
                  This template is still a <strong>draft</strong>. Submit for review or publish from the editor to see the full approval pipeline
                  below.
                </p>
              </section>
            )}

            {showApprovalPipeline && (
              <section className="kmt-template-view__pipeline kmt-template-view__pipeline--in-view">
                <h2>Approval pipeline</h2>
                <ol className="kmt-template-view__pipeline-steps">
                  {levels.map((lvl, i) => (
                    <li
                      key={lvl.id}
                      className={`kmt-template-view__pipe ${
                        isSubmitted || isApproved || isPublished || i === 0 ? 'kmt-template-view__pipe--done' : ''
                      }`}
                    >
                      {lvl.name}
                    </li>
                  ))}
                  <li className={`kmt-template-view__pipe ${isPublished ? 'kmt-template-view__pipe--done' : ''}`}>Published</li>
                </ol>
              </section>
            )}

            <section className="kmt-template-view__timeline">
              <h2>Activity timeline</h2>
              {(t.timeline || []).length === 0 ? (
                <p className="kmt-template-view__timeline-empty">No activity recorded yet.</p>
              ) : (
                <ul className="kmt-template-view__events">
                  {(t.timeline || []).map(ev => (
                    <li key={ev.id} className="kmt-template-view__event">
                      <div className="kmt-template-view__event-stage">{ev.stage}</div>
                      <div className="kmt-template-view__event-detail">{ev.detail}</div>
                      <div className="kmt-template-view__event-meta">
                        {ev.actor} · {ev.at?.slice(0, 16)?.replace('T', ' ')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </Layout>
  )
}

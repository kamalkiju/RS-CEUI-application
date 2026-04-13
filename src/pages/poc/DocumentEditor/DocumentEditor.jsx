import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '../../../components/Layout.jsx'
import KnowledgeArea from './steps/KnowledgeArea.jsx'
import ServiceCategories from './steps/ServiceCategories.jsx'
import Offerings from './steps/Offerings.jsx'
import ExtraPickup from './steps/ExtraPickup.jsx'
import Fees from './steps/Fees.jsx'
import DocumentReadOnlySteps from './DocumentReadOnlySteps.jsx'
import RejectionBanner from '../../../components/RejectionBanner.jsx'
import VersionBadge from '../../../components/VersionBadge.jsx'
import VersionHistoryDrawer from '../../../components/VersionHistoryDrawer.jsx'
import { useDocs } from '../../../context/DocContext.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import { getDisplayStatus } from '../../../utils/documentStatus.js'
import { inferDocVersion, getCaseStageDisplay } from '../../../utils/documentVersion.js'
import { diffReadOnlySnapshots } from './documentWizardReadOnlyModel.js'
import {
  buildPocUpdateFlagSets,
  buildReviewerFlagSets,
  isReviewerHighlightingWholeStep,
} from '../../../utils/reviewFeedback.js'

const STEPS = [
  { num: 1, name: 'Knowledge Area',    count: '0/9' },
  { num: 2, name: 'Service Categories', count: '0/1' },
  { num: 3, name: 'Offerings',          count: '0/1' },
  { num: 4, name: 'Extra Pick Up',      count: '0/1' },
  { num: 5, name: 'Fees',              count: '0/1' },
]

const STEP_NAMES = ['', 'Knowledge Area', 'Service Categories', 'Offerings', 'Extra Pick Up', 'Fees']

/** Each wizard step contributes up to 20% toward overall completion. */
function completionFromStepCounts(stepCounts) {
  let acc = 0
  for (let s = 1; s <= 5; s++) {
    const { done, total } = stepCounts[s]
    const pct = total > 0 ? Math.min(1, done / total) : 0
    acc += pct * 20
  }
  return Math.min(100, Math.round(acc))
}

function isDraftLikeStatus(status) {
  const s = String(status ?? '')
  return (
    s === 'draft' ||
    s === 'rejected' ||
    s === 'rejected_bufm' ||
    s === 'rejected_kmt' ||
    s === 'Rejected_BUFM' ||
    s === 'Rejected_KMT'
  )
}

const STATUS_BADGE = {
  draft:    { label: 'Draft',    cls: 'badge-draft' },
  pending:  { label: 'Pending',  cls: 'badge-pending' },
  Pending_BUFM: { label: 'Pending BUFM', cls: 'badge-pending' },
  Pending_KMT: { label: 'Pending KMT', cls: 'badge-pending' },
  approved: { label: 'Approved', cls: 'badge-approved' },
  rejected: { label: 'Rejected', cls: 'badge-rejected' },
  rejected_bufm: { label: 'Rejected (BUFM)', cls: 'badge-rejected' },
  rejected_kmt: { label: 'Rejected (KMT)', cls: 'badge-rejected' },
  Rejected_BUFM: { label: 'Rejected (BUFM)', cls: 'badge-rejected' },
  Rejected_KMT: { label: 'Rejected (KMT)', cls: 'badge-rejected' },
  published: { label: 'Published', cls: 'badge-published' },
  new:      { label: 'New',      cls: 'badge-new' },
}

function SuccessModal({ onGoBack }) {
  return (
    <div className="success-backdrop">
      <div className="success-modal">
        <div className="success-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="success-title">Submitted Successfully!</h2>
        <p className="success-msg">
          The knowledge document has been submitted for review successfully and has been
          updated in the knowledge document list.
        </p>
        <div className="success-actions">
          <button className="btn btn-primary" onClick={onGoBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="2" y2="12"/><line x1="2" y1="12" x2="8" y2="18"/><line x1="2" y1="12" x2="22" y2="12"/>
            </svg>
            Go to Document List
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentEditor() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user } = useAuth()
  const { updateDoc, getDocumentById } = useDocs()

  // Document data passed from the list or create flow (must be before liveDoc — avoids TDZ crash / white screen)
  const { doc, mode, previewOnly } = location.state || {}
  const liveDoc = doc?.id ? getDocumentById(doc.id) : doc
  const reviewerSets = useMemo(() => buildReviewerFlagSets(liveDoc || {}), [liveDoc])
  const pocSets = useMemo(() => buildPocUpdateFlagSets(liveDoc || {}), [liveDoc])
  const isNew = mode === 'create' || !doc
  const isRework = mode === 'rework'
  const lockApproved = doc?.status === 'approved' && !isNew

  const [documentMode, setDocumentMode] = useState(() => {
    if (isNew || mode === 'create') return 'edit'
    if (lockApproved) return 'view'
    if (mode === 'view' || previewOnly) return 'view'
    return 'edit'
  })
  const [historyOpen, setHistoryOpen] = useState(false)
  const inViewMode = documentMode === 'view' && doc && !isNew
  const hideEditBecausePreview = previewOnly === true

  const [currentStep, setCurrentStep] = useState(1)
  const [doneSteps,   setDoneSteps]   = useState([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [stepCounts,  setStepCounts]  = useState({
    1: { done: 0, total: 9 },
    2: { done: 0, total: 0 },
    3: { done: 0, total: 0 },
    4: { done: 0, total: 0 },
    5: { done: 0, total: 0 },
  })

  // Inline document name editing
  const [editingName,  setEditingName]  = useState(false)
  const [nameValue,    setNameValue]    = useState(doc?.sub || '')
  const nameInputRef = useRef(null)

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.select()
  }, [editingName])

  const commitName = () => {
    const trimmed = nameValue.trim()
    if (trimmed && doc?.id) updateDoc(doc.id, { sub: trimmed })
    else if (!trimmed) setNameValue(doc?.sub || '')
    setEditingName(false)
  }

  const handleNameKey = (e) => {
    if (e.key === 'Enter') commitName()
    if (e.key === 'Escape') { setNameValue(doc?.sub || ''); setEditingName(false) }
  }

  const updateStepCount = (step, done, total) =>
    setStepCounts(prev => ({ ...prev, [step]: { done, total } }))

  const goStep = (n) => {
    if (n > 1) setDoneSteps(prev => prev.includes(n - 1) ? prev : [...prev, n - 1])
    setCurrentStep(n)
  }

  const handleSubmit = () => {
    if (!doc?.id) return
    const latest = getDocumentById(doc.id) || doc
    let pocResubmissionNote = ''
    if (String(latest.status ?? '').toLowerCase().includes('rejected')) {
      pocResubmissionNote =
        window.prompt(
          'Optional: describe what you changed for BUFM/KMT reviewers (shown on the next review):',
          '',
        )?.trim() || ''
    }
    const trail = latest.reviewAuditTrail || []
    const isRejected = String(latest.status ?? '').toLowerCase().includes('rejected')
    let pocDiff = {}
    let pocUpdatedSections = []
    let pocUpdatedFields = []
    if (isRejected && latest.rejection_readonly_snapshot) {
      const d = diffReadOnlySnapshots(latest.rejection_readonly_snapshot, latest)
      pocUpdatedSections = d.sections
      pocUpdatedFields = d.fields
      pocDiff = {
        poc_updated_sections: pocUpdatedSections,
        poc_updated_fields: pocUpdatedFields,
        rejection_readonly_snapshot: undefined,
      }
    }
    updateDoc(doc.id, {
      status: 'pending',
      tabs: ['approval', 'all'],
      ...(pocResubmissionNote ? { pocResubmissionNote } : {}),
      ...pocDiff,
      ...(isRejected
        ? {
            reviewAuditTrail: [
              ...trail,
              {
                at: new Date().toISOString(),
                role: 'POC',
                action: 'resubmit',
                comment: pocResubmissionNote,
                pocUpdatedSections,
                pocUpdatedFields,
              },
            ],
          }
        : {}),
    })
    setShowSuccess(true)
  }

  // Topbar doc info (POC: Published label when BUFM/KMT approved)
  const displaySt = doc ? getDisplayStatus(doc, user?.role) : null
  const badge = doc
    ? (displaySt?.statusClass === 'published'
        ? STATUS_BADGE.published
        : (STATUS_BADGE[doc.status] || STATUS_BADGE.new))
    : STATUS_BADGE.new
  const caseLine = doc && !isNew ? getCaseStageDisplay(doc) : null
  const docVersionLabel = doc && !isNew ? inferDocVersion(doc) : null
  const docTitle = nameValue || doc?.sub || doc?.id || 'New Document'
  const docSub   = doc
    ? [doc.id, doc.lob, doc.market].filter(Boolean).join(' · ')
    : STEP_NAMES[currentStep]

  const navigationPct = Math.round((currentStep - 1) / 4 * 100)
  const stepDerivedPct = completionFromStepCounts(stepCounts)
  const draftLike = doc && isDraftLikeStatus(doc.status)

  let headerPercent = navigationPct
  if (isNew) {
    headerPercent = Math.max(stepDerivedPct, navigationPct)
  } else if (draftLike) {
    const stored = doc.completionPercent
    if (inViewMode) {
      headerPercent = stored != null ? stored : navigationPct
    } else {
      headerPercent = Math.max(stepDerivedPct, stored ?? 0, navigationPct)
    }
  } else if (doc?.status === 'approved') {
    headerPercent = doc.completionPercent ?? 100
  } else {
    headerPercent = Math.max(stepDerivedPct, doc?.completionPercent ?? 0, navigationPct)
  }
  headerPercent = Math.min(100, Math.max(0, headerPercent))

  const showTitleCompletion = doc && !isNew && draftLike

  const showEditRejectionBanner =
    doc &&
    !inViewMode &&
    String(doc.status ?? '').toLowerCase().includes('rejected')

  const showReworkBanner = doc && !isNew && isRework && !inViewMode

  return (
    <Layout>
      {/* Sub topbar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate('/poc')} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="doc-title-group">
          <div className="doc-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingName && !inViewMode ? (
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={handleNameKey}
                style={{
                  fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit',
                  color: '#1a2b3c', background: '#fff',
                  border: '1.5px solid #1976d2', borderRadius: 6,
                  padding: '2px 8px', outline: 'none',
                  boxShadow: '0 0 0 3px rgba(25,118,210,.12)',
                  minWidth: 200, maxWidth: 420,
                }}
              />
            ) : (
              <span style={{ cursor: inViewMode ? 'default' : 'text' }} onDoubleClick={() => !inViewMode && setEditingName(true)}>
                {docTitle}
              </span>
            )}
            <span className={`badge ${badge.cls}`}>{badge.label}</span>
            {showTitleCompletion && (
              <span className="doc-completion-pill" title="Estimated document completion">
                {headerPercent}%
              </span>
            )}
            {docVersionLabel && <VersionBadge version={docVersionLabel} />}
            {!editingName && !inViewMode && (
              <button
                onClick={() => setEditingName(true)}
                title="Edit document name"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: 4, transition: 'color .15s' }}
                onMouseOver={e => e.currentTarget.style.color = '#1976d2'}
                onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>
          <span className="doc-subtitle">{docSub}</span>
          {caseLine && (
            <div className="doc-case-status-line">
              Case status: <strong>{caseLine}</strong>
              <button type="button" className="btn btn-text btn-sm doc-version-history-btn" onClick={() => setHistoryOpen(true)}>
                View Version History
              </button>
            </div>
          )}
        </div>
        <div className="topbar-spacer" />

        <div className="topbar-trailing">
          {doc?.areas?.length > 0 && (
            <div className="topbar-areas">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{doc.areas.length} service area{doc.areas.length > 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="progress-info" aria-label={`Step ${currentStep} of 5, ${headerPercent}% complete`}>
            <div className="progress-label">
              <span>Step {currentStep}/5</span>
              <strong>{headerPercent}%</strong>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${headerPercent}%` }} />
            </div>
          </div>

          {inViewMode && !hideEditBecausePreview && !lockApproved ? (
            <button type="button" className="btn btn-primary topbar-edit-btn" onClick={() => setDocumentMode('edit')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          ) : inViewMode && lockApproved ? (
            <span className="doc-approved-locked-hint" title="Approved versions are read-only">Approved (locked)</span>
          ) : !inViewMode ? (
            <>
              <button type="button" className="btn btn-outline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Save Draft
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Submit for Approval
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showReworkBanner && (
        <div className="doc-rework-banner" role="status">
          You are editing <strong>Version {docVersionLabel}</strong> after rejection
        </div>
      )}

      {showEditRejectionBanner && (
        <div className="content doc-editor-rejection-wrap">
          <RejectionBanner
            status={doc.status}
            rejection_comment_BUFM={doc.rejection_comment_BUFM}
            rejection_comment_KMT={doc.rejection_comment_KMT}
            fallbackNote={doc.rejectionNote}
            highlightSections={doc.rejection_highlight_sections || []}
            highlightFields={doc.rejection_highlight_fields || []}
            feedbackItems={doc.rejection_feedback_items || []}
          />
        </div>
      )}

      {/* Step wizard: same five tabs in view and edit */}
      <div className="step-wizard">
        {STEPS.map(s => {
          const tabRev = isReviewerHighlightingWholeStep(s.num, reviewerSets.sections)
          const tabPoc = isReviewerHighlightingWholeStep(s.num, pocSets.sections)
          return (
          <div
            key={s.num}
            className={`step${currentStep === s.num ? ' active' : ''}${tabRev ? ' step--reviewer-flag' : ''}${tabPoc ? ' step--poc-update' : ''}`}
            onClick={() => goStep(s.num)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goStep(s.num) } }}
          >
            <div className="step-header">
              <div className="step-num">{s.num}</div>
              <div className="step-name">{s.name}</div>
            </div>
          </div>
          )
        })}
      </div>

      {inViewMode ? (
        <DocumentReadOnlySteps doc={doc} step={currentStep} />
      ) : (
        <>
      {currentStep === 1 && <KnowledgeArea    onNext={() => goStep(2)} onCountChange={(d,t) => updateStepCount(1, d, t)} />}
      {currentStep === 2 && <ServiceCategories onPrev={() => goStep(1)} onNext={() => goStep(3)} onCountChange={(d,t) => updateStepCount(2, d, t)} />}
      {currentStep === 3 && <Offerings         onPrev={() => goStep(2)} onNext={() => goStep(4)} onCountChange={(d,t) => updateStepCount(3, d, t)} />}
      {currentStep === 4 && <ExtraPickup       onPrev={() => goStep(3)} onNext={() => goStep(5)} onCountChange={(d,t) => updateStepCount(4, d, t)} />}
      {currentStep === 5 && <Fees              onPrev={() => goStep(4)} onSubmit={handleSubmit}   onCountChange={(d,t) => updateStepCount(5, d, t)} />}
      {currentStep >= 6 && (
        <div className="content" style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Step {currentStep} — Coming Soon</p>
          <p>This section is under development.</p>
          <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => goStep(currentStep - 1)}>← Go Back</button>
        </div>
      )}
        </>
      )}

      {/* Success modal */}
      {showSuccess && (
        <SuccessModal onGoBack={() => navigate('/poc')} />
      )}

      <VersionHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        doc={doc}
        viewerRole="POC"
      />
    </Layout>
  )
}

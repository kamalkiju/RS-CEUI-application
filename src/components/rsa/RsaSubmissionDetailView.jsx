import { Fragment, useMemo, useState, useEffect, useCallback } from 'react'
import { RSA_STATUS } from '../../context/RsaUIContext.jsx'
import { mergeProductTabs, productTabKeyOrder } from '../../utils/rsaProductTabs.js'
import RejectionBanner from '../RejectionBanner.jsx'
import PocUpdateSummaryBanner from '../PocUpdateSummaryBanner.jsx'
import {
  buildPocUpdateFlagSets,
  buildReviewerFlagSets,
  isFieldFlagged,
  isSectionFlagged,
  lastRejectTrailEntry,
  normalizeLabel,
} from '../../utils/reviewFeedback.js'

function WorkflowTimeline({ sub, sectionClassSuffix = '' }) {
  const poc = sub.pocName || sub.requestMeta?.requestorName || 'POC'
  const bufm = sub.assignedBufmReviewer || sub.requestMeta?.assignedBUFM || '—'
  const created = sub.createdDate || sub.updated || '—'
  const submittedDone = sub.status !== RSA_STATUS.Draft
  const submittedMeta = submittedDone ? `${sub.submittedDate || sub.updated || '—'} · ${poc}` : 'Pending · —'

  const bufmDone = [
    RSA_STATUS.Pending_KMT,
    RSA_STATUS.Published,
    RSA_STATUS.Rejected_BUFM,
    RSA_STATUS.Rejected_KMT,
  ].includes(sub.status)
  const bufmCurrent = sub.status === RSA_STATUS.Pending_BUFM

  const finalDone = [RSA_STATUS.Published, RSA_STATUS.Rejected_KMT].includes(sub.status)
  const finalCurrent = sub.status === RSA_STATUS.Pending_KMT

  const steps = [
    { key: 'd', done: true, current: false, label: 'Draft Created', meta: `${created} · ${poc}` },
    { key: 's', done: submittedDone, current: false, label: 'Submitted for Review', meta: submittedMeta },
    { key: 'b', done: bufmDone, current: bufmCurrent, label: 'BUFM Review', meta: `Assigned to ${bufm} · System` },
    {
      key: 'f',
      done: finalDone,
      current: finalCurrent,
      label: 'Final Decision',
      meta: finalCurrent ? 'Pending · KMT' : sub.status === RSA_STATUS.Published ? 'Published · KMT' : sub.status === RSA_STATUS.Rejected_KMT ? 'Rejected · KMT' : 'Pending · BUFM',
    },
  ]

  return (
    <section className={`rsa-detail-section rsa-workflow${sectionClassSuffix}`}>
      <h3>Workflow timeline</h3>
      <ul className="rsa-workflow__list">
        {steps.map(s => (
          <li key={s.key} className={`rsa-workflow__step rsa-workflow__step--${s.current ? 'current' : s.done ? 'done' : 'pending'}`}>
            <span className="rsa-workflow__dot" aria-hidden />
            <div>
              <strong>{s.label}</strong>
              <div className="rsa-workflow__meta">{s.meta}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function OfferingReadTable({ title, rows, isPrimary, expanded, setExpanded, showActiveOnly, unifiedRead }) {
  const filtered = showActiveOnly ? rows.filter(o => o.status === 'P') : rows

  if (!filtered.length) {
    return (
      <div className="rsa-offer-read">
        <h4 className="rsa-offer-read__title">{title}</h4>
        <p className="rsa-muted rsa-offer-read__empty">{isPrimary ? 'No primary offerings.' : 'No offering(s) added'}</p>
      </div>
    )
  }

  return (
    <div className="rsa-offer-read">
      <h4 className="rsa-offer-read__title">{title}</h4>
      <div
        className={`rsa-offer-read__table-wrap${unifiedRead ? ' rsa-offer-read__table-wrap--clean' : ''}`}
      >
        <table className={`rsa-offer-read__table${unifiedRead ? ' rsa-offer-read__table--clean' : ''}`}>
          <thead>
            <tr>
              {isPrimary && <th>Choice</th>}
              <th>Offering Name</th>
              {isPrimary && <th>Primary?</th>}
              <th>Qty</th>
              <th>Status</th>
              <th>Active Date</th>
              <th>Expiry Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const open = expanded[o.id]
              return (
                <Fragment key={o.id}>
                  <tr className={`rsa-offer-read__row rsa-offer-read__row--${o.changeType || 'new'}`}>
                    {isPrimary && <td>{o.choice}</td>}
                    <td>{o.name}</td>
                    {isPrimary && <td>{o.isPrimary ? 'Yes' : 'No'}</td>}
                    <td>{o.quantity}</td>
                    <td>{o.status}</td>
                    <td>{o.activeDate || '—'}</td>
                    <td>{o.expiryDate || '—'}</td>
                    <td>
                      <button type="button" className="btn btn-text btn-sm" onClick={() => setExpanded(e => ({ ...e, [o.id]: !e[o.id] }))}>
                        {open ? '▴ Collapse' : '▾ Expand'}
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="rsa-offer-read__expand">
                      <td colSpan={isPrimary ? 8 : 7}>
                        <div className="rsa-offer-read__chips">
                          <div><span className="rsa-detail-label">Service Types</span>{(o.serviceTypes || []).length ? (o.serviceTypes || []).map(c => <span key={c} className="rsa-chip rsa-chip--static">{c}</span>) : '—'}</div>
                          <div><span className="rsa-detail-label">Frequency</span>{(o.frequencies || []).join(', ') || '—'}</div>
                          <div><span className="rsa-detail-label">Channels</span>{(o.channels || []).length ? (o.channels || []).map(c => <span key={c} className="rsa-chip rsa-chip--static">{c}</span>) : '—'}</div>
                          <div className="rsa-offer-read__fineprint">Choice: {o.choice || '—'} | Primary: {o.isPrimary ? 'Yes' : 'No'} | Status: {o.status}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RsaSectionTitle({ title, flagPickerMode, onToggleRejectPick, isRejectPick }) {
  if (!flagPickerMode || !onToggleRejectPick) return <h3>{title}</h3>
  const on = isRejectPick('section', title)
  return (
    <div className="rsa-detail-section-head">
      <h3>{title}</h3>
      <button
        type="button"
        className={`rsa-flag-pick${on ? ' rsa-flag-pick--on' : ''}`}
        onClick={() => onToggleRejectPick('section', title)}
        aria-pressed={on}
      >
        Flag
      </button>
    </div>
  )
}

function RsaFlagFieldWrap({ label, flagPickerMode, onToggleRejectPick, isRejectPick, fieldFlags, pocFieldFlags, children }) {
  const flagged = fieldFlags(label)
  const poc = pocFieldFlags ? pocFieldFlags(label) : false
  const cellClass = [flagged ? 'rsa-detail-flag-cell' : '', poc ? 'rsa-detail-poc-cell' : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={`rsa-detail-cell-wrap${isRejectPick('field', label) ? ' rsa-detail-cell-wrap--pick' : ''}`}>
      {flagPickerMode && onToggleRejectPick && (
        <button
          type="button"
          className={`rsa-flag-pick rsa-flag-pick--field${isRejectPick('field', label) ? ' rsa-flag-pick--on' : ''}`}
          onClick={() => onToggleRejectPick('field', label)}
          aria-pressed={isRejectPick('field', label)}
        >
          Flag
        </button>
      )}
      <div className={cellClass}>{children}</div>
    </div>
  )
}

/**
 * Read-only detail layout per RSAUI prompt §4E (Task, Requestor, Service Area, Categories).
 */
export default function RsaSubmissionDetailView({
  submission: sub,
  creatorName = '—',
  creatorEmail = '—',
  showWorkflowTimeline = false,
  expiryBanner = null,
  rejectionNote = null,
  rejectionTitle = 'Rejection note',
  categoriesOnly = false,
  /** White card sections (BUFM task review / POC read-only). */
  elevatedCards = false,
  /** Single white panel with horizontal dividers (POC view details). */
  unifiedPanel = false,
  /** Section dividers only; parent supplies outer card (BUFM summary). */
  unifiedEmbedded = false,
  /** BUFM/KMT: flag sections or fields before opening Reject (same pattern as CEUI). */
  flagPickerMode = false,
  rejectPicks = [],
  onToggleRejectPick = null,
}) {
  const merged = useMemo(() => mergeProductTabs(sub?.productTabs), [sub?.productTabs])
  const tabKeys = useMemo(() => productTabKeyOrder(merged), [merged])
  const flagSets = useMemo(() => buildReviewerFlagSets(sub || {}), [sub])
  const pocSets = useMemo(() => buildPocUpdateFlagSets(sub || {}), [sub])
  const fieldFlags = useCallback(l => isFieldFlagged(l, flagSets.fields), [flagSets.fields])
  const pocFieldFlags = useCallback(l => isFieldFlagged(l, pocSets.fields), [pocSets.fields])
  const isRejectPick = useCallback(
    (scope, label) =>
      (rejectPicks || []).some(
        p => p.scope === scope && normalizeLabel(p.label) === normalizeLabel(label),
      ),
    [rejectPicks],
  )
  const lastBufmReject = useMemo(() => lastRejectTrailEntry(sub?.reviewAuditTrail, 'BUFM'), [sub?.reviewAuditTrail])
  const [catKey, setCatKey] = useState('solidWaste')
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    if (!tabKeys.includes(catKey) && tabKeys.length) setCatKey(tabKeys[0])
  }, [tabKeys, catKey])

  const rm = sub?.requestMeta || {}
  const sa = sub?.serviceArea || {}
  const cat = merged[catKey] || { label: catKey, mandatory: false, primaryOfferings: [], additionalOfferings: [] }

  const u = unifiedPanel ? ' rsa-detail-section--unified' : ''

  const categoriesBlock = (
    <section
      className={`rsa-detail-section rsa-categories-block${u}${
        isSectionFlagged('Categories', flagSets.sections) ? ' rsa-detail-section--reviewer-flag' : ''
      }${isSectionFlagged('Categories', pocSets.sections) ? ' rsa-detail-section--poc-update' : ''}`}
    >
      <div className="rsa-categories-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3>Categories</h3>
          {flagPickerMode && onToggleRejectPick && (
            <button
              type="button"
              className={`rsa-flag-pick${isRejectPick('section', 'Categories') ? ' rsa-flag-pick--on' : ''}`}
              onClick={() => onToggleRejectPick('section', 'Categories')}
              aria-pressed={isRejectPick('section', 'Categories')}
            >
              Flag
            </button>
          )}
        </div>
        <label className="rsa-toggle-active">
          <input type="checkbox" checked={showActiveOnly} onChange={e => setShowActiveOnly(e.target.checked)} />
          Show Active Offerings
        </label>
      </div>
      <p className="rsa-muted rsa-categories-note">
        Note: Click on each offering row to view more details like service types, frequencies and channels.
      </p>
      <div className="rsa-poc-cat-tabs rsa-poc-cat-tabs--read" role="tablist" aria-label="Waste categories">
        {tabKeys.map(key => {
          const t = merged[key]
          if (!t) return null
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={catKey === key}
              className={`rsa-poc-cat-tab${catKey === key ? ' rsa-poc-cat-tab--active' : ''}`}
              onClick={() => setCatKey(key)}
            >
              {t?.label || key}
            </button>
          )
        })}
      </div>
      <p className="rsa-legend-line rsa-legend-line--read">
        <span className="rsa-legend rsa-legend--new">● New</span>
        <span className="rsa-legend rsa-legend--updated">● Updated</span>
        <span className="rsa-legend rsa-legend--unchanged">● No change</span>
      </p>
      <p className="rsa-poc-mandatory-hint rsa-poc-mandatory-hint--read">Mandatory: {cat.mandatory ? 'Yes' : 'No'}</p>

      <OfferingReadTable
        title="Primary offerings"
        rows={cat.primaryOfferings || []}
        isPrimary
        expanded={expanded}
        setExpanded={setExpanded}
        showActiveOnly={showActiveOnly}
        unifiedRead={unifiedPanel}
      />
      <OfferingReadTable
        title="Additional offerings"
        rows={cat.additionalOfferings || []}
        isPrimary={false}
        expanded={expanded}
        setExpanded={setExpanded}
        showActiveOnly={showActiveOnly}
        unifiedRead={unifiedPanel}
      />
    </section>
  )

  const useElevatedCards = elevatedCards && !unifiedPanel
  const rootClass = `rsa-detail-view${useElevatedCards ? ' rsa-detail-view--elevated' : ''}${unifiedEmbedded ? ' rsa-detail-view--unified-embedded' : ''}${categoriesOnly ? '' : ' rsa-detail-view--full'}`
  const wrapShell = unifiedPanel && !unifiedEmbedded

  if (categoriesOnly) {
    const inner = categoriesBlock
    if (wrapShell) {
      return (
        <div className={rootClass}>
          <div className="rsa-detail-unified-shell">{inner}</div>
        </div>
      )
    }
    return <div className={rootClass}>{inner}</div>
  }

  const mainBlocks = (
    <>
      {expiryBanner && (
        <div className="rsa-expiry-banner rsa-detail-unified-banner" role="alert">
          <strong>⚠ EXPIRY WARNING:</strong> {expiryBanner}
        </div>
      )}
      {sub &&
        (sub.status === RSA_STATUS.Rejected_BUFM || sub.status === RSA_STATUS.Rejected_KMT) && (
          <div className="rsa-detail-unified-banner">
            <RejectionBanner
              status={sub.status === RSA_STATUS.Rejected_KMT ? 'Rejected_KMT' : 'Rejected_BUFM'}
              rejection_comment_BUFM={sub.rejection_comment_BUFM}
              rejection_comment_KMT={sub.rejection_comment_KMT}
              highlightSections={sub.rejection_highlight_sections || []}
              highlightFields={sub.rejection_highlight_fields || []}
              feedbackItems={sub.rejection_feedback_items || []}
            />
          </div>
        )}
      {sub &&
        sub.status === RSA_STATUS.Pending_BUFM &&
        lastBufmReject &&
        (lastBufmReject.feedbackItems?.length > 0 || lastBufmReject.comment) && (
          <div className="rsa-reviewer-verify rsa-detail-unified-banner" role="region" aria-label="Prior BUFM feedback">
            <strong>Verify prior feedback</strong>
            {lastBufmReject.comment && <p style={{ margin: '0 0 8px' }}>{lastBufmReject.comment}</p>}
            {lastBufmReject.feedbackItems?.length > 0 && (
              <ul>
                {lastBufmReject.feedbackItems.map((it, i) => (
                  <li key={it.id || i}>
                    <strong>{it.label}</strong>
                    {it.comment ? ` — ${it.comment}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      {sub &&
        !(
          sub.status === RSA_STATUS.Rejected_BUFM || sub.status === RSA_STATUS.Rejected_KMT
        ) &&
        rejectionNote && (
          <div className="rsa-alert rsa-alert--danger rsa-detail-unified-banner">
            <strong>{rejectionTitle}:</strong> {rejectionNote}
          </div>
        )}

      {sub &&
        (sub.status === RSA_STATUS.Pending_BUFM || sub.status === RSA_STATUS.Pending_KMT) &&
        (sub.poc_updated_sections?.length > 0 ||
          sub.poc_updated_fields?.length > 0 ||
          sub.pocResubmissionNote?.trim?.()) && (
          <div className="rsa-detail-unified-banner">
            <PocUpdateSummaryBanner
              sections={sub.poc_updated_sections || []}
              fields={sub.poc_updated_fields || []}
              resubmissionNote={sub.pocResubmissionNote}
            />
          </div>
        )}

      {showWorkflowTimeline && <WorkflowTimeline sub={sub} sectionClassSuffix={u} />}

      <section
        className={`rsa-detail-section${u}${
          isSectionFlagged('Task details', flagSets.sections) ? ' rsa-detail-section--reviewer-flag' : ''
        }${isSectionFlagged('Task details', pocSets.sections) ? ' rsa-detail-section--poc-update' : ''}`}
      >
        <RsaSectionTitle
          title="Task details"
          flagPickerMode={flagPickerMode}
          onToggleRejectPick={onToggleRejectPick}
          isRejectPick={isRejectPick}
        />
        <div className="rsa-detail-grid rsa-detail-grid--3">
          <RsaFlagFieldWrap
            label="Creator Name"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Creator Name</span>
              <div className="rsa-detail-value">{creatorName}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Creator Email"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Creator Email</span>
              <div className="rsa-detail-value">{creatorEmail}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Created Date"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Created Date</span>
              <div className="rsa-detail-value">{sub.updated || '—'}</div>
            </>
          </RsaFlagFieldWrap>
        </div>
      </section>

      <section
        className={`rsa-detail-section${u}${
          isSectionFlagged('Requestor information', flagSets.sections) ? ' rsa-detail-section--reviewer-flag' : ''
        }${isSectionFlagged('Requestor information', pocSets.sections) ? ' rsa-detail-section--poc-update' : ''}`}
      >
        <RsaSectionTitle
          title="Requestor information"
          flagPickerMode={flagPickerMode}
          onToggleRejectPick={onToggleRejectPick}
          isRejectPick={isRejectPick}
        />
        <div className="rsa-detail-grid rsa-detail-grid--4">
          <RsaFlagFieldWrap
            label="Requestor name"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Requestor name</span>
              <div className="rsa-detail-value">{rm.requestorName || sub.pocName || '—'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Requestor email"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Requestor email</span>
              <div className="rsa-detail-value">{rm.requestorEmail || '—'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Requested on behalf of"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Requested on behalf of</span>
              <div className="rsa-detail-value">{rm.onBehalfOf || '—'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Reason for request"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Reason for request</span>
              <div className="rsa-detail-value">{rm.reasonForRequest || '—'}</div>
            </>
          </RsaFlagFieldWrap>
        </div>
        {rm.comments ? (
          <p className="rsa-detail-comments">
            <span className="rsa-detail-label">Comments</span>
            <span className="rsa-detail-comments__text">{rm.comments}</span>
          </p>
        ) : null}
      </section>

      <section
        className={`rsa-detail-section${u}${
          isSectionFlagged('Service area details', flagSets.sections) ? ' rsa-detail-section--reviewer-flag' : ''
        }${isSectionFlagged('Service area details', pocSets.sections) ? ' rsa-detail-section--poc-update' : ''}`}
      >
        <RsaSectionTitle
          title="Service area details"
          flagPickerMode={flagPickerMode}
          onToggleRejectPick={onToggleRejectPick}
          isRejectPick={isRejectPick}
        />
        <div className="rsa-detail-grid rsa-detail-grid--3">
          <RsaFlagFieldWrap
            label="Service area name"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Service area name</span>
              <div className="rsa-detail-value">{sa.name || '—'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Polygon ID"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Polygon ID</span>
              <div className="rsa-detail-value">{sa.polygonId || '—'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Division"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Division</span>
              <div className="rsa-detail-value">{sa.division || '—'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Lawson ID"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Lawson ID</span>
              <div className="rsa-detail-value">{sa.lawsonId || '—'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Effective Date"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Effective Date</span>
              <div className="rsa-detail-value">{sa.effectiveDate || '—'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Expiration Date"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Expiration Date</span>
              <div className="rsa-detail-value">{sa.expiryDate || '—'}</div>
            </>
          </RsaFlagFieldWrap>
        </div>
      </section>

      <section
        className={`rsa-detail-section rsa-detail-section--meta${u}${
          isSectionFlagged('Request metadata', flagSets.sections) ? ' rsa-detail-section--reviewer-flag' : ''
        }${isSectionFlagged('Request metadata', pocSets.sections) ? ' rsa-detail-section--poc-update' : ''}`}
      >
        <div className="rsa-detail-grid rsa-detail-grid--4">
          <RsaFlagFieldWrap
            label="Request ID"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Request ID</span>
              <div className="rsa-detail-value">
                <code>{sub.id}</code>
              </div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Request Type"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Request Type</span>
              <div className="rsa-detail-value">{sub.requestType || 'Create Service Area'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Version"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Version</span>
              <div className="rsa-detail-value">{sub.version || 'v1.0'}</div>
            </>
          </RsaFlagFieldWrap>
          <RsaFlagFieldWrap
            label="Status"
            flagPickerMode={flagPickerMode}
            onToggleRejectPick={onToggleRejectPick}
            isRejectPick={isRejectPick}
            fieldFlags={fieldFlags}
            pocFieldFlags={pocFieldFlags}
          >
            <>
              <span className="rsa-detail-label">Status</span>
              <div className="rsa-detail-value">{sub.status?.replace(/_/g, ' ') || '—'}</div>
            </>
          </RsaFlagFieldWrap>
        </div>
      </section>

      {categoriesBlock}
    </>
  )

  if (wrapShell) {
    return (
      <div className={rootClass}>
        <div className="rsa-detail-unified-shell">{mainBlocks}</div>
      </div>
    )
  }

  return <div className={rootClass}>{mainBlocks}</div>
}

import { Fragment, useMemo, useState, useEffect } from 'react'
import { RSA_STATUS } from '../../context/RsaUIContext.jsx'
import { mergeProductTabs, productTabKeyOrder } from '../../utils/rsaProductTabs.js'

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
}) {
  const merged = useMemo(() => mergeProductTabs(sub?.productTabs), [sub?.productTabs])
  const tabKeys = useMemo(() => productTabKeyOrder(merged), [merged])
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
    <section className={`rsa-detail-section rsa-categories-block${u}`}>
      <div className="rsa-categories-head">
        <h3>Categories</h3>
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
      {rejectionNote && (
        <div className="rsa-alert rsa-alert--danger rsa-detail-unified-banner">
          <strong>{rejectionTitle}:</strong> {rejectionNote}
        </div>
      )}

      {showWorkflowTimeline && <WorkflowTimeline sub={sub} sectionClassSuffix={u} />}

      <section className={`rsa-detail-section${u}`}>
        <h3>Task details</h3>
        <div className="rsa-detail-grid rsa-detail-grid--3">
          <div><span className="rsa-detail-label">Creator Name</span><div className="rsa-detail-value">{creatorName}</div></div>
          <div><span className="rsa-detail-label">Creator Email</span><div className="rsa-detail-value">{creatorEmail}</div></div>
          <div><span className="rsa-detail-label">Created Date</span><div className="rsa-detail-value">{sub.updated || '—'}</div></div>
        </div>
      </section>

      <section className={`rsa-detail-section${u}`}>
        <h3>Requestor information</h3>
        <div className="rsa-detail-grid rsa-detail-grid--4">
          <div><span className="rsa-detail-label">Requestor name</span><div className="rsa-detail-value">{rm.requestorName || sub.pocName || '—'}</div></div>
          <div><span className="rsa-detail-label">Requestor email</span><div className="rsa-detail-value">{rm.requestorEmail || '—'}</div></div>
          <div><span className="rsa-detail-label">Requested on behalf of</span><div className="rsa-detail-value">{rm.onBehalfOf || '—'}</div></div>
          <div><span className="rsa-detail-label">Reason for request</span><div className="rsa-detail-value">{rm.reasonForRequest || '—'}</div></div>
        </div>
        {rm.comments ? (
          <p className="rsa-detail-comments"><span className="rsa-detail-label">Comments</span><span className="rsa-detail-comments__text">{rm.comments}</span></p>
        ) : null}
      </section>

      <section className={`rsa-detail-section${u}`}>
        <h3>Service area details</h3>
        <div className="rsa-detail-grid rsa-detail-grid--3">
          <div><span className="rsa-detail-label">Service area name</span><div className="rsa-detail-value">{sa.name || '—'}</div></div>
          <div><span className="rsa-detail-label">Polygon ID</span><div className="rsa-detail-value">{sa.polygonId || '—'}</div></div>
          <div><span className="rsa-detail-label">Division</span><div className="rsa-detail-value">{sa.division || '—'}</div></div>
          <div><span className="rsa-detail-label">Lawson ID</span><div className="rsa-detail-value">{sa.lawsonId || '—'}</div></div>
          <div><span className="rsa-detail-label">Effective Date</span><div className="rsa-detail-value">{sa.effectiveDate || '—'}</div></div>
          <div><span className="rsa-detail-label">Expiration Date</span><div className="rsa-detail-value">{sa.expiryDate || '—'}</div></div>
        </div>
      </section>

      <section className={`rsa-detail-section rsa-detail-section--meta${u}`}>
        <div className="rsa-detail-grid rsa-detail-grid--4">
          <div><span className="rsa-detail-label">Request ID</span><div className="rsa-detail-value"><code>{sub.id}</code></div></div>
          <div><span className="rsa-detail-label">Request Type</span><div className="rsa-detail-value">{sub.requestType || 'Create Service Area'}</div></div>
          <div><span className="rsa-detail-label">Version</span><div className="rsa-detail-value">{sub.version || 'v1.0'}</div></div>
          <div><span className="rsa-detail-label">Status</span><div className="rsa-detail-value">{sub.status?.replace(/_/g, ' ') || '—'}</div></div>
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

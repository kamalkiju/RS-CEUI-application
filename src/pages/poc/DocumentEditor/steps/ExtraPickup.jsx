import { useState, useEffect } from 'react'

/* ─── Shared sub-components ──────────────────────────────────────────────── */

function MockRTE({ placeholder, defaultValue = '' }) {
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false)

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        <button
          type="button"
          className={`rte-btn${bold ? ' rte-active' : ''}`}
          title="Bold"
          onMouseDown={e => { e.preventDefault(); setBold(p => !p) }}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          className={`rte-btn${italic ? ' rte-active' : ''}`}
          title="Italic"
          onMouseDown={e => { e.preventDefault(); setItalic(p => !p) }}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className={`rte-btn${underline ? ' rte-active' : ''}`}
          title="Underline"
          onMouseDown={e => { e.preventDefault(); setUnderline(p => !p) }}
        >
          <u>U</u>
        </button>
        <span className="rte-sep" />
        <button type="button" className="rte-btn" title="Bullet list">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
            <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" className="rte-btn" title="Link">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>
      </div>
      <div
        className="rte-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{
          fontWeight: bold ? 700 : 400,
          fontStyle: italic ? 'italic' : 'normal',
          textDecoration: underline ? 'underline' : 'none',
        }}
      >
        {defaultValue}
      </div>
    </div>
  )
}

function InfoBox({ items }) {
  return (
    <div className="ep-info-box">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>
        <div className="ep-info-title">Examples:</div>
        <ul className="ep-info-list">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    </div>
  )
}

/* ─── RateCard ───────────────────────────────────────────────────────────── */

const REASON_CODES = [
  '',
  'On Call/Extra (EXR)',
  'Extra Bag Service (EXB)',
  'Overweight Container (OWT)',
  'Contamination (CNT)',
  'Return Trip (RTN)',
  'Special Handling (SPH)',
]

const CATEGORIES = ['Solid Waste', 'Recycle', 'Organics']

function RateCard({ rate, index, onUpdate, onRemove, onDuplicate, isCollapsed, onToggleCollapse }) {
  const [errors, setErrors] = useState({})

  const validate = (field, value) => {
    const errs = { ...errors }
    if (field === 'rate') errs.rate = value.trim() === '' ? 'Rate is required' : ''
    if (field === 'reasonCode') errs.reasonCode = value === '' ? 'Reason code is required' : ''
    if (field === 'categories') errs.categories = value.length === 0 ? 'Select at least one category' : ''
    setErrors(errs)
  }

  const toggleCategory = (cat) => {
    const updated = rate.categories.includes(cat)
      ? rate.categories.filter(c => c !== cat)
      : [...rate.categories, cat]
    onUpdate('categories', updated)
    validate('categories', updated)
  }

  const handleBlur = (field, value) => validate(field, value)

  const hasErrors = Object.values(errors).some(Boolean)
  const catLabel = rate.categories.length > 0 ? rate.categories.join(', ') : 'No categories'

  return (
    <div className={`ep-rate-card${isCollapsed ? ' collapsed' : ''}`}>
      {/* Card header */}
      <div className="ep-rate-card-header">
        <button type="button" className="ep-rate-collapse-btn" onClick={onToggleCollapse}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .2s' }}
          >
            <polyline points="18 15 12 9 6 15"/>
          </svg>
          <span className="ep-rate-card-title">Rate {index + 1}</span>
          {isCollapsed && (
            <span className="ep-rate-card-summary">
              {rate.rate ? `$${rate.rate}` : '—'} &nbsp;·&nbsp; {catLabel}
              {hasErrors && <span className="ep-rate-err-dot" />}
            </span>
          )}
        </button>
        <div className="ep-rate-card-actions">
          <button type="button" className="ep-rate-action-btn" title="Duplicate" onClick={onDuplicate}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button type="button" className="ep-rate-action-btn ep-rate-remove-btn" title="Remove" onClick={onRemove}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Card body */}
      {!isCollapsed && (
        <div className="ep-rate-card-body">
          {/* Service Categories */}
          <div className="ep-field">
            <div className="ep-label">
              Service Categories
              <span className="ep-req">*</span>
            </div>
            <div className="ep-cat-group">
              {CATEGORIES.map(cat => (
                <label
                  key={cat}
                  className={`ep-cat-pill${rate.categories.includes(cat) ? ' checked' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  <input
                    type="checkbox"
                    checked={rate.categories.includes(cat)}
                    onChange={() => {}}
                    style={{ display: 'none' }}
                  />
                  {rate.categories.includes(cat) && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {cat}
                </label>
              ))}
            </div>
            {errors.categories && <div className="ep-field-err">{errors.categories}</div>}
          </div>

          <div className="ep-rate-row">
            {/* Rate */}
            <div className="ep-field ep-field-rate">
              <div className="ep-label">Rate <span className="ep-req">*</span></div>
              <div className="ep-currency-wrap">
                <span className="ep-currency-symbol">$</span>
                <input
                  type="number"
                  className={`ep-input ep-currency-input${errors.rate ? ' ep-input-err' : ''}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={rate.rate}
                  onChange={e => onUpdate('rate', e.target.value)}
                  onBlur={e => handleBlur('rate', e.target.value)}
                />
              </div>
              {errors.rate && <div className="ep-field-err">{errors.rate}</div>}
            </div>

            {/* Reason Code */}
            <div className="ep-field ep-field-reason">
              <div className="ep-label">Reason Code <span className="ep-req">*</span></div>
              <select
                className={`ep-select${errors.reasonCode ? ' ep-input-err' : ''}`}
                value={rate.reasonCode}
                onChange={e => { onUpdate('reasonCode', e.target.value); handleBlur('reasonCode', e.target.value) }}
              >
                {REASON_CODES.map(rc => <option key={rc} value={rc}>{rc || '— Select —'}</option>)}
              </select>
              {errors.reasonCode && <div className="ep-field-err">{errors.reasonCode}</div>}
            </div>
          </div>

          {/* Notes */}
          <div className="ep-field">
            <div className="ep-label">Notes</div>
            <input
              type="text"
              className="ep-input"
              placeholder="e.g. Per bag – Up to 10 bags"
              value={rate.notes}
              onChange={e => onUpdate('notes', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── RatesSection ───────────────────────────────────────────────────────── */

function newRate(overrides = {}) {
  return { id: Date.now() + Math.random(), categories: [], rate: '', reasonCode: '', notes: '', ...overrides }
}

function RatesSection({ rates, onChange }) {
  const [collapsed, setCollapsed] = useState({})

  const addRate = () => {
    const r = newRate()
    onChange([...rates, r])
    setCollapsed(p => ({ ...p, [r.id]: false }))
  }

  const removeRate = (id) => onChange(rates.filter(r => r.id !== id))

  const duplicateRate = (id) => {
    const src = rates.find(r => r.id === id)
    const dup = { ...src, id: Date.now() + Math.random() }
    const idx = rates.findIndex(r => r.id === id)
    const next = [...rates]
    next.splice(idx + 1, 0, dup)
    onChange(next)
  }

  const updateRate = (id, field, value) => {
    onChange(rates.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const toggleCollapse = (id) => setCollapsed(p => ({ ...p, [id]: !p[id] }))

  return (
    <div className="ep-rates-section">
      <div className="ep-rates-header">
        <span className="ep-rates-title">Rates</span>
        <button type="button" className="ep-add-rate-btn" onClick={addRate}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Rate
        </button>
      </div>

      {rates.length === 0 ? (
        <div className="ep-rates-empty">
          No rates configured yet. Click "Add Rate" to get started.
        </div>
      ) : (
        <div className="ep-rate-list">
          {rates.map((r, i) => (
            <RateCard
              key={r.id}
              rate={r}
              index={i}
              onUpdate={(field, val) => updateRate(r.id, field, val)}
              onRemove={() => removeRate(r.id)}
              onDuplicate={() => duplicateRate(r.id)}
              isCollapsed={!!collapsed[r.id]}
              onToggleCollapse={() => toggleCollapse(r.id)}
            />
          ))}
        </div>
      )}

      {rates.length > 0 && (
        <div className="ep-info-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Extra Pick Up Reason Codes are standardized across all service contracts. Contact your KMT administrator to request a new code.</span>
        </div>
      )}
    </div>
  )
}

/* ─── ExtraPickup (main export) ──────────────────────────────────────────── */

const DEFAULT_STATE = {
  onServiceDay: {
    crrInstructions: '',
    preparationInstructions: '',
    isPrescheduled: false,
    serviceDetails: '',
    serviceLimit: '',
    rates: [],
  },
  nonServiceDay: {
    serviceDetails: '',
    serviceLimit: '',
    rates: [],
  },
}

export default function ExtraPickup({ onPrev, onNext, onCountChange }) {
  const [data, setData] = useState(DEFAULT_STATE)

  const setOSD = (field, value) =>
    setData(p => ({ ...p, onServiceDay: { ...p.onServiceDay, [field]: value } }))

  const setNSD = (field, value) =>
    setData(p => ({ ...p, nonServiceDay: { ...p.nonServiceDay, [field]: value } }))

  const totalRates = data.onServiceDay.rates.length + data.nonServiceDay.rates.length

  useEffect(() => {
    const done = (data.onServiceDay.rates.length > 0 ? 1 : 0) +
                 (data.nonServiceDay.rates.length > 0 ? 1 : 0)
    onCountChange?.(done, 2)
  }, [data.onServiceDay.rates.length, data.nonServiceDay.rates.length])

  return (
    <div className="ep-page">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="ep-page-header">
        <div>
          <h2 className="ep-page-title">Extra Pick Up</h2>
          <p className="ep-page-sub">Configure on-service-day and non-service-day extra pickup rules and rates</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — ON SERVICE DAY
      ══════════════════════════════════════════════════════════ */}
      <div className="ep-section-card">
        <div className="ep-section-heading">
          <div className="ep-section-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          On Service Day Extra Pick Ups
        </div>

        {/* CRR Instructions */}
        <div className="ep-field">
          <div className="ep-label">CRR Instructions</div>
          <MockRTE placeholder="Enter CRR instructions for on-service-day extra pickups…" />
        </div>

        {/* Preparation Instructions */}
        <div className="ep-field">
          <div className="ep-label">Preparation Instructions</div>
          <InfoBox items={['Lid must close for service', 'Place 2 feet from edge of curb, not in the road']} />
          <MockRTE placeholder="Describe preparation instructions for the customer…" />
        </div>

        {/* Prescheduled checkbox */}
        <div className="ep-field">
          <label className="ep-checkbox-row">
            <input
              type="checkbox"
              className="ep-checkbox"
              checked={data.onServiceDay.isPrescheduled}
              onChange={e => setOSD('isPrescheduled', e.target.checked)}
            />
            <span className="ep-checkbox-label">Check here if service is prescheduled</span>
          </label>
        </div>

        {/* Service Details */}
        <div className="ep-field">
          <div className="ep-label">Service Details</div>
          <InfoBox items={['Automated Cart: cart content + up to 2 additional bags', 'Manually serviced: any container up to 50 lbs']} />
          <textarea
            className="ep-textarea"
            rows={4}
            placeholder="Enter service details…"
            value={data.onServiceDay.serviceDetails}
            onChange={e => setOSD('serviceDetails', e.target.value)}
          />
        </div>

        {/* Service Limit */}
        <div className="ep-field ep-field-half">
          <div className="ep-label">Service Limit</div>
          <input
            type="text"
            className="ep-input"
            placeholder="e.g. Cart content plus up to 2 additional bags"
            value={data.onServiceDay.serviceLimit}
            onChange={e => setOSD('serviceLimit', e.target.value)}
          />
          <div className="ep-hint">Automated Cart Example: Cart content plus up to 2 additional bags</div>
        </div>

        {/* Rates */}
        <RatesSection
          rates={data.onServiceDay.rates}
          onChange={rates => setOSD('rates', rates)}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — NON-SERVICE DAY
      ══════════════════════════════════════════════════════════ */}
      <div className="ep-section-card">
        <div className="ep-section-heading">
          <div className="ep-section-icon ep-section-icon--purple">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          Non-Service Day Extra Pick Ups
        </div>

        {/* Service Details */}
        <div className="ep-field">
          <div className="ep-label">Service Details</div>
          <textarea
            className="ep-textarea"
            rows={4}
            placeholder="Describe non-service-day pickup details…"
            value={data.nonServiceDay.serviceDetails}
            onChange={e => setNSD('serviceDetails', e.target.value)}
          />
        </div>

        {/* Service Limit */}
        <div className="ep-field ep-field-half">
          <div className="ep-label">Service Limit</div>
          <input
            type="text"
            className="ep-input"
            placeholder="e.g. Up to 10 – 30 gal bags, any type or size"
            value={data.nonServiceDay.serviceLimit}
            onChange={e => setNSD('serviceLimit', e.target.value)}
          />
        </div>

        {/* Rates */}
        <RatesSection
          rates={data.nonServiceDay.rates}
          onChange={rates => setNSD('rates', rates)}
        />
      </div>

      {/* ── Action row ──────────────────────────────────────────── */}
      <div className="sc-action-row" style={{ marginTop: 8 }}>
        <button className="btn btn-outline" onClick={onPrev}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Previous
        </button>
        <button className="btn btn-primary" onClick={onNext}>
          Save &amp; Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>

    </div>
  )
}

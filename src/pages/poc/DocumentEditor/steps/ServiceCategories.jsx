import { useState, useEffect } from 'react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

const INITIAL_CATEGORIES = [
  { id: 1, name: 'Solid Waste', active: true },
  { id: 2, name: 'Recycling', active: true },
  { id: 3, name: 'Yard Waste', active: false },
  { id: 4, name: 'Bulk Waste', active: false },
]

function MockRTE({ placeholder }) {
  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        <button type="button" className="rte-btn" title="Bold"><b>B</b></button>
        <button type="button" className="rte-btn" title="Italic"><i>I</i></button>
        <button type="button" className="rte-btn" title="Underline"><u>U</u></button>
        <span className="rte-sep" />
        <button type="button" className="rte-btn" title="Bullet list">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
        </button>
        <button type="button" className="rte-btn" title="Ordered list">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        </button>
      </div>
      <div
        className="rte-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />
    </div>
  )
}

function CategoryAccordion({ cat, isOpen, onToggle }) {
  const [checkedDays, setCheckedDays] = useState([])
  const [servicedBy, setServicedBy] = useState('')
  const [servicedByErr, setServicedByErr] = useState(false)
  const [revRows, setRevRows] = useState([{ code: '', pct: '', desc: '' }])
  const [serviceLevels, setServiceLevels] = useState([])

  const toggleDay = (day) => setCheckedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  const addRevRow = () => setRevRows(prev => [...prev, { code: '', pct: '', desc: '' }])
  const delRevRow = (idx) => setRevRows(prev => prev.filter((_, i) => i !== idx))

  return (
    <div className={`sc-accordion${isOpen ? ' sc-open' : ''}`}>
      <div className="sc-acc-header" onClick={() => onToggle(cat.id)}>
        <span className="sc-acc-name">{cat.name}</span>
        <span className={cat.active ? 'sc-badge-active' : 'sc-badge-inactive'}>
          {cat.active ? 'Active' : 'Inactive'}
        </span>
        <svg className={`sc-chevron${isOpen ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </div>

      <div className={`sc-acc-body${isOpen ? ' open' : ''}`}>
        <div className="sc-acc-inner">

          {/* Category Notes */}
          <div className="sc-section-card">
            <div className="sc-section-label">Category Notes</div>
            <div className="sc-field">
              <div className="sc-label">Acceptable Notes</div>
              <MockRTE placeholder="Describe acceptable items…" />
            </div>
            <div className="sc-field">
              <div className="sc-label">Unacceptable Notes</div>
              <MockRTE placeholder="Describe unacceptable items…" />
            </div>
          </div>

          {/* Service Day */}
          <div className="sc-section-card">
            <div className="sc-section-label">Service Day</div>
            <div className="sc-field">
              <div className="day-grid">
                {DAYS.map(day => (
                  <label key={day} className={`day-pill${checkedDays.includes(day) ? ' checked' : ''}`} onClick={() => toggleDay(day)}>
                    <input type="checkbox" readOnly checked={checkedDays.includes(day)} />
                    {day.slice(0,3)}
                  </label>
                ))}
              </div>
            </div>
            <div className="sc-field" style={{ marginTop: 12 }}>
              <div className="sc-label">Service Day Notes</div>
              <input type="text" className="sc-select" style={{ paddingRight: 12 }} placeholder="e.g. Holiday schedule notes…" />
            </div>
          </div>

          {/* Serviced By */}
          <div className="sc-section-card">
            <div className="sc-section-label">Serviced By</div>
            <div className="sc-field">
              <div className="sc-label">Serviced By <span style={{ color: '#e74c3c' }}>*</span></div>
              <select
                className={`sc-select${servicedByErr ? ' sc-err' : ''}`}
                value={servicedBy}
                onChange={e => { setServicedBy(e.target.value); setServicedByErr(false) }}
                onBlur={() => setServicedByErr(!servicedBy)}
              >
                <option value="">— Select —</option>
                <option>Republic Services</option>
                <option>Municipal / Government</option>
                <option>Third Party Contractor</option>
                <option>HOA / Community</option>
              </select>
              {servicedByErr && <div className="sc-err-msg visible">Please select who services this category.</div>}
            </div>
          </div>

          {/* CSR Instructions */}
          <div className="sc-section-card">
            <div className="sc-section-label">CSR Instructions</div>
            <MockRTE placeholder="Instructions for customer service representatives…" />
          </div>

          {/* Revenue Distribution Codes */}
          <div className="sc-section-card">
            <div className="sc-section-label">Revenue Distribution Codes</div>
            <div className="rev-table-wrap">
              <table className="rev-table">
                <thead>
                  <tr>
                    <th>Revenue Code</th>
                    <th>Percentage (%)</th>
                    <th>Description</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {revRows.map((row, idx) => (
                    <tr key={idx}>
                      <td><input className="rev-cell-inp" value={row.code} onChange={e => setRevRows(prev => prev.map((r,i) => i===idx?{...r,code:e.target.value}:r))} placeholder="REV-001"/></td>
                      <td><input className="rev-cell-inp" value={row.pct} onChange={e => setRevRows(prev => prev.map((r,i) => i===idx?{...r,pct:e.target.value}:r))} placeholder="100" type="number"/></td>
                      <td><input className="rev-cell-inp" value={row.desc} onChange={e => setRevRows(prev => prev.map((r,i) => i===idx?{...r,desc:e.target.value}:r))} placeholder="Revenue description"/></td>
                      <td>
                        <button className="sc-del-btn" onClick={() => delRevRow(idx)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="sc-add-row-btn" onClick={addRevRow}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Code
            </button>
          </div>

          {/* Service Levels */}
          <div className="sc-section-card">
            <div className="sc-section-label">Service Levels</div>
            {serviceLevels.length === 0 ? (
              <div className="sl-empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <span>No service levels configured yet.</span>
              </div>
            ) : null}
            <button className="sc-add-sl-btn" onClick={() => setServiceLevels(prev => [...prev, { id: Date.now() }])}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Service Level
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function ServiceCategories({ onPrev, onNext, onCountChange }) {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES)
  const [openCat, setOpenCat] = useState(null)

  useEffect(() => {
    onCountChange?.(categories.filter(c => c.active).length, categories.length)
  }, [categories])

  const toggleCat = (id) => setOpenCat(prev => prev === id ? null : id)

  const expandAll = () => {}
  const collapseAll = () => setOpenCat(null)

  const addCategory = () => {
    const name = prompt('Enter service category name:')
    if (name?.trim()) {
      setCategories(prev => [...prev, { id: Date.now(), name: name.trim(), active: true }])
    }
  }

  return (
    <div className="sc-page">
      {/* Header */}
      <div className="sc-header">
        <div>
          <div className="sc-title">Service Categories</div>
          <div className="sc-subtitle">Configure service categories and their details for this knowledge document.</div>
        </div>
        <button className="sc-refresh-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh Service Category
        </button>
      </div>

      {/* Info banner */}
      <div className="sc-info-banner">
        <div className="sc-info-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Service categories are auto-populated based on the selected service area. Review and configure each category below.
        </div>
        <button className="sc-add-cat-btn" onClick={addCategory}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Service Category
        </button>
      </div>

      {/* Controls */}
      <div className="sc-controls-bar">
        <button className="sc-ctrl-btn" onClick={() => setOpenCat('all')}>Expand All</button>
        <span style={{ color: '#dce6f0' }}>|</span>
        <button className="sc-ctrl-btn" onClick={collapseAll}>Collapse All</button>
      </div>

      {/* Category accordions */}
      <div>
        {categories.map(cat => (
          <CategoryAccordion
            key={cat.id}
            cat={cat}
            isOpen={openCat === cat.id || openCat === 'all'}
            onToggle={toggleCat}
          />
        ))}
      </div>

      {/* Action row */}
      <div className="sc-action-row">
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onPrev}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Previous
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save Draft
          </button>
          <button className="btn btn-primary" onClick={onNext}>
            Save &amp; Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

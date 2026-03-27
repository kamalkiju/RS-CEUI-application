import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useRsaUI } from '../../context/RsaUIContext.jsx'

const SEARCH_ROWS = [
  { name: 'North Residential Zone', polygonId: 'POL-1001', division: 'Division A', type: 'Residential', status: 'Active', lawsonId: 'LAW-10011', effectiveDate: '2025-04-01', expiryDate: '2026-03-31' },
  { name: 'West Industrial Park', polygonId: 'POL-2045', division: 'Division C', type: 'Industrial', status: 'Active', lawsonId: 'LAW-13209', effectiveDate: '2025-03-15', expiryDate: '2026-03-14' },
  { name: 'Greenfield Estate', polygonId: 'POL-1880', division: 'Division B', type: 'Residential', status: 'Pending Review', lawsonId: 'LAW-11990', effectiveDate: '2025-05-01', expiryDate: '2026-04-30' },
]

const DIVISIONS = ['All divisions', 'Division A', 'Division B', 'Division C']

export default function RsaUIServiceArea() {
  const { submissionId, readOnly, isEditDetailsFlow = false } = useOutletContext()
  const { getSubmission, patchSubmission } = useRsaUI()
  const sub = submissionId ? getSubmission(submissionId) : null
  const [query, setQuery] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('All divisions')

  if (!submissionId || !sub) {
    return <p className="rsa-ui-hint">Preparing submission…</p>
  }

  const sa = sub.serviceArea || {}
  const set = patch => patchSubmission(submissionId, { serviceArea: { ...sa, ...patch } })
  const hasSelected = Boolean(sa.name && sa.polygonId)

  const results = useMemo(() => {
    return SEARCH_ROWS.filter(r => {
      const q = query.trim().toLowerCase()
      const divOk = divisionFilter === 'All divisions' || r.division === divisionFilter
      if (!divOk) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.polygonId.toLowerCase().includes(q) ||
        r.division.toLowerCase().includes(q)
      )
    })
  }, [query, divisionFilter])

  const selectArea = row => {
    set({
      name: row.name,
      polygonId: row.polygonId,
      division: row.division,
      type: row.type,
      status: row.status,
      lawsonId: row.lawsonId,
      effectiveDate: row.effectiveDate,
      expiryDate: row.expiryDate,
    })
  }

  const clearSelection = () => set({ name: '', polygonId: '' })

  const inp = readOnly => ({
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    background: readOnly ? '#f8fafc' : '#fff',
  })

  return (
    <div className="rsa-ui-panel rsa-sa-step">
      <h2 className="rsa-ui-panel__title">
        1 · Select service area{isEditDetailsFlow ? ' — edit details' : ''}
      </h2>
      <p className="rsa-ui-panel__sub">Search on the left, then select a row — the summary appears on the right.</p>

      <div className={`rsa-sa-split${readOnly ? ' rsa-sa-split--readonly' : ''}`}>
        {!readOnly && (
          <aside className="rsa-sa-split__left" aria-label="Search results">
            <div className="rsa-sa-search-bar">
              <label className="rsa-sa-search-label">
                <span className="rsa-sa-search-icon" aria-hidden>🔍</span>
                <input
                  type="search"
                  className="rsa-sa-search-input"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, polygon ID, or division…"
                  autoComplete="off"
                />
              </label>
              <select
                className="rsa-sa-filter-select"
                value={divisionFilter}
                onChange={e => setDivisionFilter(e.target.value)}
              >
                {DIVISIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <ul className="rsa-sa-result-list">
              {results.length === 0 ? (
                <li className="rsa-sa-result-empty">No matches. Try another search.</li>
              ) : (
                results.map(row => {
                  const active = sa.polygonId === row.polygonId && sa.name === row.name
                  return (
                    <li key={row.polygonId}>
                      <button
                        type="button"
                        className={`rsa-sa-result-card${active ? ' rsa-sa-result-card--active' : ''}`}
                        onClick={() => selectArea(row)}
                      >
                        <strong className="rsa-sa-result-name">{row.name}</strong>
                        <span className="rsa-sa-result-meta">{row.polygonId} · {row.division}</span>
                        <span className="rsa-sa-result-type">{row.type} · {row.status}</span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </aside>
        )}

        <section className={`rsa-sa-split__right${readOnly || !hasSelected ? ' rsa-sa-split__right--solo' : ''}`}>
          {!hasSelected ? (
            <div className="rsa-sa-placeholder">
              <div className="rsa-sa-placeholder__icon" aria-hidden>📍</div>
              <h3 className="rsa-sa-placeholder__title">No service area selected</h3>
              <p className="rsa-sa-placeholder__text">
                {readOnly ? 'This request has no linked service area.' : 'Choose an area from the list to see details and continue.'}
              </p>
            </div>
          ) : (
            <div className="rsa-sa-summary-card">
              <div className="rsa-sa-summary-head">
                <h3 className="rsa-sa-summary-title">Selected service area</h3>
                {!readOnly && (
                  <button type="button" className="btn btn-text btn-sm rsa-sa-change-btn" onClick={clearSelection}>
                    Change selection
                  </button>
                )}
              </div>
              <div className="rsa-sa-summary-grid">
                <div className="rsa-sa-summary-cell">
                  <span className="rsa-sa-summary-label">Service area name</span>
                  <span className="rsa-sa-summary-value">{sa.name}</span>
                </div>
                <div className="rsa-sa-summary-cell">
                  <span className="rsa-sa-summary-label">Polygon ID</span>
                  <span className="rsa-sa-summary-value">{sa.polygonId}</span>
                </div>
                <div className="rsa-sa-summary-cell">
                  <span className="rsa-sa-summary-label">Division</span>
                  <span className="rsa-sa-summary-value">{sa.division}</span>
                </div>
                <div className="rsa-sa-summary-cell">
                  <span className="rsa-sa-summary-label">Lawson ID</span>
                  <span className="rsa-sa-summary-value">{sa.lawsonId || '—'}</span>
                </div>
                <div className="rsa-sa-summary-cell">
                  <span className="rsa-sa-summary-label">Effective date</span>
                  <span className="rsa-sa-summary-value">{sa.effectiveDate || '—'}</span>
                </div>
                <div className="rsa-sa-summary-cell">
                  <span className="rsa-sa-summary-label">Expiration date</span>
                  <span className="rsa-sa-summary-value">{sa.expiryDate || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {(hasSelected && !readOnly) && (
            <details className="rsa-sa-advanced">
              <summary>Additional fields (optional)</summary>
              <div className="rsa-ui-fields rsa-sa-advanced-fields">
                <label className="rsa-ui-field">
                  <span>Area type</span>
                  <input style={inp(false)} value={sa.type || ''} onChange={e => set({ type: e.target.value })} />
                </label>
                <label className="rsa-ui-field">
                  <span>Status</span>
                  <input style={inp(false)} value={sa.status || ''} onChange={e => set({ status: e.target.value })} />
                </label>
                <label className="rsa-ui-field rsa-ui-field--full">
                  <span>Notes</span>
                  <textarea style={{ ...inp(false), minHeight: 72 }} value={sa.notes || ''} onChange={e => set({ notes: e.target.value })} />
                </label>
              </div>
            </details>
          )}
        </section>
      </div>
    </div>
  )
}

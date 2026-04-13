import { useMemo, useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import RsaSubmissionDetailView from '../../components/rsa/RsaSubmissionDetailView.jsx'
import { mergeProductTabs, productTabKeyOrder, RSA_CORE_TAB_KEYS } from '../../utils/rsaProductTabs.js'

const BASE = '/poc/service-area'

const OFFERING_NAMES = [
  '95 Ga Cart Solid Waste Service',
  '64 Ga Cart Solid Waste Service',
  '96G Rollcart — Residential',
  '48G Rollcart — Compact',
  'Recycle Blue Bin 64G',
  'Yard Waste Cart 96G',
]

const SERVICE_TYPE_OPTS = ['Door Service', 'Senior Citizen', 'Curbside', 'Backyard']
const FREQ_OPTS = ['Weekly (1x)', 'Bi-weekly', 'Monthly']
const CHANNEL_OPTS = ['Standard', 'Online', 'Phone']

function tabStatus(tab) {
  if (!tab?.mandatory) return 'optional'
  return (tab.primaryOfferings || []).length > 0 ? 'done' : 'required'
}

function statusBarLine(merged) {
  const keys = productTabKeyOrder(merged)
  return keys
    .map(k => {
      const t = merged[k]
      if (!t) return ''
      const st = tabStatus(t)
      const label = t.label || k
      if (st === 'done') return `${label} ✓ Done`
      if (st === 'required') return `${label} ⚠ Required`
      return `${label} Optional`
    })
    .filter(Boolean)
    .join(' · ')
}

const ADD_TAB_PRESETS = [
  { label: 'Bulk Waste', desc: 'Large items', icon: '🗑️' },
  { label: 'Hazardous', desc: 'Chemical', icon: '☢️' },
  { label: 'Medical Waste', desc: 'Clinical', icon: '🏥' },
  { label: 'Electronics', desc: 'E-waste', icon: '💻' },
  { label: 'Glass', desc: 'Glass recycling', icon: '🫙' },
  { label: 'Paper / Cardboard', desc: 'Paper recycling', icon: '📦' },
  { label: 'Food / Organics', desc: 'Compost', icon: '🥗' },
]

function nextChoiceLetter(primary, additional) {
  const n = (primary?.length || 0) + (additional?.length || 0) + 1
  return `C${n}`
}

export default function RsauiPocProductConfig() {
  const {
    submissionId,
    readOnly,
    tabSuffix,
    isEditDetailsFlow = false,
    wizardBase = BASE,
  } = useOutletContext()
  const { user } = useAuth()
  const { getSubmission, patchSubmission } = useRsaUI()
  const sub = submissionId ? getSubmission(submissionId) : null

  const [activeTab, setActiveTab] = useState('solidWaste')
  const [addMode, setAddMode] = useState(null) // 'primary' | 'additional' while picking name
  const [modal, setModal] = useState(null) // pickName | configure | incomplete | cannotRemove | viewOffering | addTab
  const [pickNameValue, setPickNameValue] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    choice: '',
    isPrimary: true,
    quantity: 1,
    status: 'P',
    activeDate: '',
    expiryDate: '',
    serviceTypes: [],
    frequencies: [],
    channels: [],
    changeType: 'new',
  })
  const [viewOfferingObj, setViewOfferingObj] = useState(null)
  const [customTabName, setCustomTabName] = useState('')

  const productTabs = sub?.productTabs || {}

  const mergedTabs = useMemo(() => mergeProductTabs(productTabs), [productTabs])
  const tabKeysOrdered = useMemo(() => productTabKeyOrder(mergedTabs), [mergedTabs])

  const bar = useMemo(() => statusBarLine(mergedTabs), [mergedTabs])
  const currentCat = mergedTabs[activeTab] || { primaryOfferings: [], additionalOfferings: [], label: activeTab, mandatory: false }

  useEffect(() => {
    if (!tabKeysOrdered.includes(activeTab) && tabKeysOrdered.length) {
      setActiveTab(tabKeysOrdered[0])
    }
  }, [tabKeysOrdered, activeTab])

  const addCategoryTab = label => {
    const id = `cat_${Date.now()}`
    patchSubmission(submissionId, {
      productTabs: {
        [id]: { id, label: label.trim(), mandatory: false, primaryOfferings: [], additionalOfferings: [] },
      },
    })
    setActiveTab(id)
    setModal(null)
    setCustomTabName('')
  }

  const removeCustomTab = key => {
    if (RSA_CORE_TAB_KEYS.includes(key)) return
    if (!window.confirm(`Remove the "${mergedTabs[key]?.label || key}" tab? Offerings in this tab will be removed.`)) return
    const copy = { ...mergedTabs }
    delete copy[key]
    patchSubmission(submissionId, { productTabs: copy, replaceProductTabs: true })
    setActiveTab('solidWaste')
  }

  const openAddPrimary = () => {
    setAddMode('primary')
    setPickNameValue('')
    setEditingId(null)
    setModal('pickName')
  }

  const openAddAdditional = () => {
    setAddMode('additional')
    setPickNameValue('')
    setEditingId(null)
    setModal('pickName')
  }

  const openConfigureFromPick = () => {
    if (!pickNameValue.trim()) return
    const primary = currentCat.primaryOfferings || []
    const additional = currentCat.additionalOfferings || []
    const isPrimary = addMode === 'primary'
    setForm({
      name: pickNameValue.trim(),
      choice: nextChoiceLetter(primary, additional),
      isPrimary,
      quantity: 1,
      status: 'P',
      activeDate: '',
      expiryDate: '',
      serviceTypes: [],
      frequencies: [],
      channels: [],
      changeType: 'new',
    })
    setModal('configure')
  }

  const saveOffering = () => {
    const errs = []
    if (!form.activeDate) errs.push('Active Date is required')
    if (!form.serviceTypes?.length) errs.push('Select at least one Service Type')
    if (!form.frequencies?.length) errs.push('Select a pickup Frequency')
    if (!form.channels?.length) errs.push('Select at least one Channel')
    if (errs.length) {
      window.alert(`Incomplete Offering\n\nPlease complete the following:\n• ${errs.join('\n• ')}`)
      return
    }

    const offering = {
      id: editingId || `off-${Date.now()}`,
      ...form,
      changeType: editingId ? 'updated' : 'new',
    }
    const pt = { ...currentCat }
    const isPrimary = editingId ? form.isPrimary : addMode === 'primary'

    if (editingId) {
      const prim = (pt.primaryOfferings || []).filter(o => o.id !== editingId)
      const add = (pt.additionalOfferings || []).filter(o => o.id !== editingId)
      if (isPrimary) prim.push(offering)
      else add.push(offering)
      pt.primaryOfferings = prim
      pt.additionalOfferings = add
    } else if (isPrimary) {
      pt.primaryOfferings = [...(pt.primaryOfferings || []), offering]
    } else {
      pt.additionalOfferings = [...(pt.additionalOfferings || []), offering]
    }

    patchSubmission(submissionId, {
      productTabs: { [activeTab]: pt },
      progress: computeProgressAfterPatch(sub, activeTab, pt),
    })
    window.alert(editingId ? '✓ Offering updated successfully' : '✓ Offering saved successfully')
    setModal(null)
    setAddMode(null)
    setEditingId(null)
  }

  const computeProgressAfterPatch = (s, key, pt) => {
    const merged = { ...(s.productTabs || {}), [key]: pt }
    let p = 25
    const solid = merged.solidWaste?.primaryOfferings?.length
    const yard = merged.yardWaste?.primaryOfferings?.length
    if (solid && yard) p += 40
    else if (solid || yard) p += 20
    if (s.serviceArea?.name) p += 10
    return Math.min(100, p)
  }

  const promptRemove = (id, isPrimaryRow) => {
    const row = [...(currentCat.primaryOfferings || []), ...(currentCat.additionalOfferings || [])].find(o => o.id === id)
    if (!window.confirm(`Remove offering?\n\nRemove "${row?.name || 'this offering'}" from ${currentCat.label} tab?\n\nThis will not affect other requests.`)) return
    const pt = { ...currentCat }
    const prim = pt.primaryOfferings || []
    if (currentCat.mandatory && isPrimaryRow && prim.length === 1 && prim[0].id === id) {
      setModal('cannotRemove')
      return
    }
    if (isPrimaryRow) {
      pt.primaryOfferings = prim.filter(o => o.id !== id)
    } else {
      pt.additionalOfferings = (pt.additionalOfferings || []).filter(o => o.id !== id)
    }
    patchSubmission(submissionId, { productTabs: { [activeTab]: pt } })
    window.alert('✓ Offering removed')
  }

  const updateOffering = o => {
    setEditingId(o.id)
    setAddMode(null)
    setForm({
      ...o,
      frequencies: o.frequencies || [],
      serviceTypes: o.serviceTypes || [],
      channels: o.channels || [],
    })
    setModal('configure')
  }

  const viewOffering = o => {
    setViewOfferingObj(o)
    setModal('viewOffering')
  }

  if (!submissionId || !sub) {
    return <p className="rsa-ui-hint">Preparing submission…</p>
  }

  if (readOnly) {
    return (
      <div className="rsa-poc-config-shell">
        <div className="rsa-poc-config-card rsa-poc-config-card--hero">
          <h2 className="rsa-ui-panel__title">2 · Product configuration</h2>
          <p className="rsa-ui-panel__sub">Read-only — categories and offerings (request is locked).</p>
        </div>
        <div className="rsa-poc-config-card">
          <RsaSubmissionDetailView
            submission={sub}
            creatorName={user?.name || sub.requestMeta?.requestorName || '—'}
            creatorEmail={user?.email || sub.requestMeta?.requestorEmail || '—'}
            categoriesOnly
            elevatedCards
          />
        </div>
      </div>
    )
  }

  const toggleMulti = (field, val) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val],
    }))
  }

  const toggleSingleFreq = val => {
    setForm(f => ({ ...f, frequencies: f.frequencies[0] === val ? [] : [val] }))
  }

  const showPrimaryToggle = Boolean(editingId)

  return (
    <div className="rsa-poc-config-shell">
      <div className="rsa-poc-config-card rsa-poc-config-card--hero">
        <h2 className="rsa-ui-panel__title">
          2 · Product configuration{isEditDetailsFlow ? ' — edit details' : ''}
        </h2>
        <p className="rsa-ui-panel__sub">
          Add <strong>primary</strong> offerings first (required on Solid Waste &amp; Yard Waste). Use <strong>additional offerings</strong> for optional lines. Add category tabs as needed.
        </p>
        <div className="rsa-poc-statusbar" role="status">
          {bar}
        </div>
      </div>

      <div className="rsa-poc-config-card rsa-poc-config-card--tables">
        <div className="rsa-poc-cat-toolbar rsa-poc-cat-toolbar--in-card" role="tablist" aria-label="Product categories">
          <div className="rsa-poc-cat-toolbar__track">
            {tabKeysOrdered.map(key => {
              const t = mergedTabs[key]
              if (!t) return null
              const st = tabStatus(t)
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === key}
                  className={`rsa-poc-cat-tab rsa-poc-cat-tab--toolbar${activeTab === key ? ' rsa-poc-cat-tab--active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  {t?.label || key}
                  {st === 'done' && ' ✓'}
                  {st === 'required' && ' ⚠'}
                </button>
              )
            })}
            {!readOnly && (
              <button
                type="button"
                className="rsa-poc-cat-tab rsa-poc-cat-tab--add rsa-poc-cat-tab--toolbar"
                onClick={() => {
                  setCustomTabName('')
                  setModal('addTab')
                }}
              >
                + Add tab
              </button>
            )}
          </div>
          {!readOnly && !RSA_CORE_TAB_KEYS.includes(activeTab) && (
            <p className="rsa-poc-custom-tab-hint">
              <button type="button" className="btn btn-text btn-sm" onClick={() => removeCustomTab(activeTab)}>
                Remove &quot;{currentCat.label}&quot; tab
              </button>
            </p>
          )}
          <p className="rsa-poc-mandatory-hint rsa-poc-mandatory-hint--toolbar">
            Mandatory: {currentCat.mandatory ? 'Yes — at least one primary offering required' : 'No'}
          </p>
        </div>

      <section className="rsa-poc-offering-section">
        <div className="rsa-poc-offering-head">
          <h3>Primary offerings</h3>
          <button type="button" className="btn btn-primary btn-sm" onClick={openAddPrimary}>
            + Add primary offering
          </button>
        </div>
        <p className="rsa-muted rsa-poc-section-hint">Primary service lines for this category (e.g. main cart service).</p>

        <div className="rsa-ui-table-scroll">
          <table className="kd-table rsa-ui-table-full">
            <thead>
              <tr>
                <th>Choice</th>
                <th>Offering Name</th>
                <th>Primary?</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Active</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(currentCat.primaryOfferings || []).length === 0 ? (
                <tr>
                  <td colSpan={8}>No primary offerings yet — use &quot;Add primary offering&quot; above.</td>
                </tr>
              ) : (
                (currentCat.primaryOfferings || []).map(o => (
                  <tr key={o.id} className={`rsa-offer-row rsa-offer-row--${o.changeType || 'new'}`}>
                    <td>{o.choice}</td>
                    <td>{o.name}</td>
                    <td>{o.isPrimary ? 'Yes' : 'No'}</td>
                    <td>{o.quantity}</td>
                    <td>{o.status}</td>
                    <td>{o.activeDate || '—'}</td>
                    <td>{o.expiryDate || '—'}</td>
                    <td className="rsa-actions-cell">
                      <button type="button" className="btn btn-text btn-sm" onClick={() => viewOffering(o)}>View</button>
                      <button type="button" className="btn btn-text btn-sm" onClick={() => updateOffering(o)}>Update</button>
                      <button type="button" className="btn btn-text btn-sm" onClick={() => promptRemove(o.id, true)}>Remove</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rsa-poc-offering-section">
        <div className="rsa-poc-offering-head">
          <h3>Additional offerings</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={openAddAdditional}>
            + Add additional offering
          </button>
        </div>
        <p className="rsa-muted rsa-poc-section-hint">Supplemental lines (addons, optional services) for this category.</p>

        <div className="rsa-ui-table-scroll">
          <table className="kd-table rsa-ui-table-full">
            <thead>
              <tr>
                <th>Offering Name</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Active</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(currentCat.additionalOfferings || []).length === 0 ? (
                <tr>
                  <td colSpan={6}>No additional offering(s) added — use &quot;Add additional offering&quot; above.</td>
                </tr>
              ) : (
                (currentCat.additionalOfferings || []).map(o => (
                  <tr key={o.id} className={`rsa-offer-row rsa-offer-row--${o.changeType || 'new'}`}>
                    <td>{o.name}</td>
                    <td>{o.quantity}</td>
                    <td>{o.status}</td>
                    <td>{o.activeDate || '—'}</td>
                    <td>{o.expiryDate || '—'}</td>
                    <td className="rsa-actions-cell">
                      <button type="button" className="btn btn-text btn-sm" onClick={() => viewOffering(o)}>View</button>
                      <button type="button" className="btn btn-text btn-sm" onClick={() => updateOffering(o)}>Update</button>
                      <button type="button" className="btn btn-text btn-sm" onClick={() => promptRemove(o.id, false)}>Remove</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      {modal === 'addTab' && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-tab-title">
          <div className="rsa-modal-card rsa-modal-card--wide">
            <div className="rsa-modal-card__head" id="add-tab-title">Add category tab</div>
            <div className="rsa-modal-card__body">
              <p className="rsa-muted">Choose a template or define a custom category.</p>
              <div className="rsa-add-tab-grid">
                {ADD_TAB_PRESETS.map(p => (
                  <button key={p.label} type="button" className="rsa-add-tab-tile" onClick={() => addCategoryTab(p.label)}>
                    <span className="rsa-add-tab-tile__icon">{p.icon}</span>
                    <strong>{p.label}</strong>
                    <span className="rsa-add-tab-tile__desc">{p.desc}</span>
                  </button>
                ))}
              </div>
              <div className="rsa-add-tab-custom">
                <label className="rsa-ui-field rsa-ui-field--full">
                  <span>Custom category name</span>
                  <input
                    value={customTabName}
                    onChange={e => setCustomTabName(e.target.value)}
                    placeholder="e.g. Special collections"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!customTabName.trim()}
                  onClick={() => addCategoryTab(customTabName.trim())}
                >
                  Add custom tab
                </button>
              </div>
            </div>
            <div className="rsa-modal-card__foot">
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'pickName' && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pick-name-title">
          <div className="rsa-modal-card">
            <div className="rsa-modal-card__head" id="pick-name-title">
              {addMode === 'primary' ? 'Add primary offering' : 'Add additional offering'}
            </div>
            <div className="rsa-modal-card__body">
              <p className="rsa-muted">Select offering name first, then configure details.</p>
              <label className="rsa-ui-field rsa-ui-field--full">
                <span>Offering Name *</span>
                <select value={pickNameValue} onChange={e => setPickNameValue(e.target.value)}>
                  <option value="">— Select or search offering name —</option>
                  {OFFERING_NAMES.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rsa-modal-card__foot">
              <button type="button" className="btn btn-outline" onClick={() => { setModal(null); setAddMode(null) }}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={!pickNameValue} onClick={openConfigureFromPick}>
                Next: Configure →
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'configure' && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true">
          <div className="rsa-modal-card rsa-modal-card--wide">
            <div className="rsa-modal-card__head">
              {editingId ? 'Update offering' : 'Configure offering'} — {form.name}
            </div>
            <div className="rsa-modal-card__body rsa-modal-card__grid">
              <div className="rsa-config-section rsa-config-section--full">
                <h4 className="rsa-config-section__title">1 · Offering details</h4>
              </div>
              <label className="rsa-ui-field">
                <span>Choice code</span>
                <input value={form.choice} onChange={e => setForm(f => ({ ...f, choice: e.target.value }))} />
              </label>
              {showPrimaryToggle && (
                <label className="rsa-ui-field">
                  <span>Primary?</span>
                  <select value={form.isPrimary ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.value === 'yes' }))}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
              )}
              {!showPrimaryToggle && (
                <div className="rsa-ui-field">
                  <span>Type</span>
                  <div className="rsa-detail-value rsa-detail-value--inline">{addMode === 'primary' ? 'Primary offering' : 'Additional offering'}</div>
                </div>
              )}
              <label className="rsa-ui-field">
                <span>Quantity</span>
                <input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))} />
              </label>
              <label className="rsa-ui-field">
                <span>Status (P/I)</span>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="P">P — Active</option>
                  <option value="I">I — Inactive</option>
                </select>
              </label>
              <label className="rsa-ui-field">
                <span>Active date *</span>
                <input type="date" value={form.activeDate} onChange={e => setForm(f => ({ ...f, activeDate: e.target.value }))} />
              </label>
              <label className="rsa-ui-field">
                <span>Expiry date</span>
                <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
              </label>

              <div className="rsa-config-section rsa-config-section--full">
                <h4 className="rsa-config-section__title">2 · Service types</h4>
              </div>
              <div className="rsa-ui-field rsa-ui-field--full">
                <span>Service types *</span>
                <div className="rsa-chip-row">
                  {SERVICE_TYPE_OPTS.map(opt => (
                    <button key={opt} type="button" className={`rsa-chip${form.serviceTypes.includes(opt) ? ' rsa-chip--on' : ''}`} onClick={() => toggleMulti('serviceTypes', opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rsa-config-section rsa-config-section--full">
                <h4 className="rsa-config-section__title">3 · Frequency</h4>
              </div>
              <div className="rsa-ui-field rsa-ui-field--full">
                <span>Pickup frequency *</span>
                <div className="rsa-chip-row">
                  {FREQ_OPTS.map(opt => (
                    <button key={opt} type="button" className={`rsa-chip${form.frequencies[0] === opt ? ' rsa-chip--on' : ''}`} onClick={() => toggleSingleFreq(opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rsa-config-section rsa-config-section--full">
                <h4 className="rsa-config-section__title">4 · Channels</h4>
              </div>
              <div className="rsa-ui-field rsa-ui-field--full">
                <span>Channels *</span>
                <div className="rsa-chip-row">
                  {CHANNEL_OPTS.map(opt => (
                    <button key={opt} type="button" className={`rsa-chip${form.channels.includes(opt) ? ' rsa-chip--on' : ''}`} onClick={() => toggleMulti('channels', opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rsa-modal-card__foot">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  if (editingId) {
                    setModal(null)
                    setEditingId(null)
                  } else {
                    setModal('pickName')
                  }
                }}
              >
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={saveOffering}>
                {editingId ? 'Save updates' : 'Save offering'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'viewOffering' && viewOfferingObj && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true">
          <div className="rsa-modal-card rsa-modal-card--wide">
            <div className="rsa-modal-card__head">Offering details — {viewOfferingObj.name}</div>
            <div className="rsa-modal-card__body rsa-view-offering">
              <div className="rsa-detail-grid rsa-detail-grid--3">
                <div><span className="rsa-detail-label">Choice</span><div className="rsa-detail-value">{viewOfferingObj.choice}</div></div>
                <div><span className="rsa-detail-label">Quantity</span><div className="rsa-detail-value">{viewOfferingObj.quantity}</div></div>
                <div><span className="rsa-detail-label">Status</span><div className="rsa-detail-value">{viewOfferingObj.status}</div></div>
                <div><span className="rsa-detail-label">Active date</span><div className="rsa-detail-value">{viewOfferingObj.activeDate || '—'}</div></div>
                <div><span className="rsa-detail-label">Expiry date</span><div className="rsa-detail-value">{viewOfferingObj.expiryDate || '—'}</div></div>
                <div><span className="rsa-detail-label">Primary</span><div className="rsa-detail-value">{viewOfferingObj.isPrimary ? 'Yes' : 'No'}</div></div>
              </div>
              <div className="rsa-view-offering__block">
                <span className="rsa-detail-label">Service types</span>
                <div className="rsa-chip-row">
                  {(viewOfferingObj.serviceTypes || []).length
                    ? (viewOfferingObj.serviceTypes || []).map(c => <span key={c} className="rsa-chip rsa-chip--static">{c}</span>)
                    : <span className="rsa-muted">—</span>}
                </div>
              </div>
              <div className="rsa-view-offering__block">
                <span className="rsa-detail-label">Frequency</span>
                <div className="rsa-detail-value">{(viewOfferingObj.frequencies || []).join(', ') || '—'}</div>
              </div>
              <div className="rsa-view-offering__block">
                <span className="rsa-detail-label">Channels</span>
                <div className="rsa-chip-row">
                  {(viewOfferingObj.channels || []).length
                    ? (viewOfferingObj.channels || []).map(c => <span key={c} className="rsa-chip rsa-chip--static">{c}</span>)
                    : <span className="rsa-muted">—</span>}
                </div>
              </div>
            </div>
            <div className="rsa-modal-card__foot">
              <button type="button" className="btn btn-primary" onClick={() => { setModal(null); setViewOfferingObj(null) }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'incomplete' && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true">
          <div className="rsa-modal-card">
            <div className="rsa-modal-card__head rsa-modal-card__head--warn">Incomplete Configuration</div>
            <div className="rsa-modal-card__body">
              <p>The following required tabs need at least one primary offering configured:</p>
              <ul>
                {!mergedTabs.solidWaste?.primaryOfferings?.length && <li>Solid Waste</li>}
                {!mergedTabs.yardWaste?.primaryOfferings?.length && <li>Yard Waste</li>}
              </ul>
              <p className="rsa-muted">Optional tabs can be left empty.</p>
            </div>
            <div className="rsa-modal-card__foot">
              <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'cannotRemove' && (
        <div className="rsa-modal-backdrop" role="dialog" aria-modal="true">
          <div className="rsa-modal-card">
            <div className="rsa-modal-card__head rsa-modal-card__head--danger">Cannot Remove Offering</div>
            <div className="rsa-modal-card__body">
              <p>
                &quot;{currentCat.label}&quot; is a mandatory category and requires at least one primary offering to proceed.
                Add a replacement offering before removing this one.
              </p>
            </div>
            <div className="rsa-modal-card__foot">
              <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'

const WIZ_STEPS = [
  { num: 1, label: 'Rate Details' },
  { num: 2, label: 'Offerings' },
  { num: 3, label: 'Service Types' },
  { num: 4, label: 'Service Owner' },
]

const SERVICE_TYPES = [
  'Regular Service', 'Extra Pickup', 'Missed Pickup', 'Contamination',
  'Damage / Replacement', 'Special Instructions', 'Holiday Schedule',
]

const EMPTY_OFFERING_FORM = {
  summaryBilled: '', serviceCategory: '', serviceLevel: '', containerType: '',
  chargeFreq: '', facePrice: '', avgPrice: '', targetPrice: '',
  chargeType: '', chargeMethod: '', rateNotes: '', baseRate: '',
  contractGroup: '', serviceSetupBy: '',
  secondaryCharges: '', asset: '', maxQty: '', serviceFreq: '',
  serviceDayNotes: '', chargeCode: '', stopType: '', rateType: '',
  districtCode: '', containerColor: '',
  serviceTypes: [], serviceOwnerException: 'no',
}

function offeringDisplayName(form) {
  const cat = form.serviceCategory?.trim() || 'Offering'
  const lvl = form.serviceLevel?.trim() || 'Standard'
  return `${cat} – ${lvl}`
}

function AddOfferingWizard({ onClose, onSave, initialForm, modalTitle }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() =>
    initialForm ? { ...EMPTY_OFFERING_FORM, ...initialForm } : { ...EMPTY_OFFERING_FORM },
  )

  useEffect(() => {
    setForm(initialForm ? { ...EMPTY_OFFERING_FORM, ...initialForm } : { ...EMPTY_OFFERING_FORM })
    setStep(1)
  }, [initialForm])

  const update = (field, val) => setForm(p => ({ ...p, [field]: val }))
  const toggleServiceType = (t) => setForm(p => ({
    ...p,
    serviceTypes: p.serviceTypes.includes(t) ? p.serviceTypes.filter(x => x !== t) : [...p.serviceTypes, t],
  }))

  const handleSave = () => {
    onSave({ ...form })
  }

  return (
    <div className="off-wiz-backdrop open" onClick={(e) => { if (e.target.classList.contains('off-wiz-backdrop')) onClose() }}>
      <div className="off-wiz-modal">
        <div className="off-wiz-topbar">
          <span className="off-wiz-topbar-title">{modalTitle}</span>
          <button type="button" className="off-wiz-x" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="off-wiz-progress">
          {WIZ_STEPS.map((s, i) => (
            <div key={s.num} className="off-wiz-step-wrap">
              <div className={`off-wiz-step-item${step === s.num ? ' wiz-active' : step > s.num ? ' wiz-done' : ''}`}>
                <div className="off-wiz-num">
                  {step > s.num
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : s.num
                  }
                </div>
                <span className="off-wiz-step-lbl">{s.label}</span>
              </div>
              {i < WIZ_STEPS.length - 1 && (
                <div className={`off-wiz-line${step > s.num ? ' done' : ''}`} />
              )}
            </div>
          ))}
        </div>

        <div className="off-wiz-body">
          <div className={`off-wiz-step-content${step === 1 ? ' active' : ''}`}>
            <div className="off-wiz-step-heading">Rate Details</div>
            <div className="wiz-grid-2">
              <div className="wiz-field">
                <div className="wiz-label">Summary Billed <span className="wiz-req">*</span></div>
                <select className="wiz-select" value={form.summaryBilled} onChange={e => update('summaryBilled', e.target.value)}>
                  <option value="">Select…</option><option>Yes</option><option>No</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Service Category <span className="wiz-req">*</span></div>
                <select className="wiz-select" value={form.serviceCategory} onChange={e => update('serviceCategory', e.target.value)}>
                  <option value="">Select…</option><option>Solid Waste</option><option>Recycling</option><option>Yard Waste</option><option>Bulk Waste</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Service Level</div>
                <select className="wiz-select" value={form.serviceLevel} onChange={e => update('serviceLevel', e.target.value)}>
                  <option value="">Select…</option><option>Standard</option><option>Premium</option><option>Basic</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Container Type</div>
                <select className="wiz-select" value={form.containerType} onChange={e => update('containerType', e.target.value)}>
                  <option value="">Select…</option><option>Cart – 35 gal</option><option>Cart – 65 gal</option><option>Cart – 96 gal</option><option>Dumpster – 2 yd</option><option>Dumpster – 4 yd</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Charge Frequency</div>
                <select className="wiz-select" value={form.chargeFreq} onChange={e => update('chargeFreq', e.target.value)}>
                  <option value="">Select…</option><option>Monthly</option><option>Quarterly</option><option>Annually</option><option>Per Service</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Charge Type</div>
                <select className="wiz-select" value={form.chargeType} onChange={e => update('chargeType', e.target.value)}>
                  <option value="">Select…</option><option>Flat Rate</option><option>Variable</option><option>Per Unit</option>
                </select>
              </div>
            </div>
            <div className="wiz-grid-3" style={{ marginTop: 14 }}>
              <div className="wiz-field">
                <div className="wiz-label">Face Price ($)</div>
                <div className="wiz-input-prefix"><span>$</span><input className="wiz-input" type="number" value={form.facePrice} onChange={e => update('facePrice', e.target.value)} placeholder="0.00"/></div>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Average Price ($)</div>
                <div className="wiz-input-prefix"><span>$</span><input className="wiz-input" type="number" value={form.avgPrice} onChange={e => update('avgPrice', e.target.value)} placeholder="0.00"/></div>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Target Price ($)</div>
                <div className="wiz-input-prefix"><span>$</span><input className="wiz-input" type="number" value={form.targetPrice} onChange={e => update('targetPrice', e.target.value)} placeholder="0.00"/></div>
              </div>
            </div>
            <div className="wiz-field" style={{ marginTop: 14 }}>
              <div className="wiz-label">Rate Notes</div>
              <textarea className="wiz-textarea" value={form.rateNotes} onChange={e => update('rateNotes', e.target.value)} placeholder="Additional rate notes…" />
            </div>
            <div className="wiz-grid-2" style={{ marginTop: 14 }}>
              <div className="wiz-field">
                <div className="wiz-label">Base Rate ($)</div>
                <div className="wiz-input-prefix"><span>$</span><input className="wiz-input" type="number" value={form.baseRate} onChange={e => update('baseRate', e.target.value)} placeholder="0.00"/></div>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Contract # / Group #</div>
                <input className="wiz-input" value={form.contractGroup} onChange={e => update('contractGroup', e.target.value)} placeholder="e.g. CNT-001 / GRP-A"/>
              </div>
              <div className="wiz-field" style={{ gridColumn: 'span 2' }}>
                <div className="wiz-label">Service Setup By</div>
                <select className="wiz-select" value={form.serviceSetupBy} onChange={e => update('serviceSetupBy', e.target.value)}>
                  <option value="">Select…</option><option>Republic Services</option><option>Municipal / Government</option><option>Third Party</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`off-wiz-step-content${step === 2 ? ' active' : ''}`}>
            <div className="off-wiz-step-heading">Offerings</div>
            <div className="wiz-grid-2">
              <div className="wiz-field">
                <div className="wiz-label">Secondary Charges</div>
                <select className="wiz-select" value={form.secondaryCharges} onChange={e => update('secondaryCharges', e.target.value)}>
                  <option value="">Select…</option><option>Fuel Surcharge</option><option>Environmental Fee</option><option>Admin Fee</option><option>None</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Asset</div>
                <select className="wiz-select" value={form.asset} onChange={e => update('asset', e.target.value)}>
                  <option value="">Select…</option><option>Cart – 65 gal Blue</option><option>Cart – 96 gal Grey</option><option>Dumpster – 2 yd</option><option>Roll-off – 10 yd</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Max Qty per Service Area</div>
                <input className="wiz-input" type="number" value={form.maxQty} onChange={e => update('maxQty', e.target.value)} placeholder="e.g. 2"/>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Service Frequency</div>
                <select className="wiz-select" value={form.serviceFreq} onChange={e => update('serviceFreq', e.target.value)}>
                  <option value="">Select…</option><option>1x / week</option><option>2x / week</option><option>3x / week</option><option>Bi-weekly</option><option>Monthly</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Charge Code</div>
                <input className="wiz-input" value={form.chargeCode} onChange={e => update('chargeCode', e.target.value)} placeholder="e.g. CC-0042"/>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Stop Type</div>
                <select className="wiz-select" value={form.stopType} onChange={e => update('stopType', e.target.value)}>
                  <option value="">Select…</option><option>Residential</option><option>Commercial</option><option>Industrial</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">Rate Type</div>
                <select className="wiz-select" value={form.rateType} onChange={e => update('rateType', e.target.value)}>
                  <option value="">Select…</option><option>Standard</option><option>Contracted</option><option>Negotiated</option>
                </select>
              </div>
              <div className="wiz-field">
                <div className="wiz-label">District Code</div>
                <input className="wiz-input" value={form.districtCode} onChange={e => update('districtCode', e.target.value)} placeholder="e.g. DST-KY-09"/>
              </div>
            </div>
            <div className="wiz-field" style={{ marginTop: 4 }}>
              <div className="wiz-label">Service Day Notes</div>
              <textarea className="wiz-textarea" value={form.serviceDayNotes} onChange={e => update('serviceDayNotes', e.target.value)} placeholder="Service day notes…" />
            </div>
            <div className="wiz-field" style={{ marginTop: 14 }}>
              <div className="wiz-label">Containerized Color</div>
              <input className="wiz-input" value={form.containerColor} onChange={e => update('containerColor', e.target.value)} placeholder="e.g. Blue lid for recycling"/>
            </div>
          </div>

          <div className={`off-wiz-step-content${step === 3 ? ' active' : ''}`}>
            <div className="off-wiz-step-heading">Service Types</div>
            <p style={{ fontSize: 13, color: '#5c7185', marginBottom: 14 }}>Select all service types that apply to this offering.</p>
            <div className="wiz-check-list">
              {SERVICE_TYPES.map(t => (
                <label key={t} className={`wiz-check-item${form.serviceTypes.includes(t) ? ' checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.serviceTypes.includes(t)}
                    onChange={() => toggleServiceType(t)}
                  />
                  <span className="wiz-check-item-label">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={`off-wiz-step-content${step === 4 ? ' active' : ''}`}>
            <div className="off-wiz-step-heading">Service Owner</div>
            <div className="wiz-field">
              <div className="wiz-label">Service Owner Exception</div>
              <p style={{ fontSize: 12.5, color: '#5c7185', marginBottom: 12, lineHeight: 1.5 }}>
                Does this offering have a service owner exception that differs from the document-level default?
              </p>
              <div className="wiz-radio-group">
                <label className="wiz-radio">
                  <input type="radio" value="yes" checked={form.serviceOwnerException === 'yes'} onChange={() => update('serviceOwnerException', 'yes')} />
                  Yes — this offering has a service owner exception
                </label>
                <label className="wiz-radio">
                  <input type="radio" value="no" checked={form.serviceOwnerException === 'no'} onChange={() => update('serviceOwnerException', 'no')} />
                  No — use document-level default
                </label>
              </div>
            </div>
            {form.serviceOwnerException === 'yes' && (
              <div className="wiz-field" style={{ marginTop: 16 }}>
                <div className="wiz-label">Service Owner</div>
                <select className="wiz-select">
                  <option value="">Select service owner…</option>
                  <option>Republic Services</option>
                  <option>Municipal / Government</option>
                  <option>HOA / Community</option>
                  <option>Third Party Contractor</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="off-wiz-footer">
          <div>
            {step > 1 && (
              <button type="button" className="btn btn-outline" onClick={() => setStep(p => p - 1)} style={{ padding: '8px 16px', fontSize: 13 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>
            )}
          </div>
          <div className="off-wiz-footer-right">
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
            {step < 4
              ? (
                <button type="button" className="btn btn-primary" onClick={() => setStep(p => p + 1)} style={{ padding: '8px 16px', fontSize: 13 }}>
                  Next
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handleSave} style={{ padding: '8px 16px', fontSize: 13 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {initialForm ? 'Save changes' : 'Save Offering'}
                </button>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_FORM = {
  ...EMPTY_OFFERING_FORM,
  serviceCategory: 'Solid Waste',
  serviceLevel: 'Standard',
  asset: 'Cart – 65 gal',
  chargeFreq: 'Monthly',
  baseRate: '22.50',
  chargeType: 'Flat Rate',
}

export default function Offerings({ onPrev, onNext, onCountChange }) {
  const [offerings, setOfferings] = useState([{ id: 1, form: DEFAULT_FORM }])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardInitial, setWizardInitial] = useState(null)
  const [wizardEditId, setWizardEditId] = useState(null)

  useEffect(() => {
    onCountChange?.(offerings.length, offerings.length)
  }, [offerings.length, onCountChange])

  const removeOffering = (id) => {
    if (!window.confirm('Remove this offering from the document?')) return
    setOfferings(prev => prev.filter(o => o.id !== id))
  }

  const openAddWizard = () => {
    setWizardInitial(null)
    setWizardEditId(null)
    setWizardOpen(true)
  }

  const openEditWizard = (off) => {
    setWizardInitial({ ...off.form })
    setWizardEditId(off.id)
    setWizardOpen(true)
  }

  const saveOffering = (form) => {
    if (wizardEditId != null) {
      setOfferings(prev => prev.map(o => (o.id === wizardEditId ? { ...o, form: { ...form } } : o)))
    } else {
      setOfferings(prev => [...prev, { id: Date.now(), form: { ...form } }])
    }
    setWizardOpen(false)
    setWizardEditId(null)
    setWizardInitial(null)
  }

  return (
    <div className="off-page">
      <div className="off-header">
        <div>
          <div className="off-title">Offerings</div>
          <div className="off-subtitle">Configure service offerings and pricing for this knowledge document.</div>
        </div>
        <button type="button" className="off-refresh-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh Assets
        </button>
      </div>

      <div className="off-info-banner">
        <p><strong>What are Offerings?</strong> Offerings represent specific service packages available to customers within this service area.</p>
        <p>Each offering defines the container type, service frequency, pricing model, charge codes, and applicable service types. Configure each offering to match the contracted service terms.</p>
        <p><em>Tip: Add multiple offerings to cover all service tiers — e.g., Standard, Premium, and Bulk service levels.</em></p>
      </div>

      <div className="off-section-title">Configured Offerings</div>
      {offerings.map(off => {
        const f = off.form
        const baseDisplay = f.baseRate ? (String(f.baseRate).startsWith('$') ? f.baseRate : `$${f.baseRate}`) : '—'
        return (
          <div key={off.id} className="off-card">
            <div className="off-card-head">
              <div>
                <span className="off-card-name">{offeringDisplayName(f)}</span>
                <span className="off-card-asset">— {f.asset || 'N/A'}</span>
              </div>
              <div className="off-card-head-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditWizard(off)}>
                  Edit
                </button>
                <button type="button" className="off-close-btn" title="Delete offering" onClick={() => removeOffering(off.id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div className="off-card-detail">
              <span><b>Charge Frequency:</b> {f.chargeFreq || '—'}</span>
              <span><b>Base Rate:</b> {baseDisplay}</span>
              <span><b>Charge Type:</b> {f.chargeType || '—'}</span>
            </div>
          </div>
        )
      })}

      <button type="button" className="off-add-btn" onClick={openAddWizard}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Offering
      </button>

      <div className="sc-action-row" style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-outline" onClick={onPrev}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Previous
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-primary" onClick={onNext}>
            Save &amp; Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>

      {wizardOpen && (
        <AddOfferingWizard
          key={wizardEditId ?? 'new'}
          modalTitle={wizardEditId != null ? 'Edit Offering' : 'Add Offering'}
          initialForm={wizardInitial}
          onClose={() => { setWizardOpen(false); setWizardEditId(null); setWizardInitial(null) }}
          onSave={saveOffering}
        />
      )}
    </div>
  )
}

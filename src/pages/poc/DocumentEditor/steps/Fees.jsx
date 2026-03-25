import { useState, useEffect } from 'react'

/* ─── Fee master list (Add Fee dropdown) ─────────────────────────────────── */
const ALL_FEES = [
  'Activation Fee',
  'Administrative Fee',
  'City Sales Tax',
  'City Utility Tax',
  'Collection Fee',
  'Commerce Tax',
  'Commodity Surcharge',
  'Container Damage Repair',
  'Container Exchange Fee (RS Damaged/Odor/Appearance)',
  'Container Replacement Fee (Customer Damaged/Lost/Stolen)',
  'Delivery Fee',
  'ERF – Environmental Recovery Fee',
  'FRF – Fuel Recovery Fee',
  'Hazardous Material Surcharge',
  'Late Fee',
  'Missed Pickup Fee',
  'Overflow Fee',
  'Recycling Contamination Fee',
  'Removal Fee',
  'Service Interrupt Fee',
  'Service Reinstatement Fee',
  'Special Handling Fee',
  'Tip Fee Surcharge',
]

const UNIT_OPTIONS = [
  '$ (flat amount – e.g., $10)',
  '% (percentage – e.g., 5%)',
  'Calculated (e.g., Greater of $10 or 3%)',
]

const STANDARD_FEES = [
  { id: 1,  name: 'Administrative Fee' },
  { id: 2,  name: 'Container Exchange Fee (RS Damaged/Odor/Appearance)' },
  { id: 3,  name: 'Container Replacement Fee (Customer Damaged/Lost/Stolen)' },
  { id: 4,  name: 'Delivery Fee' },
  { id: 5,  name: 'ERF – Environmental Recovery Fee' },
  { id: 6,  name: 'FRF – Fuel Recovery Fee' },
  { id: 7,  name: 'Late Fee' },
  { id: 8,  name: 'Removal Fee' },
  { id: 9,  name: 'Service Interrupt Fee' },
  { id: 10, name: 'Service Reinstatement Fee' },
]

/* ─── RTE toolbar ─────────────────────────────────────────────────────────── */
function FeeRTE({ placeholder }) {
  return (
    <div className="fee-rte-wrap">
      <div className="fee-rte-toolbar">
        {/* Ordered list */}
        <button type="button" className="fee-rte-btn" title="Ordered list">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
            <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
          </svg>
        </button>
        {/* Bullet list */}
        <button type="button" className="fee-rte-btn" title="Bullet list">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
            <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
          </svg>
        </button>
        <span className="fee-rte-sep" />
        <button type="button" className="fee-rte-btn fee-rte-bold" title="Bold"><b>B</b></button>
        <button type="button" className="fee-rte-btn fee-rte-italic" title="Italic"><i>I</i></button>
        <button type="button" className="fee-rte-btn fee-rte-underline" title="Underline"><u>U</u></button>
        <button type="button" className="fee-rte-btn fee-rte-strike" title="Strikethrough"><s>S</s></button>
        <span className="fee-rte-sep" />
        {/* Link */}
        <button type="button" className="fee-rte-btn" title="Insert link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>
      </div>
      <div
        className="fee-rte-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />
    </div>
  )
}

/* ─── EditFeeModal ────────────────────────────────────────────────────────── */
function EditFeeModal({ feeName, isCustom, onClose, onSubmit }) {
  const [applicable, setApplicable] = useState('yes')
  const [corpRates, setCorpRates]   = useState('no')
  const [unitOfMeasure, setUnitOfMeasure] = useState(UNIT_OPTIONS[0])
  const [amount, setAmount]         = useState('')
  const [chargeCode, setChargeCode] = useState('')
  const [errors, setErrors]         = useState({})

  const notApplicable = applicable === 'no'
  const usesCorpRates = corpRates === 'yes'
  const fieldsLocked  = notApplicable || usesCorpRates

  const validate = () => {
    const errs = {}
    if (!applicable) errs.applicable = 'Required'
    if (applicable === 'yes' && !usesCorpRates) {
      if (!amount.trim()) errs.amount = 'Amount is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSubmit({
      applicable: applicable === 'yes',
      corpRates: usesCorpRates,
      unitOfMeasure,
      amount,
      chargeCode,
    })
  }

  return (
    <div className="fmodal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fmodal">

        {/* Header */}
        <div className="fmodal-header">
          <span className="fmodal-title">Edit Fee: {feeName}</span>
          <button className="fmodal-x" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="fmodal-body">

          {/* Fee Applicable? */}
          <div className="fmodal-field">
            <div className="fmodal-label fmodal-label--req">Fee Applicable? <span className="fmodal-req">*</span></div>
            <div className="fmodal-radio-row">
              <label className="fmodal-radio">
                <input type="radio" name="applicable" checked={applicable === 'yes'} onChange={() => setApplicable('yes')} />
                Yes
              </label>
              <label className="fmodal-radio">
                <input type="radio" name="applicable" checked={applicable === 'no'} onChange={() => setApplicable('no')} />
                No
              </label>
            </div>
            {errors.applicable && <div className="fmodal-err">{errors.applicable}</div>}
          </div>

          {/* Refer to Corp Rates? */}
          <div className="fmodal-field">
            <div className="fmodal-label fmodal-label--req">Refer to Corp Rates? <span className="fmodal-req">*</span></div>
            <p className="fmodal-desc">
              This will lock out the other customer facing fields because the Rate will come from the corporate rate table.
            </p>
            <div className="fmodal-radio-row">
              <label className="fmodal-radio">
                <input type="radio" name="corpRates" checked={corpRates === 'yes'} onChange={() => setCorpRates('yes')} />
                Yes
              </label>
              <label className="fmodal-radio">
                <input type="radio" name="corpRates" checked={corpRates === 'no'} onChange={() => setCorpRates('no')} />
                No
              </label>
            </div>
          </div>

          {/* Unit of Measure + Amount */}
          <div className="fmodal-grid-2">
            <div className="fmodal-field">
              <div className="fmodal-label fmodal-label--req">Unit of Measure <span className="fmodal-req">*</span></div>
              <select
                className={`fmodal-select${fieldsLocked ? ' fmodal-locked' : ''}`}
                value={unitOfMeasure}
                onChange={e => setUnitOfMeasure(e.target.value)}
                disabled={fieldsLocked}
              >
                {UNIT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <span className="fmodal-hint">Will be greyed out if the fee is not applicable</span>
            </div>
            <div className="fmodal-field">
              <div className="fmodal-label fmodal-label--req">Amount <span className="fmodal-req">*</span></div>
              <input
                type="text"
                className={`fmodal-input${fieldsLocked ? ' fmodal-locked' : ''}${errors.amount ? ' fmodal-input--err' : ''}`}
                placeholder="e.g. 3.95"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={fieldsLocked}
              />
              {errors.amount && <div className="fmodal-err">{errors.amount}</div>}
              <div className="fmodal-examples">
                <div className="fmodal-examples-title">Examples:</div>
                <ul>
                  <li>45, 10.23, 7.99 (with $ Unit of Measure)</li>
                  <li>3, 7.8 (with % Unit of Measure)</li>
                  <li>Greater of $10 or 3% (with Calculated)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Charge Code */}
          <div className="fmodal-field">
            <div className="fmodal-label">Charge Code</div>
            <input
              type="text"
              className="fmodal-input"
              placeholder="e.g. ADM"
              value={chargeCode}
              onChange={e => setChargeCode(e.target.value)}
            />
          </div>

          {/* Fee Description */}
          <div className="fmodal-field">
            <div className="fmodal-label fmodal-label--req">Fee Description</div>
            <p className="fmodal-desc fmodal-desc--examples">
              Examples: "Yard Waste Cart (for a Delivery Fee that varies by Service Waste Category)" or "No fees apply due to contract terms"
            </p>
            <FeeRTE placeholder="Enter fee description…" />
          </div>

        </div>

        {/* Footer */}
        <div className="fmodal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Submit</button>
        </div>

      </div>
    </div>
  )
}

/* ─── AddFeeModal (step 1 — fee picker) ──────────────────────────────────── */
function AddFeeModal({ onClose, onContinue }) {
  const [selected, setSelected] = useState('')
  const [err, setErr] = useState('')

  const handleContinue = () => {
    if (!selected) { setErr('Please select a fee to continue'); return }
    onContinue(selected)
  }

  return (
    <div className="fmodal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fmodal">

        {/* Header */}
        <div className="fmodal-header">
          <span className="fmodal-title">Add Fee</span>
          <button className="fmodal-x" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="fmodal-body">
          <div className="fmodal-field">
            <div className="fmodal-label fmodal-label--req">
              Fee <span className="fmodal-req">*</span>
            </div>
            <p className="fmodal-desc">
              Select the duplicate or non-standard fee to be added from the drop-down menu.
            </p>
            <select
              className={`fmodal-listbox${err ? ' fmodal-input--err' : ''}`}
              size={9}
              value={selected}
              onChange={e => { setSelected(e.target.value); setErr('') }}
            >
              <option value="" disabled>Select...</option>
              {ALL_FEES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            {err && <div className="fmodal-err">{err}</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="fmodal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleContinue}>Continue</button>
        </div>

      </div>
    </div>
  )
}

/* ─── FeeRow ──────────────────────────────────────────────────────────────── */
function FeeRow({ fee, isCustom, onEdit, onRemove }) {
  const { saved, applicable, amount } = fee

  return (
    <div className="fee-row">
      <div className="fee-row-main">
        <div className="fee-row-left">
          {saved && applicable && <span className="fee-applied-dot" />}
          <span className="fee-row-name">{fee.name}</span>
          {isCustom && <span className="fee-custom-badge">Custom</span>}
        </div>
        <div className="fee-row-right">
          {saved && applicable && amount && (
            <span className="fee-amount-chip">{amount}</span>
          )}
          {saved && !applicable && (
            <span className="fee-na-chip">N/A</span>
          )}
          <button className="fee-edit-btn" onClick={() => onEdit(fee)}>Edit</button>
          {isCustom && (
            <button className="fee-remove-btn" onClick={() => onRemove(fee.id)} title="Remove">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Fees page ───────────────────────────────────────────────────────────── */
let nextId = 100

export default function Fees({ onPrev, onSubmit, onCountChange }) {
  const [fees, setFees] = useState(
    STANDARD_FEES.map(f => ({ ...f, saved: false, applicable: false, amount: '' }))
  )
  const [customFees, setCustomFees] = useState([])

  // Modal state
  const [showAdd, setShowAdd]       = useState(false)   // step-1 picker
  const [editingFee, setEditingFee] = useState(null)    // { id, name, isCustom }

  const allFees    = [...fees, ...customFees]
  const savedCount = allFees.filter(f => f.saved).length

  useEffect(() => {
    onCountChange?.(savedCount, allFees.length)
  }, [savedCount, allFees.length])

  /* ── handlers ── */
  const openEdit = (fee) => setEditingFee({ id: fee.id, name: fee.name, isCustom: !!fee.isCustom })

  const handleAddContinue = (feeName) => {
    setShowAdd(false)
    // Create a temporary custom fee and open its edit modal
    const newFee = { id: nextId++, name: feeName, isCustom: true, saved: false, applicable: false, amount: '' }
    setCustomFees(prev => [...prev, newFee])
    setEditingFee({ id: newFee.id, name: newFee.name, isCustom: true })
  }

  const handleEditSubmit = (data) => {
    const update = (list) =>
      list.map(f =>
        f.id === editingFee.id
          ? {
              ...f,
              saved: true,
              applicable: data.applicable,
              amount: data.applicable && !data.corpRates && data.amount
                ? `$${parseFloat(data.amount).toFixed(2)}`
                : '',
            }
          : f
      )

    if (editingFee.isCustom) {
      setCustomFees(prev => update(prev))
    } else {
      setFees(prev => update(prev))
    }
    setEditingFee(null)
  }

  const removeCustomFee = (id) => setCustomFees(prev => prev.filter(f => f.id !== id))

  return (
    <div className="fees-page">

      {/* Header */}
      <div className="fees-header">
        <h2 className="fees-title">Fee Configuration</h2>
        <p className="fees-subtitle">
          Fees that do not apply will display with a blank value on the summary screen.
          Fees that do apply will display with the corresponding fee amount on the right side of the tab.
        </p>
      </div>

      {/* Fee list */}
      <div className="fees-section">
        <div className="fees-section-label">Standard Fees</div>
        <div className="fees-list">
          {fees.map(fee => (
            <FeeRow key={fee.id} fee={fee} isCustom={false} onEdit={openEdit} onRemove={() => {}} />
          ))}
          {customFees.map(fee => (
            <FeeRow key={fee.id} fee={{ ...fee, isCustom: true }} isCustom onEdit={openEdit} onRemove={removeCustomFee} />
          ))}
        </div>

        <div className="fees-add-wrap">
          <button className="fees-add-btn" onClick={() => setShowAdd(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Fee
          </button>
          <span className="fees-add-hint">Click to add non-standard or additional fees</span>
        </div>
      </div>

      {/* Step-1 Add Fee picker modal */}
      {showAdd && (
        <AddFeeModal
          onClose={() => setShowAdd(false)}
          onContinue={handleAddContinue}
        />
      )}

      {/* Edit Fee modal */}
      {editingFee && (
        <EditFeeModal
          feeName={editingFee.name}
          isCustom={editingFee.isCustom}
          onClose={() => setEditingFee(null)}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Action row */}
      <div className="sc-action-row" style={{ marginTop: 8 }}>
        <button className="btn btn-outline" onClick={onPrev}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Previous
        </button>
        <button className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Submit for Approval
        </button>
      </div>

    </div>
  )
}

import { useState, useEffect } from 'react'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

const OWNER_ROWS = ['Setup','Cancellation','Missed Pickups','Transfer of Service','Reinstatement','Service Change']

function ChevronSvg() {
  return (
    <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}

function DeleteSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}

function PlusSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function RadioPills({ name, options, value, onChange }) {
  return (
    <div className="radio-group">
      {options.map(opt => (
        <label
          key={opt.value}
          className={`radio-pill${value === opt.value ? opt.type === 'yes' ? ' selected-yes' : opt.type === 'no' ? ' selected-no' : ' selected' : ''}`}
        >
          <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

function Accordion({ id, title, badge, headerExtra, openIds, onToggle, children }) {
  const isOpen = openIds.includes(id)
  return (
    <div className={`card${isOpen ? ' open' : ''}`}>
      <div className="card-header" onClick={() => onToggle(id)}>
        <span className="card-title">{title}</span>
        {badge && <span className="badge badge-req">{badge}</span>}
        <div className="spacer" />
        {headerExtra}
        <ChevronSvg />
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  )
}

export default function KnowledgeArea({ onNext, onCountChange }) {
  const [openSections, setOpenSections] = useState(['s1','s2','s3','s4','s5','s6','s7','s8','s9'])
  const [completedSections, setCompletedSections] = useState(new Set())
  const [locations, setLocations] = useState([
    { city: '', county: '', state: 'KY', primary: true },
    { city: '', county: '', state: 'KY', primary: false },
  ])
  const [contracts, setContracts] = useState([
    { num: '', group: '', desc: '' },
    { num: '', group: '', desc: '' },
  ])
  const [invoices, setInvoices] = useState([{ group: '', desc: '' }])
  const [svcInterrupt, setSvcInterrupt] = useState('no')
  const [liable, setLiable] = useState('no')
  const [ownerRadios, setOwnerRadios] = useState({
    'Setup': 'republic', 'Cancellation': 'muni', 'Missed Pickups': 'republic',
    'Transfer of Service': 'muni', 'Reinstatement': 'republic', 'Service Change': 'muni'
  })
  const [options, setOptions] = useState({
    'Walk-in Payment': { on: false, desc: '' },
    'Container Pick Up / Return': { on: true, desc: '' },
    'Leave Container Onsite': { on: false, desc: '' },
    'CSA Sign at Division': { on: true, desc: '' },
  })

  const toggle = (id) => setOpenSections(prev => {
    const isOpen = prev.includes(id)
    if (isOpen) setCompletedSections(p => new Set([...p, id]))
    return isOpen ? prev.filter(s => s !== id) : [...prev, id]
  })

  useEffect(() => {
    onCountChange?.(completedSections.size, 9)
  }, [completedSections.size])

  const addLocation = (e) => {
    e.stopPropagation()
    setLocations(prev => [...prev, { city: '', county: '', state: '', primary: false }])
  }
  const removeLocation = (idx) => setLocations(prev => prev.filter((_, i) => i !== idx))
  const updateLocation = (idx, field, val) => setLocations(prev => prev.map((l, i) => i === idx ? {...l, [field]: val} : l))

  const addContractRow = () => setContracts(prev => [...prev, { num: '', group: '', desc: '' }])
  const delContractRow = (idx) => setContracts(prev => prev.filter((_, i) => i !== idx))
  const updateContract = (idx, field, val) => setContracts(prev => prev.map((c, i) => i === idx ? {...c, [field]: val} : c))

  const addInvoiceRow = () => setInvoices(prev => [...prev, { group: '', desc: '' }])
  const delInvoiceRow = (idx) => setInvoices(prev => prev.filter((_, i) => i !== idx))
  const updateInvoice = (idx, field, val) => setInvoices(prev => prev.map((inv, i) => i === idx ? {...inv, [field]: val} : inv))

  const delRow = (arr, setArr, idx) => setArr(prev => prev.filter((_, i) => i !== idx))

  return (
    <main className="content">
      <h2 className="section-heading">Residential Services Knowledge Area</h2>
      <p className="section-subtitle">Complete all required fields and expand sections to view more details</p>

      {/* ① Basic Information */}
      <Accordion id="s1" title="Basic Information" badge="Required" openIds={openSections} onToggle={toggle}>
        <div className="form-grid col-1" style={{ marginBottom: 14 }}>
          <div className="field"><label>Document Title <span className="req">*</span></label><input type="text" placeholder="e.g. DIV 993 MUNI – City of Shelbyville, KY"/></div>
        </div>
        <div className="form-grid col-4">
          <div className="field"><label>Contract Activation Date <span className="req">*</span></label><input type="date"/></div>
          <div className="field"><label>Contract Expiration Date</label><input type="date"/></div>
          <div className="field"><label>Document Review Date</label><input type="date"/></div>
          <div className="field"><label>Review Notes</label><input type="text" placeholder="e.g. Annual review scheduled"/></div>
        </div>
      </Accordion>

      {/* ② Contract Information */}
      <Accordion id="s2" title="Contract Information" openIds={openSections} onToggle={toggle}>
        <div className="form-grid col-2">
          <div className="field"><label>Contract Title</label><input type="text" placeholder="Enter contract title"/></div>
          <div className="field"><label>Contact Phone Number</label><input type="tel" placeholder="(000) 000-0000"/></div>
          <div className="field"><label>Contact Email</label><input type="email" placeholder="contact@example.com"/></div>
          <div className="field"><label>Website</label><input type="url" placeholder="https://"/></div>
        </div>
      </Accordion>

      {/* ③ Location & Servicing Division */}
      <Accordion
        id="s3" title="Location & Servicing Division"
        badge={`${locations.length} location${locations.length !== 1 ? 's' : ''}`}
        openIds={openSections} onToggle={toggle}
        headerExtra={
          <button className="add-row-btn" style={{ marginRight: 10, padding: '5px 12px', fontSize: 12 }} onClick={addLocation}>
            <PlusSvg /> Add Location
          </button>
        }
      >
        <div id="locations-container">
          {locations.map((loc, idx) => (
            <div key={idx} className="location-card">
              <div className="location-card-header">
                <div className="location-num">{idx + 1}</div>
                <span className="location-title">Location {idx + 1}</span>
                <div className="toggle-wrap">
                  <label className="toggle-switch">
                    <input type="checkbox" checked={loc.primary} onChange={e => updateLocation(idx, 'primary', e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                  <span className="toggle-label" style={{ fontSize: 12, color: '#94a3b8' }}>Primary</span>
                </div>
                <button className="btn-icon btn-icon-del" style={{ marginLeft: 8 }} onClick={() => removeLocation(idx)}>
                  <DeleteSvg />
                </button>
              </div>
              <div className="form-grid col-3">
                <div className="field"><label>City <span className="req">*</span></label><input type="text" value={loc.city} onChange={e => updateLocation(idx,'city',e.target.value)} placeholder="City name"/></div>
                <div className="field"><label>County</label><input type="text" value={loc.county} onChange={e => updateLocation(idx,'county',e.target.value)} placeholder="County name"/></div>
                <div className="field"><label>State <span className="req">*</span></label>
                  <select value={loc.state} onChange={e => updateLocation(idx,'state',e.target.value)}>
                    <option value="">— Select —</option>
                    {US_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="sub-label">Servicing Division</div>
        <div className="form-grid col-3">
          <div className="field"><label>Servicing Division City</label><input type="text" placeholder="City"/></div>
          <div className="field"><label>Servicing Division State</label><select><option value="">— Select —</option>{US_STATES.map(s => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>Account Class</label><select><option value="">— Select —</option><option>Municipal</option><option>Residential</option><option>Commercial</option><option>Industrial</option><option>HOA</option></select></div>
        </div>
      </Accordion>

      {/* ④ Service Details & Contract Numbers */}
      <Accordion id="s4" title="Service Details & Contract Numbers" badge={`${contracts.length} contract${contracts.length !== 1 ? 's' : ''}`} openIds={openSections} onToggle={toggle}>
        <div className="sub-label">Contract Entries</div>
        <div className="dyn-table-wrap">
          <table className="dyn-table">
            <thead><tr><th>Contract #</th><th>Group #</th><th>Description</th><th style={{ width: 48 }}></th></tr></thead>
            <tbody>
              {contracts.map((c, idx) => (
                <tr key={idx}>
                  <td><input className="cell-inp" value={c.num} onChange={e => updateContract(idx,'num',e.target.value)} placeholder="CNT-001"/></td>
                  <td><input className="cell-inp" value={c.group} onChange={e => updateContract(idx,'group',e.target.value)} placeholder="GRP-A"/></td>
                  <td><input className="cell-inp" value={c.desc} onChange={e => updateContract(idx,'desc',e.target.value)} placeholder="Description"/></td>
                  <td><button className="btn-icon btn-icon-del" onClick={() => delContractRow(idx)} title="Delete"><DeleteSvg /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="add-row-btn" onClick={addContractRow} style={{ marginBottom: 20 }}><PlusSvg /> Add Contract</button>
        <div className="sub-label">Service Configuration</div>
        <div className="form-grid col-3" style={{ marginBottom: 16 }}>
          <div className="field" style={{ gridColumn: 'span 3' }}>
            <label>Service Interrupt Eligible</label>
            <RadioPills name="svc-interrupt" value={svcInterrupt} onChange={setSvcInterrupt} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'},{value:'letter',label:'Letter Only'}]} />
          </div>
          <div className="field" style={{ gridColumn: 'span 3' }}>
            <label>Liable?</label>
            <RadioPills name="liable" value={liable} onChange={setLiable} options={[{value:'yes',label:'Yes',type:'yes'},{value:'no',label:'No',type:'no'}]} />
          </div>
          <div className="field"><label>Collection Start</label><input type="time" defaultValue="06:00"/></div>
          <div className="field"><label>Collection End</label><input type="time" defaultValue="14:00"/></div>
          <div className="field"><label>Time Zone</label><select><option>Eastern (ET)</option><option>Central (CT)</option><option>Mountain (MT)</option><option>Pacific (PT)</option></select></div>
        </div>
      </Accordion>

      {/* ⑤ Payment & Billing Terms */}
      <Accordion id="s5" title="Payment & Billing Terms" openIds={openSections} onToggle={toggle}>
        <div className="form-grid col-1" style={{ marginBottom: 14 }}>
          <div className="field"><label>Payment Terms</label><textarea rows={2} placeholder="Describe payment terms…"></textarea></div>
        </div>
        <div className="form-grid col-3" style={{ marginBottom: 18 }}>
          <div className="field"><label>Months in Advance</label><select><option>0</option><option>1</option><option>2</option><option>3</option><option>6</option><option>12</option></select></div>
          <div className="field"><label>Price Increase Month</label><select>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m}>{m}</option>)}</select></div>
          <div className="field"><label>Summary Routed Account #</label><input type="text" placeholder="ACC-00993"/></div>
          <div className="field"><label>Prepayment Initial ($)</label><input type="number" placeholder="0.00" min="0" step="0.01"/></div>
          <div className="field"><label>Prepayment Additional ($)</label><input type="number" placeholder="0.00" min="0" step="0.01"/></div>
        </div>
        <div className="sub-label">Invoice Groups</div>
        <div className="dyn-table-wrap">
          <table className="dyn-table">
            <thead><tr><th>Group #</th><th>Description</th><th style={{ width: 48 }}></th></tr></thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr key={idx}>
                  <td><input className="cell-inp" value={inv.group} onChange={e => updateInvoice(idx,'group',e.target.value)} placeholder="INV-GRP-1"/></td>
                  <td><input className="cell-inp" value={inv.desc} onChange={e => updateInvoice(idx,'desc',e.target.value)} placeholder="Invoice group description"/></td>
                  <td><button className="btn-icon btn-icon-del" onClick={() => delInvoiceRow(idx)}><DeleteSvg /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="add-row-btn" onClick={addInvoiceRow}><PlusSvg /> Add Invoice Group</button>
      </Accordion>

      {/* ⑥ InfoPro Codes & References */}
      <Accordion id="s6" title="InfoPro Codes & References" openIds={openSections} onToggle={toggle}>
        <div className="sub-label">Territory Code</div>
        <div className="form-grid col-2" style={{ marginBottom: 16 }}>
          <div className="field"><label>Code</label><input type="text" placeholder="TER-KY-09"/></div>
          <div className="field"><label>Description</label><input type="text" placeholder="Territory description"/></div>
        </div>
        <div className="sub-label">Acquisition Code</div>
        <div className="form-grid col-2" style={{ marginBottom: 16 }}>
          <div className="field"><label>Code</label><input type="text" placeholder="ACQ-MUN-03"/></div>
          <div className="field"><label>Description</label><input type="text" placeholder="Acquisition description"/></div>
        </div>
        <div className="form-grid col-1">
          <div className="field"><label>Former Company Cart Colors</label><input type="text" placeholder="e.g. Blue lid – recycling, Grey – solid waste"/></div>
        </div>
      </Accordion>

      {/* ⑦ Service Owner Responsibilities */}
      <Accordion id="s7" title="Service Owner Responsibilities" openIds={openSections} onToggle={toggle}>
        <div style={{ overflowX: 'auto' }}>
          <table className="owner-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Service Item</th>
                <th>Republic Services</th>
                <th>Muni / HQA</th>
              </tr>
            </thead>
            <tbody>
              {OWNER_ROWS.map(row => (
                <tr key={row}>
                  <td className="owner-label">{row}</td>
                  <td>
                    <label className={`radio-pill${ownerRadios[row] === 'republic' ? ' selected' : ''}`}>
                      <input type="radio" name={`own-${row}`} value="republic" checked={ownerRadios[row] === 'republic'} onChange={() => setOwnerRadios(p => ({...p, [row]: 'republic'}))} />
                      Republic Services
                    </label>
                  </td>
                  <td>
                    <label className={`radio-pill${ownerRadios[row] === 'muni' ? ' selected' : ''}`}>
                      <input type="radio" name={`own-${row}`} value="muni" checked={ownerRadios[row] === 'muni'} onChange={() => setOwnerRadios(p => ({...p, [row]: 'muni'}))} />
                      Muni / HQA
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      {/* ⑧ Setup, Cancellation & Process Notes */}
      <Accordion id="s8" title="Setup, Cancellation & Process Notes" openIds={openSections} onToggle={toggle}>
        <div className="form-grid col-2">
          <div className="field"><label>Setup Notes</label><textarea rows={3} placeholder="Describe the setup process…"></textarea></div>
          <div className="field"><label>Cancellation Notes</label><textarea rows={3} placeholder="Describe the cancellation process…"></textarea></div>
          <div className="field"><label>Save Rate Guidance</label><textarea rows={3} placeholder="Describe save rate eligibility…"></textarea></div>
          <div className="field"><label>Business Center Information</label><input type="text" placeholder="e.g. Louisville BC – (502) 555-0100"/></div>
        </div>
      </Accordion>

      {/* ⑨ Additional Services & Options */}
      <Accordion id="s9" title="Additional Services & Options" openIds={openSections} onToggle={toggle}>
        <div className="sub-label">Service Options</div>
        {Object.entries(options).map(([label, val]) => (
          <div key={label} className="option-row">
            <div className="option-row-left">
              <label className="toggle-switch">
                <input type="checkbox" checked={val.on} onChange={e => setOptions(p => ({...p, [label]: {...val, on: e.target.checked}}))} />
                <span className="toggle-slider" />
              </label>
              <span className="option-row-label">{label}</span>
            </div>
            <div className="option-row-desc">
              <input type="text" value={val.desc} onChange={e => setOptions(p => ({...p, [label]: {...val, desc: e.target.value}}))} placeholder="Optional description…"/>
            </div>
          </div>
        ))}
        <div className="sub-label">Notes</div>
        <div className="form-grid col-2">
          <div className="field"><label>General Notes</label><textarea rows={3} placeholder="Any additional notes…"></textarea></div>
          <div className="field"><label>Compliance & Regulatory Notes</label><textarea rows={3} placeholder="Regulatory requirements…"></textarea></div>
        </div>
      </Accordion>

      {/* Action row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingBottom: 32 }}>
        <button className="btn btn-primary" onClick={onNext}>
          Save &amp; Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    </main>
  )
}

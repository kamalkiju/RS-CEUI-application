import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useDocs, generateDocId } from '../../context/DocContext.jsx'
import { useRsaUI } from '../../context/RsaUIContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const LOB_LABELS = {
  residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial',
  municipal: 'Municipal', hoa: 'HOA / Community', special: 'Special Waste',
}
const MARKET_LABELS = {
  muni: 'Muni', open: 'Open', franchise: 'Franchise',
  exclusive: 'Exclusive', 'non-exclusive': 'Non-Exclusive',
}

const selectStyle = (hasValue) => ({
  width: '100%', padding: '11px 14px', border: '1.5px solid #dce6f0', borderRadius: 8,
  fontSize: 13.5, color: hasValue ? '#1a2b3c' : '#94a3b8', background: '#fff',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
  cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
})

const labelStyle = {
  fontSize: 13, fontWeight: 700, color: '#1a2b3c',
  display: 'flex', alignItems: 'center', gap: 4,
}

export default function CreateDocument() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addDoc } = useDocs()
  const { getPublishedAreasForCreate, publishedServiceAreasUrl } = useRsaUI()
  const publishedAreas = getPublishedAreasForCreate()

  const [lob, setLob] = useState('')
  const [market, setMarket] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [addedAreas, setAddedAreas] = useState([])
  const [docName, setDocName] = useState('')
  const [nameEdited, setNameEdited] = useState(false)

  // Auto-fill document name unless the user has manually edited it
  useEffect(() => {
    if (nameEdited) return
    const lobLabel    = LOB_LABELS[lob]    || ''
    const marketLabel = MARKET_LABELS[market] || ''
    const firstArea   = addedAreas[0]
    if (lobLabel && marketLabel && firstArea) {
      setDocName(`${lobLabel} ${marketLabel} – ${firstArea.name}`)
    } else if (lobLabel && marketLabel) {
      setDocName(`${lobLabel} ${marketLabel}`)
    } else {
      setDocName('')
    }
  }, [lob, market, addedAreas, nameEdited])

  const canAdd      = selectedArea !== ''
  const canContinue = lob && market && addedAreas.length > 0 && docName.trim()

  const addArea = () => {
    if (!selectedArea) return
    const item = publishedAreas.find(a => String(a.id) === String(selectedArea))
    if (!item) return
    if (addedAreas.find(a => a.id === item.id)) { setSelectedArea(''); return }
    setAddedAreas(prev => [...prev, { name: item.name, id: item.id, type: item.type }])
    setSelectedArea('')
  }

  const removeArea = (id) => setAddedAreas(prev => prev.filter(a => a.id !== id))

  const handleContinue = () => {
    const id          = generateDocId()
    const lobLabel    = LOB_LABELS[lob]    || lob
    const marketLabel = MARKET_LABELS[market] || market
    const firstArea   = addedAreas[0]
    const area        = firstArea.name.split(' - ').slice(1).join(', ') || firstArea.name

    const uid = user?.email ? `poc-${user.email.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}` : 'poc-user-anon'
    const doc = {
      id,
      sub: docName.trim(),
      area,
      market: marketLabel,
      lob: lobLabel,
      status: 'draft',
      tabs: ['draft', 'all'],
      areas: addedAreas,
      createdByUserId: uid,
      pocName: user?.name || 'POC User',
      pocEmail: user?.email || '—',
      pocRegion: '—',
    }

    addDoc(doc)
    navigate('/poc/editor', { state: { doc, mode: 'create' } })
  }

  return (
    <Layout>
      <div className="page-content" style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 24px', minHeight: 'calc(100vh - 56px)' }}>
        <div className="create-card" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,.10)', width: '100%', maxWidth: 580, overflow: 'hidden' }}>

          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 32px 22px', borderBottom: '1px solid #dce6f0' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#94a3b8', marginBottom: 6 }}>
                <button onClick={() => navigate('/poc')} style={{ color: '#1976d2', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12.5, fontFamily: 'inherit', padding: 0 }}>Knowledge Documents</button>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Create New</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1a2b3c' }}>Create New Document</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>Fill in the details below to get started</div>
            </div>
            <span style={{ background: '#e3f0fb', color: '#1976d2', border: '1px solid #b3d5f5', borderRadius: 20, fontSize: 11.5, fontWeight: 700, padding: '4px 12px', whiteSpace: 'nowrap' }}>Step 1 of 2</span>
          </div>

          {/* Card Body */}
          <div style={{ padding: '28px 32px 10px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Line of Business */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label style={labelStyle}>Line of Business <span style={{ color: '#e74c3c' }}>*</span></label>
              <select value={lob} onChange={e => setLob(e.target.value)} style={selectStyle(!!lob)}>
                <option value="">Select Line of Business</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="municipal">Municipal</option>
                <option value="hoa">HOA / Community</option>
                <option value="special">Special Waste</option>
              </select>
            </div>

            {/* Market Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label style={labelStyle}>Market Type <span style={{ color: '#e74c3c' }}>*</span></label>
              <select value={market} onChange={e => setMarket(e.target.value)} style={selectStyle(!!market)}>
                <option value="">Select Market Type</option>
                <option value="muni">Muni</option>
                <option value="open">Open</option>
                <option value="franchise">Franchise</option>
                <option value="exclusive">Exclusive</option>
                <option value="non-exclusive">Non-Exclusive</option>
              </select>
            </div>

            {/* Service Area / Polygon ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label style={labelStyle}>Service Area / Polygon ID <span style={{ color: '#e74c3c' }}>*</span></label>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: -2 }}>
                Only <strong>Published</strong> RSAUI service areas (same filter as{' '}
                <code style={{ fontSize: 11 }}>{publishedServiceAreasUrl}</code>).
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} style={{ ...selectStyle(selectedArea !== ''), flex: 1 }}>
                  <option value="">{publishedAreas.length ? 'Select published area…' : 'No published areas — approve RSAUI in KMT first'}</option>
                  {publishedAreas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} | {a.id} | {a.type}</option>
                  ))}
                </select>
                <button
                  onClick={addArea} disabled={!canAdd}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '10px 18px', borderRadius: 8, border: '1.5px solid #dce6f0', background: '#fff', color: '#5c7185', fontSize: 13, fontWeight: 600, cursor: canAdd ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', transition: 'all .2s', opacity: canAdd ? 1 : .45, fontFamily: 'inherit' }}
                >
                  Add
                </button>
              </div>

              {addedAreas.length > 0 && (
                <div style={{ border: '1.5px solid #dce6f0', borderRadius: 8, overflow: 'hidden', marginTop: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {addedAreas.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #dce6f0' }}>
                          <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: '#1a2b3c' }}>{a.name}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#5c7185', whiteSpace: 'nowrap' }}>{a.id}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#5c7185' }}>{a.type}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                            <button onClick={() => removeArea(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1976d2', fontSize: 13, fontWeight: 600, transition: 'color .2s', fontFamily: 'inherit', padding: '2px 0' }}
                              onMouseOver={e => e.target.style.color='#e74c3c'} onMouseOut={e => e.target.style.color='#1976d2'}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Document Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label style={labelStyle}>
                Document Name <span style={{ color: '#e74c3c' }}>*</span>
                {!nameEdited && docName && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', marginLeft: 6, fontStyle: 'italic' }}>Auto-generated</span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={docName}
                  onChange={e => { setDocName(e.target.value); setNameEdited(true) }}
                  placeholder="e.g. DIV 993 MUNI – City of Shelbyville, KY"
                  style={{
                    width: '100%', padding: '11px 40px 11px 14px',
                    border: `1.5px solid ${docName ? '#1976d2' : '#dce6f0'}`,
                    borderRadius: 8, fontSize: 13.5, color: '#1a2b3c',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    background: '#fff',
                    boxShadow: docName ? '0 0 0 3px rgba(25,118,210,.08)' : 'none',
                    transition: 'all .2s',
                  }}
                />
                {nameEdited && (
                  <button
                    title="Reset to auto-generated name"
                    onClick={() => { setNameEdited(false) }}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                This name will appear in the document list. You can edit it at any time.
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #dce6f0', margin: '8px 0 0' }} />
          </div>

          {/* Card Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px 28px', gap: 12 }}>
            <button onClick={() => navigate('/poc')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 8, background: 'none', border: '1.5px solid #dce6f0', color: '#5c7185', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Cancel
            </button>
            <button
              onClick={handleContinue} disabled={!canContinue}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 22px', borderRadius: 8, background: canContinue ? 'linear-gradient(135deg, #1976d2, #1256a3)' : '#b0c8e8', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: canContinue ? 'pointer' : 'not-allowed', boxShadow: canContinue ? '0 3px 10px rgba(25,118,210,.30)' : 'none', border: 'none', flex: 1, transition: 'all .2s', fontFamily: 'inherit' }}
            >
              Continue
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

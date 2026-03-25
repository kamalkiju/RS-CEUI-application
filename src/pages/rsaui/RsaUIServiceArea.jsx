import { useOutletContext } from 'react-router-dom'
import { useRsaUI } from '../../context/RsaUIContext.jsx'

const inp = (readOnly) => ({
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #dce6f0',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  background: readOnly ? '#f8fafc' : '#fff',
})

export default function RsaUIServiceArea() {
  const { submissionId, readOnly } = useOutletContext()
  const { getSubmission, patchSubmission } = useRsaUI()
  const sub = submissionId ? getSubmission(submissionId) : null

  if (!submissionId || !sub) {
    return <p className="rsa-ui-hint">Preparing submission…</p>
  }

  const sa = sub.serviceArea || {}
  const set = (patch) => patchSubmission(submissionId, { serviceArea: { ...sa, ...patch } })

  return (
    <div className="rsa-ui-panel">
      <h2 className="rsa-ui-panel__title">1 · Service area details</h2>
      <p className="rsa-ui-panel__sub">Geography, division, polygon identifiers, and operational contacts.</p>
      <div className="rsa-ui-fields">
        <label className="rsa-ui-field">
          <span>Service area name</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Muni – Port Orange, FL – Area 1" />
        </label>
        <label className="rsa-ui-field">
          <span>Division code</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.division} onChange={e => set({ division: e.target.value })} placeholder="D-386" />
        </label>
        <label className="rsa-ui-field">
          <span>Polygon / area ID</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.polygonId} onChange={e => set({ polygonId: e.target.value })} placeholder="1616386" />
        </label>
        <label className="rsa-ui-field">
          <span>Service type</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.serviceType} onChange={e => set({ serviceType: e.target.value })} placeholder="Resi Trash" />
        </label>
        <label className="rsa-ui-field">
          <span>Region</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.region} onChange={e => set({ region: e.target.value })} placeholder="Southeast" />
        </label>
        <label className="rsa-ui-field">
          <span>City</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.city} onChange={e => set({ city: e.target.value })} placeholder="Port Orange" />
        </label>
        <label className="rsa-ui-field">
          <span>State</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.state} onChange={e => set({ state: e.target.value })} placeholder="FL" maxLength={2} />
        </label>
        <label className="rsa-ui-field">
          <span>ZIP / postal</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.zip} onChange={e => set({ zip: e.target.value })} placeholder="32127" />
        </label>
        <label className="rsa-ui-field">
          <span>Territory code</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.territoryCode} onChange={e => set({ territoryCode: e.target.value })} placeholder="T-12" />
        </label>
        <label className="rsa-ui-field">
          <span>Market segment</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.marketSegment} onChange={e => set({ marketSegment: e.target.value })} placeholder="Municipal" />
        </label>
        <label className="rsa-ui-field">
          <span>Effective date</span>
          <input readOnly={readOnly} type="date" style={inp(readOnly)} value={sa.effectiveDate} onChange={e => set({ effectiveDate: e.target.value })} />
        </label>
        <label className="rsa-ui-field rsa-ui-field--full">
          <span>Boundary notes</span>
          <textarea readOnly={readOnly} style={{ ...inp(readOnly), minHeight: 72, resize: 'vertical' }} value={sa.boundaryNotes} onChange={e => set({ boundaryNotes: e.target.value })} placeholder="Edges, overlaps, exceptions…" />
        </label>
        <label className="rsa-ui-field">
          <span>Contact name</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.contactName} onChange={e => set({ contactName: e.target.value })} placeholder="Ops manager" />
        </label>
        <label className="rsa-ui-field">
          <span>Contact phone</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={sa.contactPhone} onChange={e => set({ contactPhone: e.target.value })} placeholder="(555) 000-0000" />
        </label>
        <label className="rsa-ui-field">
          <span>Contact email</span>
          <input readOnly={readOnly} type="email" style={inp(readOnly)} value={sa.contactEmail} onChange={e => set({ contactEmail: e.target.value })} placeholder="ops@example.com" />
        </label>
        <label className="rsa-ui-field rsa-ui-field--full">
          <span>Notes</span>
          <textarea readOnly={readOnly} style={{ ...inp(readOnly), minHeight: 88, resize: 'vertical' }} value={sa.notes} onChange={e => set({ notes: e.target.value })} placeholder="Operational notes for approvers…" />
        </label>
      </div>
    </div>
  )
}

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

export default function RsaUIProducts() {
  const { submissionId, readOnly } = useOutletContext()
  const { getSubmission, patchSubmission } = useRsaUI()
  const sub = submissionId ? getSubmission(submissionId) : null

  if (!submissionId || !sub) {
    return <p className="rsa-ui-hint">Preparing submission…</p>
  }

  const pr = sub.product || {}
  const set = (patch) => patchSubmission(submissionId, { product: { ...pr, ...patch } })

  return (
    <div className="rsa-ui-panel">
      <h2 className="rsa-ui-panel__title">3 · Product</h2>
      <p className="rsa-ui-panel__sub">Offering, SKU, compliance, and lifecycle tied to the service area.</p>
      <div className="rsa-ui-fields">
        <label className="rsa-ui-field">
          <span>Product name</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.name} onChange={e => set({ name: e.target.value })} placeholder="Residential cart 95 gal" />
        </label>
        <label className="rsa-ui-field">
          <span>SKU / code</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.sku} onChange={e => set({ sku: e.target.value })} placeholder="CRT-95-G" />
        </label>
        <label className="rsa-ui-field">
          <span>Alternate SKU</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.alternateSku} onChange={e => set({ alternateSku: e.target.value })} placeholder="Legacy code" />
        </label>
        <label className="rsa-ui-field">
          <span>Category</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.category} onChange={e => set({ category: e.target.value })} placeholder="Residential solid waste" />
        </label>
        <label className="rsa-ui-field">
          <span>Container size</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.containerSize} onChange={e => set({ containerSize: e.target.value })} placeholder="95 gal" />
        </label>
        <label className="rsa-ui-field">
          <span>Material</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.material} onChange={e => set({ material: e.target.value })} placeholder="Plastic / metal" />
        </label>
        <label className="rsa-ui-field">
          <span>Weight limit</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.weightLimit} onChange={e => set({ weightLimit: e.target.value })} placeholder="lbs / policy" />
        </label>
        <label className="rsa-ui-field">
          <span>Commodity code</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.commodityCode} onChange={e => set({ commodityCode: e.target.value })} placeholder="NAICS / internal" />
        </label>
        <label className="rsa-ui-field">
          <span>Active from</span>
          <input readOnly={readOnly} type="date" style={inp(readOnly)} value={pr.activeFrom} onChange={e => set({ activeFrom: e.target.value })} />
        </label>
        <label className="rsa-ui-field">
          <span>End of life (optional)</span>
          <input readOnly={readOnly} type="date" style={inp(readOnly)} value={pr.endOfLife} onChange={e => set({ endOfLife: e.target.value })} />
        </label>
        <label className="rsa-ui-field rsa-ui-field--full">
          <span>Compliance notes</span>
          <textarea readOnly={readOnly} style={{ ...inp(readOnly), minHeight: 72, resize: 'vertical' }} value={pr.complianceNotes} onChange={e => set({ complianceNotes: e.target.value })} placeholder="Regulatory, landfill, recycling rules…" />
        </label>
        <label className="rsa-ui-field rsa-ui-field--full">
          <span>Description</span>
          <textarea readOnly={readOnly} style={{ ...inp(readOnly), minHeight: 88, resize: 'vertical' }} value={pr.description} onChange={e => set({ description: e.target.value })} placeholder="Customer-facing description…" />
        </label>
      </div>
    </div>
  )
}

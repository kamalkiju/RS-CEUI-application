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

export default function RsaUIPricing() {
  const { submissionId, readOnly } = useOutletContext()
  const { getSubmission, patchSubmission } = useRsaUI()
  const sub = submissionId ? getSubmission(submissionId) : null

  if (!submissionId || !sub) {
    return <p className="rsa-ui-hint">Preparing submission…</p>
  }

  const pr = sub.pricing || {}
  const set = (patch) => patchSubmission(submissionId, { pricing: { ...pr, ...patch } })

  return (
    <div className="rsa-ui-panel">
      <h2 className="rsa-ui-panel__title">2 · Pricing</h2>
      <p className="rsa-ui-panel__sub">Rate model, fees, and benchmark references for this service area.</p>
      <div className="rsa-ui-fields">
        <label className="rsa-ui-field">
          <span>Pricing model</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.model} onChange={e => set({ model: e.target.value })} placeholder="Per cart / per ton / flat" />
        </label>
        <label className="rsa-ui-field">
          <span>Base rate</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.baseRate} onChange={e => set({ baseRate: e.target.value })} placeholder="0.00" />
        </label>
        <label className="rsa-ui-field">
          <span>Billing cycle</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.billingCycle} onChange={e => set({ billingCycle: e.target.value })} placeholder="Monthly / quarterly" />
        </label>
        <label className="rsa-ui-field">
          <span>Tax exempt (Y/N)</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.taxExempt} onChange={e => set({ taxExempt: e.target.value })} placeholder="N" />
        </label>
        <label className="rsa-ui-field">
          <span>Minimum charge</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.minimumCharge} onChange={e => set({ minimumCharge: e.target.value })} placeholder="0.00" />
        </label>
        <label className="rsa-ui-field">
          <span>Fuel surcharge %</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.fuelSurchargePct} onChange={e => set({ fuelSurchargePct: e.target.value })} placeholder="0" />
        </label>
        <label className="rsa-ui-field">
          <span>Administrative fee</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.adminFee} onChange={e => set({ adminFee: e.target.value })} placeholder="0.00" />
        </label>
        <label className="rsa-ui-field">
          <span>Discount %</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.discountPct} onChange={e => set({ discountPct: e.target.value })} placeholder="0" />
        </label>
        <label className="rsa-ui-field">
          <span>Price list reference</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.priceListRef} onChange={e => set({ priceListRef: e.target.value })} placeholder="PL-2026-Q1" />
        </label>
        <label className="rsa-ui-field">
          <span>Competitor benchmark</span>
          <input readOnly={readOnly} style={inp(readOnly)} value={pr.competitorBenchmark} onChange={e => set({ competitorBenchmark: e.target.value })} placeholder="Optional" />
        </label>
        <label className="rsa-ui-field rsa-ui-field--full">
          <span>Surcharges & fees</span>
          <textarea readOnly={readOnly} style={{ ...inp(readOnly), minHeight: 72, resize: 'vertical' }} value={pr.surcharges} onChange={e => set({ surcharges: e.target.value })} placeholder="ERF, FRF, administrative…" />
        </label>
        <label className="rsa-ui-field rsa-ui-field--full">
          <span>Rate notes</span>
          <textarea readOnly={readOnly} style={{ ...inp(readOnly), minHeight: 72, resize: 'vertical' }} value={pr.rateNotes} onChange={e => set({ rateNotes: e.target.value })} placeholder="Assumptions, escalators, exceptions…" />
        </label>
      </div>
    </div>
  )
}

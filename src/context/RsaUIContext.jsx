import { createContext, useContext, useState, useCallback } from 'react'
import { simulatePostRsaUI } from '../api/rsaUI.js'
import { getPublishedServiceAreasUrl } from '../api/serviceAreas.js'

export const RSA_STATUS = {
  Draft: 'Draft',
  Pending_BUFM: 'Pending_BUFM',
  Rejected_BUFM: 'Rejected_BUFM',
  Pending_KMT: 'Pending_KMT',
  Rejected_KMT: 'Rejected_KMT',
  Published: 'Published',
}

const TODAY = () => new Date().toISOString().slice(0, 10)

let rsaCounter = 6001
function nextRsaId() {
  return `RSA-${rsaCounter++}`
}

/** Valid transitions per spec */
export function rsaNextStatuses(from) {
  switch (from) {
    case RSA_STATUS.Draft:
      return [RSA_STATUS.Pending_BUFM]
    case RSA_STATUS.Pending_BUFM:
      return [RSA_STATUS.Rejected_BUFM, RSA_STATUS.Pending_KMT]
    case RSA_STATUS.Pending_KMT:
      return [RSA_STATUS.Rejected_KMT, RSA_STATUS.Published]
    default:
      return []
  }
}

function buildPublishedAreaFromSubmission(sub) {
  const poly = sub.serviceArea?.polygonId || sub.id
  const name = sub.serviceArea?.name || `RSAUI Service Area ${sub.id}`
  return {
    name,
    id: String(poly),
    type: sub.serviceArea?.serviceType || 'Approved Service Area',
    rsaSubmissionId: sub.id,
    approved: true,
    source: 'RSAUI',
  }
}

const INITIAL_PUBLISHED = [
  { name: 'Published RSAUI – Demo Metro North', id: '1699001', type: 'Resi Trash', rsaSubmissionId: 'RSA-SEED-1', approved: true, source: 'RSAUI' },
]

const INITIAL_SUBMISSIONS = [
  {
    id: 'RSA-5999',
    status: RSA_STATUS.Pending_BUFM,
    pocName: 'Alex Morgan',
    serviceArea: { name: 'Muni – Gainesville pilot', division: 'D-412', polygonId: '1616999', serviceType: 'Resi Trash', notes: 'Awaiting BUFM' },
    pricing: { model: 'Per cart', baseRate: '22.50', surcharges: 'ERF' },
    product: { name: 'Cart 95 gal', sku: 'CRT-95', description: 'Standard' },
    rejection_comment_BUFM: '',
    rejection_comment_KMT: '',
    updated: TODAY(),
  },
  {
    id: 'RSA-5998',
    status: RSA_STATUS.Pending_KMT,
    pocName: 'Sam Rivera',
    serviceArea: { name: 'Open Market – Lake pilot', division: 'D-301', polygonId: '1616998', serviceType: 'Resi Recycling', notes: 'BUFM approved' },
    pricing: { model: 'Per service', baseRate: '19.00', surcharges: 'ERF + FRF' },
    product: { name: 'Recycling cart', sku: 'RCT-65', description: 'Single-stream' },
    rejection_comment_BUFM: '',
    rejection_comment_KMT: '',
    updated: TODAY(),
  },
  {
    id: 'RSA-6000',
    status: RSA_STATUS.Rejected_BUFM,
    pocName: 'Jordan Lee',
    serviceArea: { name: 'Legacy Polygon 12', division: 'D-220', polygonId: '1616222', serviceType: 'Resi Trash', notes: 'POC sample' },
    pricing: { model: 'Per cart', baseRate: '24.00', surcharges: 'ERF + FRF' },
    product: { name: 'Residential Cart 95', sku: 'CRT-95-G', description: 'Standard rollout' },
    rejection_comment_BUFM: 'Division code must match active municipal contract table.',
    rejection_comment_KMT: '',
    updated: TODAY(),
  },
  {
    id: 'RSA-5995',
    status: RSA_STATUS.Published,
    pocName: 'Chris Park',
    serviceArea: { name: 'North District rollout', division: 'D-100', polygonId: '1616995', serviceType: 'Resi Trash', notes: 'Live' },
    pricing: { model: 'Per cart', baseRate: '21.00', surcharges: 'ERF' },
    product: { name: 'Cart 95 gal', sku: 'CRT-95', description: 'Standard' },
    rejection_comment_BUFM: '',
    rejection_comment_KMT: '',
    updated: TODAY(),
  },
  {
    id: 'RSA-5994',
    status: RSA_STATUS.Rejected_KMT,
    pocName: 'Jordan Lee',
    serviceArea: { name: 'South pilot zone', division: 'D-200', polygonId: '1616994', serviceType: 'Resi Recycling', notes: 'KMT reject sample' },
    pricing: { model: 'Per service', baseRate: '18.50', surcharges: '' },
    product: { name: 'Recycling cart', sku: 'RCT-65', description: 'Single-stream' },
    rejection_comment_BUFM: '',
    rejection_comment_KMT: 'Pricing matrix not aligned with regional fee schedule.',
    updated: TODAY(),
  },
  {
    id: 'RSA-5992',
    status: RSA_STATUS.Pending_KMT,
    pocName: 'Jordan Lee',
    serviceArea: { name: 'West corridor pilot', division: 'D-400', polygonId: '1616992', serviceType: 'Resi Trash', notes: 'Pending KMT' },
    pricing: { model: 'Per cart', baseRate: '23.00', surcharges: 'ERF' },
    product: { name: 'Cart 95 gal', sku: 'CRT-95', description: 'Standard' },
    rejection_comment_BUFM: '',
    rejection_comment_KMT: '',
    updated: TODAY(),
  },
  {
    id: 'RSA-5991',
    status: RSA_STATUS.Published,
    pocName: 'Sam Rivera',
    serviceArea: { name: 'East metro expansion', division: 'D-500', polygonId: '1616991', serviceType: 'Resi Recycling', notes: 'Live' },
    pricing: { model: 'Per service', baseRate: '20.50', surcharges: 'ERF' },
    product: { name: 'Recycling cart', sku: 'RCT-65', description: 'Single-stream' },
    rejection_comment_BUFM: '',
    rejection_comment_KMT: '',
    updated: TODAY(),
  },
  {
    id: 'RSA-5990',
    status: RSA_STATUS.Rejected_KMT,
    pocName: 'Alex Morgan',
    serviceArea: { name: 'South trial area', division: 'D-600', polygonId: '1616990', serviceType: 'Resi Trash', notes: 'Rejected' },
    pricing: { model: 'Per cart', baseRate: '25.00', surcharges: '' },
    product: { name: 'Cart 95 gal', sku: 'CRT-95', description: 'Standard' },
    rejection_comment_BUFM: '',
    rejection_comment_KMT: 'Service matrix incomplete.',
    updated: TODAY(),
  },
  ...Array.from({ length: 10 }, (_, i) => {
    const cycle = [RSA_STATUS.Pending_KMT, RSA_STATUS.Published, RSA_STATUS.Rejected_KMT, RSA_STATUS.Rejected_BUFM]
    const st = cycle[i % 4]
    return {
      id: `RSA-${5980 + i}`,
      status: st,
      pocName: i % 3 === 0 ? 'Alex Morgan' : i % 3 === 1 ? 'Sam Rivera' : 'Jordan Lee',
      serviceArea: {
        name: `RSAUI Demo Area ${i + 1}`,
        division: `D-${500 + i}`,
        polygonId: String(1617100 + i),
        serviceType: i % 2 === 0 ? 'Resi Trash' : 'Resi Recycling',
        notes: 'KMT reports seed',
      },
      pricing: { model: 'Per cart', baseRate: '22.00', surcharges: 'ERF' },
      product: { name: 'Cart 95 gal', sku: 'CRT-95', description: 'Standard' },
      rejection_comment_BUFM: st === RSA_STATUS.Rejected_BUFM ? 'Division code mismatch.' : '',
      rejection_comment_KMT: st === RSA_STATUS.Rejected_KMT ? 'Pricing not aligned with matrix.' : '',
      updated: TODAY(),
    }
  }),
]

const RsaUIContext = createContext(null)

export function RsaUIProvider({ children }) {
  const [submissions, setSubmissions] = useState(INITIAL_SUBMISSIONS)
  const [publishedServiceAreas, setPublishedServiceAreas] = useState(INITIAL_PUBLISHED)

  const upsertSubmission = useCallback((partial) => {
    setSubmissions(prev => {
      const idx = prev.findIndex(s => s.id === partial.id)
      if (idx === -1) return [{ ...partial, updated: TODAY() }, ...prev]
      const next = [...prev]
      next[idx] = { ...next[idx], ...partial, updated: TODAY() }
      return next
    })
  }, [])

  const emptyServiceArea = () => ({
    name: '',
    division: '',
    polygonId: '',
    serviceType: '',
    notes: '',
    region: '',
    city: '',
    state: '',
    zip: '',
    territoryCode: '',
    marketSegment: '',
    effectiveDate: '',
    boundaryNotes: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  })

  const emptyPricing = () => ({
    model: '',
    baseRate: '',
    surcharges: '',
    billingCycle: '',
    taxExempt: '',
    minimumCharge: '',
    fuelSurchargePct: '',
    adminFee: '',
    discountPct: '',
    rateNotes: '',
    priceListRef: '',
    competitorBenchmark: '',
  })

  const emptyProduct = () => ({
    name: '',
    sku: '',
    description: '',
    category: '',
    containerSize: '',
    material: '',
    weightLimit: '',
    commodityCode: '',
    activeFrom: '',
    endOfLife: '',
    complianceNotes: '',
    alternateSku: '',
  })

  const createDraft = useCallback(() => {
    const id = nextRsaId()
    const row = {
      id,
      status: RSA_STATUS.Draft,
      serviceArea: emptyServiceArea(),
      pricing: emptyPricing(),
      product: emptyProduct(),
      rejection_comment_BUFM: '',
      rejection_comment_KMT: '',
      updated: TODAY(),
    }
    setSubmissions(prev => [row, ...prev])
    return id
  }, [])

  const cloneSubmission = useCallback((id) => {
    const src = submissions.find(s => s.id === id)
    if (!src) return null
    const newId = nextRsaId()
    const copy = {
      ...src,
      id: newId,
      status: RSA_STATUS.Draft,
      rejection_comment_BUFM: '',
      rejection_comment_KMT: '',
      serviceArea: { ...emptyServiceArea(), ...src.serviceArea },
      pricing: { ...emptyPricing(), ...src.pricing },
      product: { ...emptyProduct(), ...src.product },
      updated: TODAY(),
    }
    setSubmissions(prev => [copy, ...prev])
    return newId
  }, [submissions])

  const saveDraft = useCallback(async (id, data) => {
    const payload = { id, status: RSA_STATUS.Draft, ...data }
    await simulatePostRsaUI(payload)
    upsertSubmission({ id, status: RSA_STATUS.Draft, ...data })
  }, [upsertSubmission])

  /** Draft or rejected (POC re-edit) → Pending_BUFM */
  const submitToBufm = useCallback(async (id, data) => {
    const payload = { id, status: RSA_STATUS.Pending_BUFM, ...data }
    await simulatePostRsaUI(payload)
    setSubmissions(prev =>
      prev.map(s => {
        if (s.id !== id) return s
        const next = { ...s, ...data, status: RSA_STATUS.Pending_BUFM, updated: TODAY() }
        if (s.status === RSA_STATUS.Rejected_BUFM) next.rejection_comment_BUFM = ''
        return next
      })
    )
  }, [])

  const approveBUFM = useCallback((id) => {
    setSubmissions(prev => {
      const sub = prev.find(s => s.id === id)
      if (!sub || sub.status !== RSA_STATUS.Pending_BUFM) return prev
      return prev.map(s => s.id === id ? { ...s, status: RSA_STATUS.Pending_KMT, updated: TODAY() } : s)
    })
  }, [])

  const rejectBUFM = useCallback((id, rejection_comment_BUFM) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.id === id && s.status === RSA_STATUS.Pending_BUFM
          ? { ...s, status: RSA_STATUS.Rejected_BUFM, rejection_comment_BUFM, updated: TODAY() }
          : s
      )
    )
  }, [])

  const approveKMT = useCallback((id) => {
    let published = null
    setSubmissions(prev => {
      const sub = prev.find(s => s.id === id)
      if (!sub || sub.status !== RSA_STATUS.Pending_KMT) return prev
      published = buildPublishedAreaFromSubmission(sub)
      return prev.map(s =>
        s.id === id ? { ...s, status: RSA_STATUS.Published, updated: TODAY() } : s
      )
    })
    if (published) {
      setPublishedServiceAreas(areas => {
        if (areas.some(a => a.rsaSubmissionId === id)) return areas
        return [published, ...areas]
      })
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.info('[Knowledge Document Create API] pushed approved service area', published)
      }
    }
  }, [])

  const rejectKMT = useCallback((id, rejection_comment_KMT) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.id === id && s.status === RSA_STATUS.Pending_KMT
          ? { ...s, status: RSA_STATUS.Rejected_KMT, rejection_comment_KMT, updated: TODAY() }
          : s
      )
    )
  }, [])

  const getSubmission = useCallback((id) => submissions.find(s => s.id === id), [submissions])

  const patchSubmission = useCallback((id, patch) => {
    setSubmissions(prev =>
      prev.map(s => {
        if (s.id !== id) return s
        return {
          ...s,
          ...patch,
          serviceArea: patch.serviceArea ? { ...s.serviceArea, ...patch.serviceArea } : s.serviceArea,
          pricing: patch.pricing ? { ...s.pricing, ...patch.pricing } : s.pricing,
          product: patch.product ? { ...s.product, ...patch.product } : s.product,
          updated: TODAY(),
        }
      })
    )
  }, [])

  const getPendingForBUFM = useCallback(() =>
    submissions.filter(s => s.status === RSA_STATUS.Pending_BUFM), [submissions])

  const getPendingForKMT = useCallback(() =>
    submissions.filter(s => s.status === RSA_STATUS.Pending_KMT), [submissions])

  const getPublishedAreasForCreate = useCallback(() => publishedServiceAreas, [publishedServiceAreas])

  const removeSubmission = useCallback((id) => {
    setSubmissions(prev => prev.filter(s => s.id !== id))
  }, [])

  const value = {
    submissions,
    publishedServiceAreas,
    RSA_STATUS,
    createDraft,
    saveDraft,
    submitToBufm,
    approveBUFM,
    rejectBUFM,
    approveKMT,
    rejectKMT,
    upsertSubmission,
    getSubmission,
    patchSubmission,
    getPendingForBUFM,
    getPendingForKMT,
    getPublishedAreasForCreate,
    removeSubmission,
    cloneSubmission,
    publishedServiceAreasUrl: getPublishedServiceAreasUrl(),
  }

  return <RsaUIContext.Provider value={value}>{children}</RsaUIContext.Provider>
}

export function useRsaUI() {
  const ctx = useContext(RsaUIContext)
  if (!ctx) throw new Error('useRsaUI must be used within RsaUIProvider')
  return ctx
}

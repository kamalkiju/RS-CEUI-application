import { createContext, useContext, useState, useCallback } from 'react'
import { simulatePostRsaUI } from '../api/rsaUI.js'
import { getPublishedServiceAreasUrl } from '../api/serviceAreas.js'
import { normalizeRejectPayload } from '../utils/reviewFeedback.js'

export const RSA_STATUS = {
  Draft: 'Draft',
  Pending_BUFM: 'Pending_BUFM',
  Rejected_BUFM: 'Rejected_BUFM',
  Pending_KMT: 'Pending_KMT',
  Rejected_KMT: 'Rejected_KMT',
  Published: 'Published',
}

const TODAY = () => new Date().toISOString().slice(0, 10)

/** Demo data: 3 primary + 3 additional offerings per Solid Waste / Recycle / Yard Waste. */
function demoProductTabs(seedId) {
  const active = TODAY()
  const exp = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
  const mkPrimary = (catKey, i) => {
    const names = {
      solidWaste: ['95 Ga Cart Solid Waste Service', '65 Gal Cart Solid Waste', 'Bulk Pickup Solid'],
      recycle: ['65 Gal Recycle Cart', 'Office Recycle Bin', 'Glass Recycle Addon'],
      yardWaste: ['96 Gal Yard Waste Tote', 'Paper Yard Bag Service', 'Seasonal Yard Clean-up'],
    }
    return {
      id: `${seedId}-${catKey}-p${i}`,
      name: names[catKey][i - 1],
      choice: `C${i}`,
      isPrimary: i === 1,
      quantity: 1,
      status: 'P',
      activeDate: active,
      expiryDate: exp,
      serviceTypes: ['Residential'],
      frequencies: ['Weekly'],
      channels: ['Curbside'],
      changeType: 'new',
    }
  }
  const mkAdd = (catKey, i) => ({
    id: `${seedId}-${catKey}-a${i}`,
    name: `${catKey === 'solidWaste' ? 'Solid' : catKey === 'recycle' ? 'Recycle' : 'Yard'} add-on ${i} — extra pickup`,
    choice: '—',
    isPrimary: false,
    quantity: i,
    status: 'P',
    activeDate: active,
    expiryDate: exp,
    serviceTypes: ['Residential'],
    frequencies: ['On-call'],
    channels: ['Curbside'],
    changeType: 'new',
  })
  const block = (label, key, mandatory) => ({
    id: key,
    label,
    mandatory,
    primaryOfferings: [1, 2, 3].map(i => mkPrimary(key, i)),
    additionalOfferings: [1, 2, 3].map(i => mkAdd(key, i)),
  })
  return {
    solidWaste: block('Solid Waste', 'solidWaste', true),
    recycle: block('Recycle', 'recycle', false),
    yardWaste: block('Yard Waste', 'yardWaste', true),
  }
}

function withDemoProductTabsIfEmpty(sub) {
  const pt = sub.productTabs
  if (pt && typeof pt === 'object') {
    const has = Object.values(pt).some(
      t =>
        t &&
        ((t.primaryOfferings || []).length > 0 || (t.additionalOfferings || []).length > 0),
    )
    if (has) return sub
  }
  return { ...sub, productTabs: demoProductTabs(sub.id) }
}

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

const DRAFT_SEED_ROWS = Array.from({ length: 10 }, (_, i) => ({
  id: `RSA-${5601 + i}`,
  status: RSA_STATUS.Draft,
  pocName: 'John Doe',
  serviceArea: {
    name: `Draft Service Area ${i + 1}`,
    division: `Division ${String.fromCharCode(65 + (i % 5))}`,
    polygonId: `POL-${5601 + i}`,
    serviceType: i % 2 === 0 ? 'Resi Trash' : 'Resi Recycling',
    notes: '',
  },
  pricing: { model: 'Per cart', baseRate: '22.00', surcharges: 'ERF' },
  product: { name: 'Cart 95 gal', sku: 'CRT-95', description: 'Standard' },
  requestMeta: {
    requestorName: 'John Doe',
    requestorEmail: 'john.doe@republicservices.com',
    onBehalfOf: '',
    reasonForRequest: 'New Service Area',
    comments: i % 4 === 0 ? 'POC sample notes' : '',
    approvalComments: '',
    assignedBUFM: 'Jane Wilson',
  },
  requestType: 'Create Service Area',
  version: 'v1.0',
  progress: [0, 30, 55, 25][i % 4],
  bufmUnclaimed: false,
  assignedBufmReviewer: 'Jane Wilson',
  bufmPriority: 'Medium',
  bufmDueAt: TODAY(),
  bufmSlaHoursRemaining: 14,
  bufmSlaExceeded: false,
  kmtEscalationLevel: 0,
  kmtEscalationReason: '',
  offeringExpiryLabel: '',
  rejection_comment_BUFM: '',
  rejection_comment_KMT: '',
  updated: TODAY(),
}))

/** KMT RSAUI document review — review queue (Pending KMT / publish). */
const KMT_QUEUE_SEED_ROWS = Array.from({ length: 10 }, (_, i) => ({
  id: `RSA-${5520 + i}`,
  status: RSA_STATUS.Pending_KMT,
  pocName: i % 3 === 0 ? 'Alex Morgan' : i % 3 === 1 ? 'Sam Rivera' : 'Jordan Lee',
  serviceArea: {
    name: `KMT publish queue — pilot ${i + 1}`,
    division: `D-KMT-${310 + i}`,
    polygonId: String(1620500 + i),
    serviceType: i % 2 === 0 ? 'Resi Trash' : 'Resi Recycling',
    notes: 'Awaiting KMT publish',
  },
  pricing: { model: 'Per cart', baseRate: String(20.5 + i * 0.25), surcharges: 'ERF' },
  product: { name: 'Cart 95 gal', sku: 'CRT-95', description: 'Standard' },
  requestType: 'Create Service Area',
  version: 'v1.0',
  bufmUnclaimed: false,
  assignedBufmReviewer: 'Jane Wilson',
  bufmPriority: i % 4 === 0 ? 'High' : 'Medium',
  bufmDueAt: TODAY(),
  bufmSlaHoursRemaining: 8,
  bufmSlaExceeded: false,
  kmtEscalationLevel: 0,
  kmtEscalationReason: '',
  offeringExpiryLabel: '',
  rejection_comment_BUFM: '',
  rejection_comment_KMT: '',
  updated: TODAY(),
}))

const INITIAL_SUBMISSIONS = [
  ...DRAFT_SEED_ROWS,
  ...KMT_QUEUE_SEED_ROWS,
  {
    id: 'RSA-5988',
    status: RSA_STATUS.Pending_BUFM,
    bufmUnclaimed: true,
    assignedBufmReviewer: '',
    pocName: 'Pat Kim',
    serviceArea: { name: 'Greenfield Estate', division: 'Division B', polygonId: 'POL-1880', serviceType: 'Residential', notes: 'Released to pool' },
    pricing: { model: 'Per cart', baseRate: '22.00', surcharges: 'ERF' },
    product: { name: 'Cart 95 gal', sku: 'CRT-95', description: 'Standard' },
    rejection_comment_BUFM: '',
    rejection_comment_KMT: '',
    updated: TODAY(),
  },
  {
    id: 'RSA-5999',
    status: RSA_STATUS.Pending_BUFM,
    bufmUnclaimed: false,
    assignedBufmReviewer: 'Jane Wilson',
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
    rejection_highlight_sections: ['Service area details'],
    rejection_highlight_fields: ['Division', 'Polygon ID'],
    rejection_feedback_items: [
      {
        id: 'fb-rsa-6000-1',
        scope: 'section',
        label: 'Service area details',
        comment: 'Division must match the active contract row in the municipal table.',
      },
      {
        id: 'fb-rsa-6000-2',
        scope: 'field',
        label: 'Polygon ID',
        comment: 'Cross-check polygon against GIS export for Division D-220.',
      },
    ],
    reviewAuditTrail: [
      {
        at: new Date().toISOString(),
        role: 'BUFM',
        action: 'reject',
        comment: 'Division code must match active municipal contract table.',
        feedbackItems: [
          {
            id: 'fb-rsa-6000-1',
            scope: 'section',
            label: 'Service area details',
            comment: 'Division must match the active contract row in the municipal table.',
          },
          {
            id: 'fb-rsa-6000-2',
            scope: 'field',
            label: 'Polygon ID',
            comment: 'Cross-check polygon against GIS export for Division D-220.',
          },
        ],
        highlightSections: ['Service area details'],
        highlightFields: ['Division', 'Polygon ID'],
      },
    ],
    updated: TODAY(),
  },
  {
    id: 'RSA-5995',
    status: RSA_STATUS.Published,
    pocName: 'Chris Park',
    offeringExpiryLabel: '96G Rollcart — Residential',
    serviceArea: {
      name: 'North Old Zone',
      division: 'Division A',
      polygonId: 'POL-9001',
      serviceType: 'Residential',
      notes: 'Live',
      expiryDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    },
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
].map(withDemoProductTabsIfEmpty)

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
    lawsonId: '',
    type: '',
    status: '',
    expiryDate: '',
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

  const emptyProductTabs = () => ({
    solidWaste: {
      id: 'solidWaste',
      label: 'Solid Waste',
      mandatory: true,
      primaryOfferings: [],
      additionalOfferings: [],
    },
    recycle: {
      id: 'recycle',
      label: 'Recycle',
      mandatory: false,
      primaryOfferings: [],
      additionalOfferings: [],
    },
    yardWaste: {
      id: 'yardWaste',
      label: 'Yard Waste',
      mandatory: true,
      primaryOfferings: [],
      additionalOfferings: [],
    },
  })

  const emptyRequestMeta = () => ({
    requestorName: '',
    requestorEmail: '',
    onBehalfOf: '',
    reasonForRequest: '',
    comments: '',
    approvalComments: '',
    assignedBUFM: '',
  })

  const mergeProductTabs = (prev, patch) => {
    if (!patch) return prev
    const defaults = emptyProductTabs()
    const base = { ...defaults, ...(prev && typeof prev === 'object' ? prev : {}) }
    for (const key of Object.keys(patch)) {
      const p = patch[key]
      const existing = base[key] || { label: key, mandatory: false, primaryOfferings: [], additionalOfferings: [] }
      base[key] = {
        ...existing,
        ...p,
        primaryOfferings: p.primaryOfferings !== undefined ? p.primaryOfferings : existing.primaryOfferings,
        additionalOfferings: p.additionalOfferings !== undefined ? p.additionalOfferings : existing.additionalOfferings,
      }
    }
    return base
  }

  const createDraft = useCallback(() => {
    const id = nextRsaId()
    const row = {
      id,
      status: RSA_STATUS.Draft,
      serviceArea: emptyServiceArea(),
      pricing: emptyPricing(),
      product: emptyProduct(),
      productTabs: emptyProductTabs(),
      requestMeta: emptyRequestMeta(),
      progress: 0,
      version: 'v1.0',
      requestType: 'Create Service Area',
      bufmUnclaimed: false,
      assignedBufmReviewer: 'Jane Wilson',
      bufmPriority: 'Medium',
      bufmDueAt: TODAY(),
      bufmSlaHoursRemaining: 14,
      bufmSlaExceeded: false,
      kmtEscalationLevel: 0,
      kmtEscalationReason: '',
      offeringExpiryLabel: '',
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
      productTabs: src.productTabs ? mergeProductTabs(emptyProductTabs(), src.productTabs) : emptyProductTabs(),
      requestMeta: { ...emptyRequestMeta(), ...(src.requestMeta || {}) },
      bufmUnclaimed: false,
      kmtEscalationLevel: 0,
      kmtEscalationReason: '',
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
        if (s.status === RSA_STATUS.Rejected_BUFM) {
          next.rejection_comment_BUFM = ''
          delete next.rejection_feedback_items
          delete next.rejection_highlight_sections
          delete next.rejection_highlight_fields
          const trail = s.reviewAuditTrail || []
          const note = typeof data?.pocResubmissionNote === 'string' ? data.pocResubmissionNote.trim() : ''
          next.reviewAuditTrail = [
            ...trail,
            {
              at: new Date().toISOString(),
              role: 'POC',
              action: 'resubmit',
              comment: note,
            },
          ]
          if (note) next.pocResubmissionNote = note
          else delete next.pocResubmissionNote
        }
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

  const rejectBUFM = useCallback((id, payload) => {
    const p = normalizeRejectPayload(payload, 'BUFM')
    setSubmissions(prev =>
      prev.map(s => {
        if (s.id !== id || s.status !== RSA_STATUS.Pending_BUFM) return s
        const trail = s.reviewAuditTrail || []
        return {
          ...s,
          status: RSA_STATUS.Rejected_BUFM,
          rejection_comment_BUFM: p.comment,
          rejection_feedback_items: p.feedbackItems,
          rejection_highlight_sections: p.highlightSections,
          rejection_highlight_fields: p.highlightFields,
          reviewAuditTrail: [
            ...trail,
            {
              at: new Date().toISOString(),
              role: 'BUFM',
              action: 'reject',
              comment: p.comment,
              feedbackItems: p.feedbackItems,
              highlightSections: p.highlightSections,
              highlightFields: p.highlightFields,
            },
          ],
          updated: TODAY(),
        }
      })
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

  const rejectKMT = useCallback((id, payload) => {
    const p = normalizeRejectPayload(payload, 'KMT')
    setSubmissions(prev =>
      prev.map(s => {
        if (s.id !== id || s.status !== RSA_STATUS.Pending_KMT) return s
        const trail = s.reviewAuditTrail || []
        return {
          ...s,
          status: RSA_STATUS.Rejected_KMT,
          rejection_comment_KMT: p.comment,
          rejection_feedback_items: p.feedbackItems,
          rejection_highlight_sections: p.highlightSections,
          rejection_highlight_fields: p.highlightFields,
          reviewAuditTrail: [
            ...trail,
            {
              at: new Date().toISOString(),
              role: 'KMT',
              action: 'reject',
              comment: p.comment,
              feedbackItems: p.feedbackItems,
              highlightSections: p.highlightSections,
              highlightFields: p.highlightFields,
            },
          ],
          updated: TODAY(),
        }
      })
    )
  }, [])

  const getSubmission = useCallback((id) => submissions.find(s => s.id === id), [submissions])

  const patchSubmission = useCallback((id, patch) => {
    setSubmissions(prev =>
      prev.map(s => {
        if (s.id !== id) return s
        const nextTabs =
          patch.replaceProductTabs && patch.productTabs
            ? patch.productTabs
            : patch.productTabs
              ? mergeProductTabs(s.productTabs || emptyProductTabs(), patch.productTabs)
              : s.productTabs
        const nextReq = patch.requestMeta ? { ...(s.requestMeta || emptyRequestMeta()), ...patch.requestMeta } : s.requestMeta
        const { replaceProductTabs: _rp, ...restPatch } = patch
        return {
          ...s,
          ...restPatch,
          serviceArea: patch.serviceArea ? { ...s.serviceArea, ...patch.serviceArea } : s.serviceArea,
          pricing: patch.pricing ? { ...s.pricing, ...patch.pricing } : s.pricing,
          product: patch.product ? { ...s.product, ...patch.product } : s.product,
          productTabs: nextTabs,
          requestMeta: nextReq,
          updated: TODAY(),
        }
      })
    )
  }, [])

  const releaseBufmToUnclaimed = useCallback((id, { releaseNote } = {}) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.id === id && s.status === RSA_STATUS.Pending_BUFM
          ? {
              ...s,
              bufmUnclaimed: true,
              assignedBufmReviewer: '',
              bufmReleaseNote: releaseNote || '',
              updated: TODAY(),
            }
          : s,
      ),
    )
  }, [])

  const claimBufmTask = useCallback((id, reviewerName) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.id === id && s.bufmUnclaimed && s.status === RSA_STATUS.Pending_BUFM
          ? { ...s, bufmUnclaimed: false, assignedBufmReviewer: reviewerName, updated: TODAY() }
          : s,
      ),
    )
  }, [])

  const setKmtEscalation = useCallback((id, { level, reason }) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.id === id ? { ...s, kmtEscalationLevel: level, kmtEscalationReason: reason || '', updated: TODAY() } : s,
      ),
    )
  }, [])

  const extendOfferingExpiry = useCallback((id, { newExpiryDate, offeringName }) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.id === id
          ? {
              ...s,
              serviceArea: { ...s.serviceArea, expiryDate: newExpiryDate },
              offeringExpiryLabel: offeringName || s.offeringExpiryLabel,
              updated: TODAY(),
            }
          : s,
      ),
    )
  }, [])

  const archiveSubmission = useCallback((id, { reason }) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.id === id ? { ...s, archived: true, archiveReason: reason || '', updated: TODAY() } : s,
      ),
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

  const getBufmUnclaimed = useCallback(
    () => submissions.filter(s => s.status === RSA_STATUS.Pending_BUFM && s.bufmUnclaimed),
    [submissions],
  )

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
    getBufmUnclaimed,
    releaseBufmToUnclaimed,
    claimBufmTask,
    setKmtEscalation,
    extendOfferingExpiry,
    archiveSubmission,
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

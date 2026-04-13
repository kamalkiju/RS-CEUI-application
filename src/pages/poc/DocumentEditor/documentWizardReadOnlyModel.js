import { normalizeLabel } from '../../../utils/reviewFeedback.js'

const STEP_HEADINGS = {
  1: {
    title: 'Residential Services Knowledge Area',
    subtitle: 'Read-only snapshot of knowledge area details (expand each section below).',
  },
  2: {
    title: 'Service Categories',
    subtitle: 'Category configuration, service days, and revenue / service-level notes.',
  },
  3: {
    title: 'Offerings',
    subtitle: 'Rate details, service types, and container offerings tied to this document.',
  },
  4: {
    title: 'Extra Pick Up',
    subtitle: 'Extra pickup policies, eligibility, and operational notes.',
  },
  5: {
    title: 'Fees',
    subtitle: 'Standard and custom fees, units, and billing language.',
  },
}

function areasBlock(doc) {
  const rows = doc.areas || []
  if (!rows.length) return '—'
  return rows.map(a => `${a.name} · ID ${a.id} · ${a.type}`).join('\n')
}

/** Step 1 mirrors the nine accordions in KnowledgeArea.jsx */
function step1Sections(doc, w) {
  const o = w?.step1
  if (o?.sectionsReplace?.length) return o.sectionsReplace

  const sections = [
    {
      title: 'Basic Information',
      badge: 'Required',
      fields: [
        { label: 'Document title', value: doc.sub || '—' },
        { label: 'Contract activation date', value: o?.activation ?? doc.contractActivation ?? '—' },
        { label: 'Contract expiration date', value: o?.expiration ?? '—' },
        { label: 'Document review date', value: o?.reviewDate ?? '—' },
        { label: 'Review notes', value: o?.reviewNotes ?? '—' },
      ],
    },
    {
      title: 'Contract Information',
      fields: [
        { label: 'Contract title', value: o?.contractTitle ?? `${doc.market || 'Service'} — ${doc.area || ''}`.trim() },
        { label: 'Contact phone', value: o?.phone ?? '—' },
        { label: 'Contact email', value: o?.email ?? '—' },
        { label: 'Website', value: o?.website ?? '—' },
      ],
    },
    {
      title: 'Location & Servicing Division',
      badge: `${(doc.areas || []).length || 0} location(s)`,
      fields: [
        { label: 'Primary geography', value: [doc.area, doc.market, doc.lob].filter(Boolean).join(' · ') || '—' },
        { label: 'Service area records', value: areasBlock(doc), multiline: true },
        { label: 'Servicing division city / state', value: (o?.servicingDivision ?? doc.area) || '—' },
        { label: 'Account class', value: (o?.accountClass ?? doc.lob) || '—' },
      ],
    },
    {
      title: 'Service Details & Contract Numbers',
      fields: [
        { label: 'Contract entries', value: o?.contracts ?? 'CNT-PRIMARY linked to municipal master agreement (POC sample).', multiline: true },
        { label: 'Service interrupt eligible', value: o?.svcInterrupt ?? 'No' },
        { label: 'Liable', value: o?.liable ?? 'No' },
        { label: 'Collection window', value: o?.collection ?? '06:00 – 14:00 local · Eastern (ET)' },
      ],
    },
    {
      title: 'Payment & Billing Terms',
      fields: [
        { label: 'Payment terms', value: o?.paymentTerms ?? 'Net 30 · invoice monthly in arrears.', multiline: true },
        { label: 'Months in advance / price increase', value: o?.billingMeta ?? '0 months in advance · January annual adjustment window' },
        { label: 'Invoice groups', value: o?.invoiceGroups ?? 'GRP-MUNI-01 — Municipal consolidated billing', multiline: true },
      ],
    },
    {
      title: 'InfoPro Codes & References',
      fields: [
        { label: 'Territory code', value: o?.territory ?? '—' },
        { label: 'Acquisition code', value: o?.acquisition ?? '—' },
        { label: 'Former company cart colors', value: o?.cartColors ?? '—' },
      ],
    },
    {
      title: 'Service Owner Responsibilities',
      fields: [
        {
          label: 'Responsibility matrix',
          value:
            o?.ownerMatrix ??
            'Setup: Republic · Cancellation: Muni · Missed pickups: Republic · Transfer: Muni · Reinstatement: Republic · Service change: Muni',
          multiline: true,
        },
      ],
    },
    {
      title: 'Setup, Cancellation & Process Notes',
      fields: [
        { label: 'Setup notes', value: o?.setupNotes ?? '—', multiline: true },
        { label: 'Cancellation notes', value: o?.cancelNotes ?? '—', multiline: true },
        { label: 'Save rate / BC information', value: o?.processNotes ?? '—', multiline: true },
      ],
    },
    {
      title: 'Additional Services & Options',
      fields: [
        { label: 'Service options', value: o?.options ?? 'Container pick up/return: on · CSA sign at division: on · Walk-in payment: off', multiline: true },
        { label: 'General / compliance notes', value: o?.extraNotes ?? '—', multiline: true },
      ],
    },
  ]
  return sections
}

function step2Sections(doc, w) {
  const o = w?.step2
  return [
    {
      title: 'Solid Waste',
      badge: 'Active',
      fields: [
        { label: 'Category notes', value: o?.solidWaste ?? 'Acceptable: bagged household waste in cart. Unacceptable: hazardous, liquids.', multiline: true },
        { label: 'Service days', value: o?.solidDays ?? 'Mon / Thu' },
        { label: 'Serviced by', value: o?.solidBy ?? 'Republic collection' },
      ],
    },
    {
      title: 'Recycling',
      badge: 'Active',
      fields: [
        { label: 'Category notes', value: o?.recycling ?? 'Single-stream; no plastic bags. Contamination fee may apply per fee schedule.', multiline: true },
        { label: 'Service days', value: o?.recycleDays ?? 'Mon / Thu' },
      ],
    },
    {
      title: 'Yard Waste & bulk',
      badge: 'Inactive',
      fields: [
        { label: 'Status', value: o?.yard ?? 'Not offered for this contract period; revisit at renewal.' },
      ],
    },
  ]
}

function step3Sections(doc, w) {
  const o = w?.step3
  return [
    {
      title: 'Configured offerings',
      fields: [
        {
          label: 'Primary offering',
          value:
            o?.primary ??
            `Residential ${doc.market || 'service'} — ${doc.area || 'market'} · 95/65 gal carts · weekly frequency`,
          multiline: true,
        },
        { label: 'Charge frequency / type', value: o?.charges ?? 'Monthly · Per service address · Base + ERF/FRF passthrough' },
        { label: 'Service types enabled', value: o?.types ?? 'Regular service · Extra pickup · Holiday schedule · Missed pickup' },
      ],
    },
    {
      title: 'Rate & asset summary',
      fields: [
        { label: 'Base rate guidance', value: o?.rates ?? 'Aligned to published city fee ordinance; see Fees step for line items.', multiline: true },
        { label: 'Container / asset', value: o?.asset ?? 'Republic-provided carts; color per division standard.' },
      ],
    },
  ]
}

function step4Sections(doc, w) {
  const o = w?.step4
  return [
    {
      title: 'Eligibility & limits',
      fields: [
        { label: 'Extra pickup policy', value: o?.policy ?? 'Up to 4 annual courtesy pickups; additional billable per tariff.', multiline: true },
        { label: 'Lead time', value: o?.lead ?? '24 business hours minimum notice via customer care.' },
      ],
    },
    {
      title: 'Operational notes',
      fields: [
        { label: 'Scheduling', value: o?.ops ?? 'Routed on next business day where capacity allows.', multiline: true },
      ],
    },
  ]
}

function step5Sections(doc, w) {
  const o = w?.step5
  return [
    {
      title: 'Standard fees (selected)',
      fields: [
        {
          label: 'Active fee set',
          value:
            o?.standard ??
            'Administrative Fee · ERF · FRF · Late Fee · Removal Fee · Service Interrupt / Reinstatement · Container exchange & replacement',
          multiline: true,
        },
      ],
    },
    {
      title: 'Units & calculation',
      fields: [
        { label: 'Default unit mix', value: o?.units ?? 'Flat $, % of base, and calculated (greater-of) per Republic matrix.' },
        { label: 'Customer-facing language', value: o?.language ?? 'Fee descriptions published on customer invoice stub and portal.', multiline: true },
      ],
    },
  ]
}

export function getReadOnlyStepHeading(step) {
  return STEP_HEADINGS[step] || STEP_HEADINGS[1]
}

export function getReadOnlyStepSections(doc, step) {
  const w = doc?.readOnlyWizard || {}
  switch (step) {
    case 1:
      return step1Sections(doc, w)
    case 2:
      return step2Sections(doc, w)
    case 3:
      return step3Sections(doc, w)
    case 4:
      return step4Sections(doc, w)
    case 5:
      return step5Sections(doc, w)
    default:
      return []
  }
}

/**
 * Flat snapshot of read-only preview values for diffing after rejection (POC resubmit vs reviewer baseline).
 */
export function buildReadOnlyFieldSnapshot(doc) {
  const entries = []
  for (let step = 1; step <= 5; step++) {
    const sections = getReadOnlyStepSections(doc, step)
    for (const sec of sections) {
      for (const f of sec.fields || []) {
        const v = f.value === undefined || f.value === null ? '' : String(f.value)
        entries.push({
          step,
          sectionTitle: sec.title,
          fieldLabel: f.label,
          value: v,
        })
      }
    }
  }
  return { capturedAt: new Date().toISOString(), entries }
}

/**
 * Compare rejection-time snapshot to current doc; returns section titles and field labels that changed.
 */
export function diffReadOnlySnapshots(baseline, doc) {
  if (!baseline?.entries?.length) return { sections: [], fields: [] }
  const current = buildReadOnlyFieldSnapshot(doc)
  const map = new Map()
  for (const e of current.entries) {
    const key = `${e.step}|${normalizeLabel(e.sectionTitle)}|${normalizeLabel(e.fieldLabel)}`
    map.set(key, e.value)
  }
  const changedSections = new Set()
  const changedFields = new Set()
  for (const e of baseline.entries) {
    const key = `${e.step}|${normalizeLabel(e.sectionTitle)}|${normalizeLabel(e.fieldLabel)}`
    const prev = e.value === undefined || e.value === null ? '' : String(e.value)
    const next = map.has(key) ? map.get(key) : ''
    if (prev !== next) {
      changedSections.add(e.sectionTitle)
      changedFields.add(e.fieldLabel)
    }
  }
  return { sections: [...changedSections], fields: [...changedFields] }
}

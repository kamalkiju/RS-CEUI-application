/**
 * Rich default form structure aligned with POC Knowledge Document wizard
 * (Knowledge Area → Service Categories → Offerings → Extra Pickup → Fees).
 * Uses the same field types as KmtFormBuilder.
 */
import { uid, emptyField, POC_FORM_TAB_TITLES, ensureFivePocTabs } from './kmtFormBuilderShared.js'

function f(type, overrides = {}) {
  const base = emptyField(type)
  return { ...base, ...overrides, id: base.id }
}

function group(title, columns, fields) {
  return { id: uid(), title, columns, fields }
}

export function buildPocReferenceForm() {
  const tabs = [
    {
      id: uid(),
      title: POC_FORM_TAB_TITLES[0],
      groups: [
        group('Contract & knowledge base', 2, [
          f('text', {
            label: 'Document title',
            placeholder: 'e.g. DIV 386 MUNI – City of Port Orange, FL',
            helpText: 'Matches POC document header',
          }),
          f('text', { label: 'Contract number / reference', placeholder: 'CNT-PO-2023-12' }),
          f('date', { label: 'Contract activation date' }),
          f('date', { label: 'Contract expiration date' }),
          f('notes', {
            label: 'Review notes',
            placeholder: 'Courtesy pickups, ordinance references, special provisions…',
            defaultValue: '',
          }),
        ]),
        group('Location & servicing division', 2, [
          f('text', { label: 'Primary geography / service area', placeholder: 'Muni - Port Orange, FL' }),
          f('text', { label: 'Servicing division', placeholder: 'Division 386' }),
          f('dropdown', {
            label: 'Market segment',
            options: [
              { id: uid(), text: 'Municipal' },
              { id: uid(), text: 'Residential' },
              { id: uid(), text: 'Commercial' },
            ],
          }),
          f('text', { label: 'Territory / region code', placeholder: 'SE-CFL' }),
        ]),
      ],
    },
    {
      id: uid(),
      title: POC_FORM_TAB_TITLES[1],
      groups: [
        group('Solid Waste', 2, [
          f('notes', {
            label: 'Acceptable materials (notes)',
            placeholder: 'List acceptable waste streams…',
          }),
          f('notes', {
            label: 'Unacceptable materials (notes)',
            placeholder: 'Plastic bags, hazardous, etc.',
          }),
          f('text', { label: 'Service day notes', placeholder: 'Mon / Wed / Fri collection' }),
          f('dropdown', { label: 'Serviced by *', options: [{ id: uid(), text: 'Republic' }, { id: uid(), text: 'Contractor' }] }),
          f('notes', { label: 'CSR instructions', placeholder: 'Customer service scripts…' }),
          f('text', { label: 'Revenue code (primary)', placeholder: 'REV-001' }),
          f('percentage', { label: 'Revenue allocation %', defaultValue: '100' }),
        ]),
        group('Recycling', 2, [
          f('notes', { label: 'Recycling acceptable / unacceptable', placeholder: 'Single-stream rules…' }),
          f('text', { label: 'Contamination fee reference', placeholder: 'Per fee matrix v3' }),
        ]),
        group('Yard Waste', 2, [
          f('yesno', { label: 'Yard waste offered' }),
          f('notes', { label: 'Seasonal notes', placeholder: 'Bag limits, brush piles…' }),
        ]),
        group('Bulk Waste', 2, [
          f('notes', { label: 'Bulk pickup rules', placeholder: 'Annual limits, fees…' }),
        ]),
      ],
    },
    {
      id: uid(),
      title: POC_FORM_TAB_TITLES[2],
      groups: [
        group('Offerings overview', 1, [
          f('notes', {
            label: 'How offerings work',
            defaultValue:
              'Offerings describe service packages (container type, frequency, pricing). Add multiple tiers (Standard, Premium) as needed.',
            placeholder: '',
          }),
        ]),
        group('Offering — Residential solid waste (example)', 2, [
          f('text', { label: 'Offering name', defaultValue: 'Residential Solid Waste – Standard' }),
          f('text', { label: 'Container', defaultValue: 'Cart - 65 gal' }),
          f('dropdown', {
            label: 'Charge frequency',
            options: [
              { id: uid(), text: 'Monthly' },
              { id: uid(), text: 'Quarterly' },
            ],
          }),
          f('currency', { label: 'Base rate', defaultValue: '22.50' }),
          f('dropdown', {
            label: 'Charge type',
            options: [
              { id: uid(), text: 'Flat rate' },
              { id: uid(), text: 'Per unit' },
            ],
          }),
        ]),
        group('Offering — placeholder', 2, [
          f('text', { label: 'New offering name', placeholder: 'New Offering – Standard' }),
          f('text', { label: 'Container / asset', placeholder: 'N/A' }),
        ]),
      ],
    },
    {
      id: uid(),
      title: POC_FORM_TAB_TITLES[3],
      groups: [
        group('On service day extra pick ups', 1, [
          f('notes', {
            label: 'CRR instructions',
            placeholder: 'Bold / list formatting as in POC rich editor…',
          }),
          f('notes', {
            label: 'Preparation instructions',
            defaultValue: 'Examples: Lid must close; place 2 ft from curb.',
            placeholder: '',
          }),
          f('checkbox', { label: 'Check if service is prescheduled' }),
          f('notes', { label: 'Service details', placeholder: 'Cart content + bags…' }),
          f('text', { label: 'Service limit', placeholder: 'e.g. Cart content plus up to 2 additional bags' }),
          f('notes', { label: 'Rates — on service day', placeholder: 'Add rate rows in POC; capture summary here.' }),
        ]),
        group('Non-service day extra pick ups', 1, [
          f('notes', {
            label: 'Service details',
            placeholder: 'Describe non-service-day pickup…',
          }),
          f('text', { label: 'Service limit', placeholder: 'Up to 10 bags…' }),
          f('notes', { label: 'Rates — non-service day', placeholder: 'No rates configured yet — click Add Rate in POC.' }),
        ]),
      ],
    },
    {
      id: uid(),
      title: POC_FORM_TAB_TITLES[4],
      groups: [
        group('Fee configuration', 1, [
          f('notes', {
            label: 'Instructions',
            defaultValue:
              'Fees that do not apply show blank on the summary; applicable fees show amounts on the right.',
            placeholder: '',
          }),
        ]),
        group('Standard fees (reference list)', 2, [
          f('text', { label: 'Administrative fee', placeholder: 'Edit amount' }),
          f('text', { label: 'Container exchange fee', placeholder: 'RS damaged/odor' }),
          f('text', { label: 'Container replacement fee', placeholder: 'Lost/stolen' }),
          f('text', { label: 'Delivery fee', placeholder: '' }),
          f('text', { label: 'ERF – Environmental Recovery Fee', placeholder: '' }),
          f('text', { label: 'FRF – Fuel Recovery Fee', placeholder: '' }),
          f('text', { label: 'Late fee', placeholder: '' }),
          f('text', { label: 'Removal fee', placeholder: '' }),
          f('text', { label: 'Service interrupt fee', placeholder: '' }),
          f('text', { label: 'Service reinstatement fee', placeholder: '' }),
        ]),
        group('Additional fees', 2, [
          f('notes', { label: 'Non-standard fees', placeholder: '+ Add fee — notes for custom fee lines' }),
        ]),
      ],
    },
  ]

  return { tabs }
}

function tabFieldCount(tab) {
  if (!tab?.groups?.length) return 0
  return tab.groups.reduce((n, g) => n + (g.fields?.length || 0), 0)
}

/** Tabs with this many total fields (or fewer) are treated as stubs and replaced with the POC reference layout. */
const STUB_FIELD_THRESHOLD = 2

function cloneFieldFromRef(src) {
  const blank = emptyField(src.type)
  return {
    ...blank,
    ...src,
    id: uid(),
    options: Array.isArray(src.options) ? src.options.map(o => ({ ...o, id: uid() })) : blank.options,
  }
}

function cloneGroupFromRef(g) {
  return {
    id: uid(),
    title: g.title,
    columns: g.columns,
    fields: (g.fields || []).map(cloneFieldFromRef),
  }
}

function cloneTabFromRef(refTab, preserveTabId) {
  return {
    id: preserveTabId || uid(),
    title: refTab.title,
    groups: (refTab.groups || []).map(cloneGroupFromRef),
  }
}

/**
 * Replaces sparse tabs (≤2 fields) with the full POC reference groups/fields so the form builder
 * matches the intended five-tab layout. Tabs with more content are left as-is (titles still aligned to POC).
 */
export function hydrateSparseTabsWithReference(form) {
  const ref = buildPocReferenceForm()
  const existing = Array.isArray(form?.tabs) ? form.tabs : []
  const tabs = []
  for (let i = 0; i < 5; i++) {
    const ex = existing[i]
    const refT = ref.tabs[i]
    const cnt = tabFieldCount(ex)
    const isStub = !ex || cnt <= STUB_FIELD_THRESHOLD
    tabs.push(
      isStub ? cloneTabFromRef(refT, ex?.id) : { ...ex, title: POC_FORM_TAB_TITLES[i] },
    )
  }
  return { ...(form && typeof form === 'object' ? form : {}), tabs }
}

/** Hydrate sparse tabs, then enforce five POC tab titles. Use for wizard init, edit load, and demos. */
export function normalizeTemplateForm(form) {
  return ensureFivePocTabs(hydrateSparseTabsWithReference(form && typeof form === 'object' ? form : { tabs: [] }))
}

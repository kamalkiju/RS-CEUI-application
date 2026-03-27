/** Core category keys (order preserved). */
export const RSA_CORE_TAB_KEYS = ['solidWaste', 'recycle', 'yardWaste']

const DEFAULT_TAB = (id, label, mandatory) => ({
  id,
  label,
  mandatory,
  primaryOfferings: [],
  additionalOfferings: [],
})

export function defaultProductTabs() {
  return {
    solidWaste: DEFAULT_TAB('solidWaste', 'Solid Waste', true),
    recycle: DEFAULT_TAB('recycle', 'Recycle', false),
    yardWaste: DEFAULT_TAB('yardWaste', 'Yard Waste', true),
  }
}

/**
 * Merge API/store productTabs with defaults; include custom category keys.
 */
export function mergeProductTabs(raw) {
  const d = defaultProductTabs()
  if (!raw || typeof raw !== 'object') return d
  const out = {}
  RSA_CORE_TAB_KEYS.forEach(k => {
    out[k] = { ...d[k], ...(raw[k] || {}) }
  })
  Object.keys(raw).forEach(k => {
    if (RSA_CORE_TAB_KEYS.includes(k)) return
    const r = raw[k]
    if (!r || typeof r !== 'object') return
    out[k] = {
      id: k,
      label: r.label || k,
      mandatory: Boolean(r.mandatory),
      primaryOfferings: Array.isArray(r.primaryOfferings) ? r.primaryOfferings : [],
      additionalOfferings: Array.isArray(r.additionalOfferings) ? r.additionalOfferings : [],
      ...r,
    }
  })
  return out
}

/** Ordered keys for UI: core first, then any custom tabs. */
export function productTabKeyOrder(merged) {
  const extras = Object.keys(merged).filter(k => !RSA_CORE_TAB_KEYS.includes(k))
  return [...RSA_CORE_TAB_KEYS, ...extras]
}

import { ensureFiveRsauiTabs } from './kmtFormBuilderShared.js'

/**
 * Normalize RSAUI workflow template forms (residential service-area structure).
 */
export function normalizeRsauiTemplateForm(form) {
  const raw = form && typeof form === 'object' ? form : { tabs: [] }
  const hydrated = ensureFiveRsauiTabs(raw)
  return {
    ...hydrated,
    headerGroups: Array.isArray(hydrated.headerGroups) ? hydrated.headerGroups : [],
  }
}

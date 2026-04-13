/**
 * Service-area submission API — wire fetch() when backend exists.
 * Legacy name kept for existing imports.
 */

export const SERVICE_AREA_POST_PATH = '/api/ceui/service-area'
export const RSAUI_POST_PATH = SERVICE_AREA_POST_PATH

export function buildRsaUIPayload(body) {
  return { url: SERVICE_AREA_POST_PATH, method: 'POST', body }
}

/** Dev-only: last POST payload for inspection */
let lastPostPayload = null
export function getLastRsaUIPost() {
  return lastPostPayload
}

export function simulatePostRsaUI(payload) {
  lastPostPayload = { ...payload, _at: new Date().toISOString() }
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.info('[service-area POST]', SERVICE_AREA_POST_PATH, payload)
  }
  return Promise.resolve({ ok: true, id: payload.id })
}

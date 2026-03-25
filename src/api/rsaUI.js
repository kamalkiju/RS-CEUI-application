/**
 * RSAUI API — wire fetch() when backend exists.
 */

export const RSAUI_POST_PATH = '/rsaui'

export function buildRsaUIPayload(body) {
  return { url: RSAUI_POST_PATH, method: 'POST', body }
}

/** Dev-only: last POST payload for inspection */
let lastPostPayload = null
export function getLastRsaUIPost() {
  return lastPostPayload
}

export function simulatePostRsaUI(payload) {
  lastPostPayload = { ...payload, _at: new Date().toISOString() }
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.info('[RSAUI POST]', RSAUI_POST_PATH, payload)
  }
  return Promise.resolve({ ok: true, id: payload.id })
}

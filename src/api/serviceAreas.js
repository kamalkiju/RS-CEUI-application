/**
 * Published service areas for Knowledge Document create flow.
 * GET /service-areas?status=Published
 */

export function getPublishedServiceAreasUrl(basePath = '/service-areas') {
  return `${basePath}?status=Published`
}

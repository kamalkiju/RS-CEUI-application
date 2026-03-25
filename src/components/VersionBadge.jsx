import { inferDocVersion } from '../utils/documentVersion.js'

/**
 * @param {{ version?: string }} props — pass version or doc for inferred fallback
 */
export default function VersionBadge({ version, doc, className = '' }) {
  const v = version ?? (doc ? inferDocVersion(doc) : 'V1.0')
  return (
    <span className={`version-badge ${className}`.trim()} title="Document version">
      <span className="version-badge__label">Version</span>
      <span className="version-badge__value">{v}</span>
    </span>
  )
}

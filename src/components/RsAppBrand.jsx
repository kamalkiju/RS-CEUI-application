import rsLogoUrl from '../assets/rs-logo.svg'

/**
 * Republic Services mark + CEUI / RSAUI label. Logo height scales with label (em).
 */
export default function RsAppBrand({
  appLabel,
  variant = 'sidebar',
  className = '',
  id,
}) {
  const label = appLabel === 'RSAUI' ? 'RSAUI' : 'CEUI'
  return (
    <span
      id={id}
      className={`rs-app-brand rs-app-brand--${variant}${className ? ` ${className}` : ''}`}
    >
      <img
        src={rsLogoUrl}
        alt=""
        className="rs-app-brand__logo"
        width={120}
        height={107}
        decoding="async"
        draggable={false}
      />
      <span className="rs-app-brand__label">{label}</span>
    </span>
  )
}

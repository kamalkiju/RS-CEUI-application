/**
 * KMT dashboard charts — SVG-only, Applify-inspired theme (purple / orange / gold).
 */
import React from 'react'

export const KMT_THEME = {
  purple: '#6C2CF5',
  orange: '#FF7A50',
  gold: '#FFC107',
  surface: '#FFFFFF',
  pageBg: '#F5F6FA',
  grid: '#E8ECF4',
  text: '#1a1d26',
  textMuted: '#64748b',
}

/** @deprecated use KMT_THEME */
export const COLORS = {
  primary: KMT_THEME.purple,
  success: '#16a34a',
  warning: KMT_THEME.gold,
  danger: KMT_THEME.orange,
  muted: '#94a3b8',
  purple: KMT_THEME.purple,
  slate: '#475569',
}

function uid() {
  return `kmt-${Math.random().toString(36).slice(2, 9)}`
}

/** Card header with optional period control */
export function KmtChartCard({ title, subtitle, children, className = '', period = 'Week', periods = ['Week', 'Month', 'Quarter'] }) {
  const [p, setP] = React.useState(period)
  return (
    <div className={`kmt-chart-card ${className}`.trim()}>
      <div className="kmt-chart-card__head kmt-chart-card__head--row">
        <div>
          <h2 className="kmt-chart-card__title">{title}</h2>
          {subtitle && <p className="kmt-chart-card__sub">{subtitle}</p>}
        </div>
        <label className="kmt-chart-card__period">
          <span className="kmt-chart-card__period-icon" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <select className="kmt-chart-card__select" value={p} onChange={e => setP(e.target.value)} aria-label="Time range">
            {periods.map(x => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="kmt-chart-card__body">{children}</div>
    </div>
  )
}

/** Smooth cubic path through points [[x,y], ...] */
function smoothLinePath(points) {
  if (points.length < 2) return ''
  if (points.length === 2) return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`
  let d = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`
  }
  return d
}

/** Vertical bars with % grid, thin rounded caps, bottom legend */
export function KmtBarChartVertical({ items, height = 200, barW = 14 }) {
  const max = Math.max(1, ...items.map(i => i.value))
  const gap = 18
  const w = items.length * (barW + gap) + gap + 24
  const h = height
  const baseY = h - 36
  const plotH = baseY - 28

  const gridSteps = 5
  return (
    <div className="kmt-chart-vstack">
      <svg className="kmt-chart-svg kmt-chart-vstack__svg" viewBox={`0 0 ${w} ${h + 8}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={items.map(i => `${i.label} ${i.value}`).join(', ')}>
        {[0, 1, 2, 3, 4, 5].map(step => {
          const gy = 20 + (plotH * step) / gridSteps
          const pct = Math.round(100 - (100 * step) / gridSteps)
          return (
            <g key={step}>
              <line x1="36" y1={gy} x2={w - 8} y2={gy} stroke={KMT_THEME.grid} strokeWidth="1" />
              <text x="4" y={gy + 4} fontSize="9" fill={KMT_THEME.textMuted}>
                {pct}%
              </text>
            </g>
          )
        })}
        {items.map((it, i) => {
          const bh = Math.round((it.value / max) * plotH)
          const x = 40 + i * (barW + gap)
          const y = baseY - bh
          const fill = it.color || KMT_THEME.purple
          return (
            <g key={it.label}>
              <rect x={x} y={y} width={barW} height={bh} rx={7} fill={fill} />
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={KMT_THEME.text}>
                {it.value}
              </text>
              <text x={x + barW / 2} y={baseY + 12} textAnchor="middle" fontSize="9" fontWeight="600" fill={KMT_THEME.textMuted}>
                {it.short || it.label.slice(0, 9)}
              </text>
            </g>
          )
        })}
      </svg>
      <ul className="kmt-chart-legend kmt-chart-legend--row">
        {items.map(it => (
          <li key={it.label}>
            <span className="kmt-chart-legend__dot" style={{ background: it.color || KMT_THEME.purple }} />
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Single horizontal 100% stacked bar — segments: { label, value, color } */
export function KmtStackedDistributionBar({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className="kmt-chart-stackdist">
      <div
        className="kmt-chart-stackdist__track"
        role="img"
        aria-label={segments.map(s => `${s.label} ${Math.round((s.value / total) * 100)} percent`).join(', ')}
      >
        {segments.map(s => (
          <div
            key={s.label}
            className="kmt-chart-stackdist__seg"
            style={{
              flex: s.value,
              background: s.color,
            }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <ul className="kmt-chart-legend kmt-chart-legend--row">
        {segments.map(s => (
          <li key={s.label}>
            <span className="kmt-chart-legend__dot" style={{ background: s.color }} />
            <span>
              {s.label} <strong>{Math.round((s.value / total) * 100)}%</strong>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Horizontal progress rows — items: { label, value, color? } */
export function KmtBarChartHorizontal({ items }) {
  const max = Math.max(1, ...items.map(i => i.value))
  return (
    <ul className="kmt-chart-hbar kmt-chart-hbar--applify">
      {items.map(it => {
        const pct = Math.round((it.value / max) * 100)
        return (
          <li key={it.label} className="kmt-chart-hbar__row">
            <span className="kmt-chart-hbar__dot" style={{ background: it.color || KMT_THEME.purple }} />
            <span className="kmt-chart-hbar__label">{it.label}</span>
            <div className="kmt-chart-hbar__track">
              <div
                className="kmt-chart-hbar__fill"
                style={{
                  width: `${pct}%`,
                  background: it.color || KMT_THEME.purple,
                }}
              />
            </div>
            <span className="kmt-chart-hbar__val">{pct}%</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Donut with hole + center total; segments: { label, value, color } */
export function KmtPieChart({ segments, size = 176 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const rOut = size * 0.38
  const rIn = size * 0.22
  let angle = -Math.PI / 2
  const arcs = segments.map(seg => {
    const slice = (seg.value / total) * 2 * Math.PI
    const a0 = angle
    angle += slice
    const x1o = cx + rOut * Math.cos(a0)
    const y1o = cy + rOut * Math.sin(a0)
    const x2o = cx + rOut * Math.cos(angle)
    const y2o = cy + rOut * Math.sin(angle)
    const x1i = cx + rIn * Math.cos(angle)
    const y1i = cy + rIn * Math.sin(angle)
    const x2i = cx + rIn * Math.cos(a0)
    const y2i = cy + rIn * Math.sin(a0)
    const large = slice > Math.PI ? 1 : 0
    const d = [
      `M ${x1o} ${y1o}`,
      `A ${rOut} ${rOut} 0 ${large} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${rIn} ${rIn} 0 ${large} 0 ${x2i} ${y2i}`,
      'Z',
    ].join(' ')
    return { d, color: seg.color, label: seg.label, value: seg.value }
  })

  return (
    <div className="kmt-chart-donut-wrap kmt-chart-donut-wrap--applify">
      <div className="kmt-chart-donut__frame">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="kmt-chart-donut" role="img">
          {arcs.map((a, i) => (
            <path key={i} d={a.d} fill={a.color} stroke="#fff" strokeWidth="2.5" />
          ))}
          <circle cx={cx} cy={cy} r={rIn * 0.92} fill="#fff" />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="800" fill={KMT_THEME.text}>
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fontWeight="600" fill={KMT_THEME.textMuted}>
            Total
          </text>
        </svg>
      </div>
      <ul className="kmt-chart-donut-legend kmt-chart-donut-legend--applify">
        {segments.map(s => (
          <li key={s.label}>
            <span className="kmt-chart-donut-legend__sw" style={{ background: s.color }} />
            <span className="kmt-chart-donut-legend__text">{s.label}</span>
            <strong className="kmt-chart-donut-legend__num">{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Smooth area + line from raw counts; Y-axis labels + hover tooltips. */
export function KmtAreaTrend({ values, xLabels, label }) {
  const [hover, setHover] = React.useState(null)
  const w = 400
  const h = 160
  const padL = 44
  const padR = 14
  const padT = 16
  const padB = 30
  const iw = w - padL - padR
  const ih = h - padT - padB
  const vals = values?.length ? [...values] : [0]
  const n = vals.length
  const maxRaw = Math.max(...vals, 0)
  const maxVal = Math.max(1, maxRaw)
  const norm = vals.map(v => 0.06 + (v / maxVal) * 0.9)
  const step = iw / Math.max(1, n - 1)
  const coords = norm.map((py, i) => [padL + i * step, padT + (1 - py) * ih])
  const lineD = smoothLinePath(coords)
  const last = coords[coords.length - 1]
  const first = coords[0]
  const areaD = lineD ? `${lineD} L ${last[0]} ${h - padB} L ${first[0]} ${h - padB} Z` : ''
  const gid = uid()
  const xl = xLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(0, n)
  const lastPt = coords[coords.length - 1]

  return (
    <div className="kmt-chart-area-wrap">
      <svg
        className="kmt-chart-svg kmt-chart-trend"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={label}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`${gid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={KMT_THEME.orange} stopOpacity="0.38" />
            <stop offset="100%" stopColor={KMT_THEME.orange} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map(g => {
          const gy = padT + (ih * g) / 4
          const tickVal = Math.round(maxVal * (1 - g / 4))
          return (
            <g key={g}>
              <line x1={padL} y1={gy} x2={w - padR} y2={gy} stroke={KMT_THEME.grid} strokeWidth="1" />
              <text x="6" y={gy + 4} fontSize="9" fontWeight="600" fill={KMT_THEME.textMuted} textAnchor="start">
                {tickVal}
              </text>
            </g>
          )
        })}
        {areaD ? <path d={areaD} fill={`url(#${gid}-area)`} /> : null}
        {lineD ? (
          <path d={lineD} fill="none" stroke={KMT_THEME.orange} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {lastPt ? (
          <circle cx={lastPt[0]} cy={lastPt[1]} r="5" fill="#fff" stroke={KMT_THEME.orange} strokeWidth="2.5" />
        ) : null}
        {coords.map((c, i) => {
          const half = Math.max(12, step / 2)
          return (
            <rect
              key={i}
              x={c[0] - half}
              y={padT}
              width={half * 2}
              height={ih}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover({ i, x: c[0], y: c[1], count: vals[i] ?? 0 })}
            />
          )
        })}
        {coords.map((c, i) => (
          <text key={`l-${i}`} x={c[0]} y={h - 6} textAnchor="middle" fontSize="9" fontWeight="600" fill={KMT_THEME.textMuted}>
            {xl[i] ?? i}
          </text>
        ))}
        {hover && (
          <g pointerEvents="none">
            <rect
              x={Math.min(Math.max(hover.x - 52, padL), w - padR - 104)}
              y={Math.max(padT + 2, hover.y - 36)}
              width={104}
              height={26}
              rx={6}
              fill="#1a1d26"
              opacity={0.94}
            />
            <text
              x={Math.min(Math.max(hover.x, padL + 52), w - padR - 52)}
              y={Math.max(padT + 20, hover.y - 18)}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#fff"
            >
              {`${xl[hover.i] ?? hover.i}: ${hover.count}`}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

/** Semi-circular gauge 0..1 — for metric cards */
export function KmtMiniRing({ value, color }) {
  const size = 56
  const stroke = 5
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = Math.PI * r
  const dash = Math.max(0.02, Math.min(1, value)) * circ
  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} className="kmt-mini-ring" aria-hidden>
      <path d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`} fill="none" stroke="#EEF1F7" strokeWidth={stroke} strokeLinecap="round" />
      <path
        d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
        fill="none"
        stroke={color || KMT_THEME.purple}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        pathLength={circ}
      />
    </svg>
  )
}

import { useMemo } from 'react'
import Layout from '../components/Layout.jsx'
import { useDocs } from '../context/DocContext.jsx'
import { useKmtTemplates } from '../context/KmtTemplateContext.jsx'
import { useRsaUI } from '../context/RsaUIContext.jsx'
import {
  KmtChartCard,
  KmtBarChartHorizontal,
  KmtPieChart,
  KmtStackedDistributionBar,
  KmtMiniRing,
  KMT_THEME,
} from '../components/kmt/KmtDashboardCharts.jsx'

function countMap(list, keyFn) {
  const m = {}
  for (const row of list) {
    const k = keyFn(row) || 'Other'
    m[k] = (m[k] || 0) + 1
  }
  return m
}

const THEME_ROT = [KMT_THEME.purple, KMT_THEME.gold, KMT_THEME.orange, '#9B6CFF', '#FFB08A', '#FFE082']

export default function KMTDashboard() {
  const { docs } = useDocs()
  const { templates } = useKmtTemplates()
  const { submissions, RSA_STATUS } = useRsaUI()

  const metrics = useMemo(() => {
    const pendingKmt = docs.filter(d => d.status === 'Pending_KMT').length
    const published = docs.filter(d => d.status === 'approved').length
    const rejected = docs.filter(d => d.status === 'Rejected_KMT' || d.status === 'Rejected_BUFM').length
    const knowledgeTpl = templates.length
    const rsauiTpl = templates.filter(t => t.docType === 'RSAUI').length
    const workflows = templates.filter(t => (t.workflow?.nodes?.length || 0) > 0).length
    return { pending: pendingKmt, published, rejected, knowledge: knowledgeTpl, rsaui: rsauiTpl, workflows }
  }, [docs, templates])

  const totalMetricPool = Math.max(1, metrics.pending + metrics.published + metrics.rejected + metrics.knowledge)

  const knowledgeByStatus = useMemo(() => {
    const m = countMap(docs, d => d.status)
    const order = ['Pending_KMT', 'Pending_BUFM', 'approved', 'draft', 'Rejected_KMT', 'Rejected_BUFM']
    return order
      .filter(k => (m[k] || 0) > 0)
      .map((k, i) => ({
        label: k.replace(/_/g, ' '),
        short: k.replace('Pending_', 'P.').replace('Rejected_', 'R.').slice(0, 7),
        value: m[k] || 0,
        color: THEME_ROT[i % THEME_ROT.length],
      }))
  }, [docs])

  const knowledgeSegments = useMemo(() => {
    return knowledgeByStatus.map(({ label, value, color }) => ({ label, value, color }))
  }, [knowledgeByStatus])

  const templatesByStatus = useMemo(() => {
    const m = countMap(templates, t => t.status)
    return ['draft', 'submitted', 'approved', 'published'].map((st, i) => ({
      label: st.charAt(0).toUpperCase() + st.slice(1),
      value: m[st] || 0,
      color: st === 'published' ? KMT_THEME.gold : st === 'draft' ? KMT_THEME.textMuted : st === 'submitted' ? KMT_THEME.orange : KMT_THEME.purple,
    }))
  }, [templates])

  const rsaSegments = useMemo(() => {
    const m = countMap(submissions, s => s.status)
    const keys = Object.values(RSA_STATUS)
    return keys
      .filter(k => (m[k] || 0) > 0)
      .map((k, i) => ({
        label: k.replace(/_/g, ' '),
        value: m[k],
        color: THEME_ROT[i % THEME_ROT.length],
      }))
  }, [submissions, RSA_STATUS])

  const byMarket = useMemo(() => {
    const m = countMap(docs, d => d.market || d.lob || 'Unknown')
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value], i) => ({ label, value, color: THEME_ROT[i % THEME_ROT.length] }))
  }, [docs])

  const CARDS = [
    { key: 'pending', label: 'Pending KMT review', ring: KMT_THEME.purple },
    { key: 'published', label: 'Approved knowledge docs', ring: KMT_THEME.gold },
    { key: 'rejected', label: 'Rejected (BUFM/KMT)', ring: KMT_THEME.orange },
    { key: 'knowledge', label: 'Templates (all)', ring: KMT_THEME.purple },
    { key: 'rsaui', label: 'RSAUI-type templates', ring: '#9B6CFF' },
    { key: 'workflows', label: 'Templates w/ workflow', ring: KMT_THEME.orange },
  ]

  return (
    <Layout>
      <div className="kmt-page kmt-dashboard kmt-dashboard--applify">
        <div className="kmt-dashboard__head">
          <h1 className="kmt-page__title">Dashboard</h1>
          <p className="kmt-page__sub">Knowledge management metrics, document flow, and template pipeline.</p>
        </div>

        <div className="kmt-dashboard__grid">
          {CARDS.map(c => {
            const v = metrics[c.key]
            const share = Math.round((v / totalMetricPool) * 100)
            const ringVal = Math.min(1, Math.max(0.06, v / Math.max(12, totalMetricPool * 0.35)))
            return (
              <div key={c.key} className="kmt-metric-card kmt-metric-card--applify">
                <div className="kmt-metric-card__row">
                  <div>
                    <div className="kmt-metric-card__label">{c.label}</div>
                    <div className="kmt-metric-card__value">{v}</div>
                    <div className="kmt-metric-card__delta">+{share}% of tracked volume</div>
                  </div>
                  <KmtMiniRing value={ringVal} color={c.ring} />
                </div>
              </div>
            )
          })}
        </div>

        <h2 className="kmt-dashboard__charts-title">Analytics</h2>
        <div className="kmt-dashboard__charts">
          <KmtChartCard title="Knowledge pipeline mix" subtitle="Share of knowledge documents by status" periods={['Week', 'Month', 'Quarter']}>
            {knowledgeSegments.length ? (
              <KmtStackedDistributionBar segments={knowledgeSegments} />
            ) : (
              <p className="kmt-chart-empty">No documents loaded.</p>
            )}
          </KmtChartCard>

          <KmtChartCard title="Templates by status" subtitle="Draft through published" periods={['Month', 'Quarter', 'Year']}>
            <KmtBarChartHorizontal items={templatesByStatus} />
          </KmtChartCard>

          <KmtChartCard title="RSAUI submissions" subtitle="By workflow status" periods={['Week', 'Month', 'Quarter']}>
            {rsaSegments.length ? (
              <KmtPieChart segments={rsaSegments} />
            ) : (
              <p className="kmt-chart-empty">No RSAUI rows.</p>
            )}
          </KmtChartCard>

          <KmtChartCard title="Knowledge docs by market / LOB" subtitle="Top segments" periods={['Month', 'Quarter', 'Year']}>
            {byMarket.length ? (
              <KmtBarChartHorizontal items={byMarket} />
            ) : (
              <p className="kmt-chart-empty">No market data.</p>
            )}
          </KmtChartCard>

        </div>
      </div>
    </Layout>
  )
}

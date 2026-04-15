import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useRsaUI } from '../context/RsaUIContext.jsx'
import { useDocs } from '../context/DocContext.jsx'

const ROUTES = [
  { id: '#RT-4421', team: 'Team Alpha', zone: 'North District', pickups: '34 / 34', pct: 100, status: 'Completed', color: '#27ae60' },
  { id: '#RT-4422', team: 'Team Bravo', zone: 'South District', pickups: '28 / 40', pct: 70, status: 'In Progress', color: '#e67e22' },
  { id: '#RT-4423', team: 'Team Charlie', zone: 'East Side', pickups: '15 / 38', pct: 40, status: 'In Progress', color: '#e67e22' },
  { id: '#RT-4424', team: 'Team Delta', zone: 'West End', pickups: '0 / 29', pct: 5, status: 'Scheduled', color: '#dce6f0' },
  { id: '#RT-4425', team: 'Team Echo', zone: 'Central', pickups: '41 / 41', pct: 100, status: 'Completed', color: '#27ae60' },
]

const STATUS_STYLES = {
  'Completed':   { background: '#eafaf1', color: '#1e8449', border: '1px solid #a9dfbf' },
  'In Progress': { background: '#fef9e7', color: '#b7770d', border: '1px solid #f9e79f' },
  'Scheduled':   { background: '#eaf4fb', color: '#1a5276', border: '1px solid #aed6f1' },
}

export default function BUFMDashboard() {
  const navigate = useNavigate()
  const { getPendingForBUFM } = useRsaUI()
  const { docs } = useDocs()
  const pendingRsa = getPendingForBUFM()
  const recentKnowledgeApprovals = useMemo(() => {
    return docs
      .filter(d => d.approved_by_BUFM && (d.status === 'Pending_KMT' || d.status === 'approved'))
      .slice(0, 8)
  }, [docs])

  return (
    <Layout>
      <div style={{ padding: '28px 24px', flex: 1 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a2b3c', marginBottom: 4 }}>Field Operations Overview</h2>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28 }}>Monitor your field teams, service routes and operational metrics</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { icon: '#e67e22', bg: '#fef3e7', label: 'Active Field Teams', value: '24', trend: '▲ 3 from last week', up: true },
            { icon: '#27ae60', bg: '#eafaf1', label: 'Routes Completed', value: '187', trend: '▲ 12% vs last month', up: true },
            { icon: '#f39c12', bg: '#fef9e7', label: 'Pending Pickups', value: '41', trend: '▼ 5 overdue', up: false },
            { icon: '#1976d2', bg: '#eaf4fb', label: 'Open Reports', value: '9', trend: '2 due today', up: null },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', border: '1px solid #dce6f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stat.icon} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1a2b3c', marginBottom: 6 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: stat.up === true ? '#27ae60' : stat.up === false ? '#e74c3c' : '#94a3b8' }}>{stat.trend}</div>
            </div>
          ))}
        </div>

        {/* RSAUI — pending BUFM (view opens full review; approve/reject on that page) */}
        <div style={{ background: '#fff', border: '1px solid #dce6f0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #dce6f0' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c' }}>Recent RSAUI approvals</span>
            <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#fef9e7', color: '#b45309', border: '1px solid #fde68a' }}>Pending BUFM</span>
          </div>
          {pendingRsa.length === 0 ? (
            <p style={{ padding: 20, color: '#94a3b8', fontSize: 14 }}>No RSAUI submissions awaiting BUFM review.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['ID', 'Service area', 'Product', 'Updated', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#5c7185', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #dce6f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingRsa.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{s.id}</td>
                    <td style={{ padding: '12px 16px' }}>{s.serviceArea?.name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{s.product?.name || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{s.updated}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => navigate(`/bufm/review/${encodeURIComponent(s.id)}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* CEUI knowledge — BUFM-approved / in KMT pipeline */}
        <div style={{ background: '#fff', border: '1px solid #dce6f0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #dce6f0' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c' }}>Recent Knowledge docs approvals</span>
            <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#eaf4fb', color: '#1a5276', border: '1px solid #aed6f1' }}>CEUI</span>
          </div>
          {recentKnowledgeApprovals.length === 0 ? (
            <p style={{ padding: 20, color: '#94a3b8', fontSize: 14 }}>No knowledge documents in the BUFM → KMT approval path yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Document ID', 'Title', 'Status', 'Updated', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#5c7185', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #dce6f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentKnowledgeApprovals.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{d.id}</td>
                    <td style={{ padding: '12px 16px' }}>{d.sub || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{d.status === 'approved' ? 'Final approved' : 'Pending KMT'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{d.updated || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => navigate(`/bufm/document/${encodeURIComponent(d.id)}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #dce6f0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px', borderBottom: '1px solid #dce6f0' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c' }}>Active Service Routes</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#fef3e7', color: '#ca6c14', border: '1px solid #f5cba7' }}>Today</span>
            <div style={{ flex: 1 }} />
            <button style={{ background: 'none', border: '1.5px solid #dce6f0', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: '#5c7185' }}>Export</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Route ID','Team','Zone','Pickups','Progress','Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#5c7185', textTransform: 'uppercase', letterSpacing: .4, background: '#f8fafc', borderBottom: '1px solid #dce6f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROUTES.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '13px 16px', fontSize: 13.5, color: '#1a2b3c' }}>{r.id}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13.5, color: '#1a2b3c' }}>{r.team}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13.5, color: '#1a2b3c' }}>{r.zone}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13.5, color: '#1a2b3c' }}>{r.pickups}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ background: '#dce6f0', borderRadius: 10, height: 6, width: 120 }}>
                        <div style={{ background: r.color, height: '100%', width: `${r.pct}%`, borderRadius: 10 }} />
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20, display: 'inline-block', ...STATUS_STYLES[r.status] }}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </Layout>
  )
}

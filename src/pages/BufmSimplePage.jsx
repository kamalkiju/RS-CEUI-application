import Layout from '../components/Layout.jsx'

export default function BufmSimplePage({ title }) {
  return (
    <Layout>
      <div style={{ padding: '28px 24px', flex: 1 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a2b3c', marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: 14, color: '#64748b' }}>BUFM POC — placeholder screen.</p>
      </div>
    </Layout>
  )
}

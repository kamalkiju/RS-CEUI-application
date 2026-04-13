import { useNavigate } from 'react-router-dom'

export default function CeuiComingSoon() {
  const navigate = useNavigate()

  return (
    <main className="rsaui-role-select-page">
      <div className="rsaui-role-select-shell">
        <h1>CEUI</h1>
        <p>Customer Experience UI is coming soon.</p>
        <small>Service-area workflows live under POC → Create service area in the unified CEUI app.</small>
        <div className="rsaui-role-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Back</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>Open CEUI Login</button>
        </div>
      </div>
    </main>
  )
}

import { useNavigate } from 'react-router-dom'
import RsAppBrand from '../../components/RsAppBrand.jsx'

export default function ApplicationSelector() {
  const navigate = useNavigate()

  return (
    <main className="app-select-page app-select-page--unified">
      <div className="app-select-shell app-select-shell--unified">
        <div className="app-select-hero">
          <RsAppBrand appLabel="CEUI" variant="selector" />
          <h1>Republic Services workspace</h1>
          <p>Knowledge documents, service-area workflows, BUFM review, and KMT publishing — one login.</p>
        </div>
        <button
          type="button"
          className="app-select-cta btn btn-primary"
          onClick={() => navigate('/login')}
        >
          Continue to sign in
        </button>
      </div>
    </main>
  )
}

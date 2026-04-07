import { useNavigate } from 'react-router-dom'

const APPS = [
  {
    id: 'CEUI',
    icon: '🏢',
    title: 'CEUI',
    subtitle: 'Customer Experience UI',
    description: 'Manage customer accounts, service requests and billing operations',
    badge: 'Customer Portal',
    to: '/ceui/login',
  },
  {
    id: 'RSAUI',
    icon: '🗺️',
    title: 'RSAUI',
    subtitle: 'Residential Service Area UI',
    description: 'Create and manage service area requests, product configurations and approval workflows',
    badge: 'Service Area Management',
    to: '/rsaui/login',
  },
]

export default function ApplicationSelector() {
  const navigate = useNavigate()

  return (
    <main className="app-select-page">
      <div className="app-select-shell">
        <h1>Select Your Application</h1>
        <p>Choose the platform you want to access</p>
        <div className="app-select-grid">
          {APPS.map(app => (
            <button
              key={app.id}
              type="button"
              className="app-select-card"
              onClick={() => navigate(app.to)}
            >
              <div className="app-select-card__icon" aria-hidden>{app.icon}</div>
              <div className="app-select-card__title-row">
                <h2>{app.title}</h2>
                <span>{app.badge}</span>
              </div>
              <h3>{app.subtitle}</h3>
              <p>{app.description}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

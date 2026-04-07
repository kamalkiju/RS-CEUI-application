import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const RSAUI_HOME = {
  POC: '/rsaui/poc/document-review',
  BUFM: '/rsaui/bufm/dashboard',
  KMT: '/rsaui/kmt/dashboard',
}

/** Demo credentials — prefilled; user can change role in dropdown before Sign In. */
const DEMO_EMAIL = 'john.doe@republicservices.com'
const DEMO_PASSWORD = 'demo123456'

const QUICK_USERS = [
  { name: 'John Doe', email: 'john.doe@republicservices.com', role: 'POC' },
  { name: 'Jane Wilson', email: 'jane.wilson@republicservices.com', role: 'BUFM' },
  { name: 'Maria Lopez', email: 'maria.lopez@republicservices.com', role: 'KMT' },
]

function inferName(email) {
  if (!email) return 'RSAUI User'
  return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function RsauiLogin() {
  const navigate = useNavigate()
  const { login, user } = useAuth()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [role, setRole] = useState('POC')
  const [error, setError] = useState('')

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email])

  useEffect(() => {
    if (user?.app === 'RSAUI' && user?.role && RSAUI_HOME[user.role]) {
      navigate(RSAUI_HOME[user.role], { replace: true })
    }
  }, [user?.app, user?.role, navigate])

  const signInWith = ({ email: em, name, role: r }) => {
    const normalizedEmail = (em || email).trim()
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address')
      return
    }
    if (!r) {
      setError('Please select a role')
      return
    }
    setError('')
    login({
      app: 'RSAUI',
      email: normalizedEmail,
      name: name || inferName(normalizedEmail),
      role: r,
    })
    navigate(RSAUI_HOME[r])
  }

  const submit = e => {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError('Email address is required')
    if (!emailValid) return setError('Enter a valid email address')
    if (!password.trim()) return setError('Password is required')
    if (!role) return setError('Please select a role')
    signInWith({ email, name: inferName(email.trim()), role })
  }

  return (
    <div className="rsaui-login-page">
      <div className="rsaui-login-left">
        <div className="rsaui-login-brand">RSAUI</div>
        <h1>Residential Service Area Workspace</h1>
        <p>Build, review, and govern service area requests across POC, BUFM and KMT workflows.</p>
        <ul>
          <li><strong>POC Workflow</strong> - Create and configure service area requests</li>
          <li><strong>BUFM Review</strong> - Priority-based queue with SLA tracking</li>
          <li><strong>KMT Governance</strong> - System-wide monitoring and lifecycle management</li>
        </ul>
      </div>

      <div className="rsaui-login-right">
        <button type="button" className="rsaui-back-link" onClick={() => navigate('/')}>← Back</button>
        <div className="rsaui-login-card">
          <h2>Sign In to RSAUI</h2>
          <p>Access your workspace</p>

          <section className="rsaui-quick-login">
            <span>QUICK LOGIN — SELECT USER</span>
            {QUICK_USERS.map(u => (
              <button
                key={u.email}
                type="button"
                onClick={() => {
                  setEmail(u.email)
                  setPassword(DEMO_PASSWORD)
                  setRole(u.role)
                  signInWith({ email: u.email, name: u.name, role: u.role })
                }}
              >
                <strong>{u.name}</strong>
                <small>{u.email}</small>
                <em>{u.role}</em>
              </button>
            ))}
          </section>

          {error && <div className="rsaui-auth-error">{error}</div>}

          <form onSubmit={submit}>
            <label>
              Email Address
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
            <label>
              Role
              <select value={role} onChange={e => setRole(e.target.value)} className="rsaui-login-role-select">
                <option value="">— Select role —</option>
                <option value="POC">POC — Request Creator &amp; Configurator</option>
                <option value="BUFM">BUFM — Business Reviewer &amp; Approver</option>
                <option value="KMT">KMT — Governance &amp; Monitor</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary">Sign In</button>
          </form>
        </div>
      </div>
    </div>
  )
}

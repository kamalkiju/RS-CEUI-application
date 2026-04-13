import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import RsAppBrand from '../../components/RsAppBrand.jsx'

/** Unified CEUI role landing (same as main Login). Kept for legacy imports. */
const CEUI_HOME = {
  POC: '/poc',
  BUFM: '/bufm',
  KMT: '/kmt',
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
  if (!email) return 'User'
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
    if (user?.role && CEUI_HOME[user.role]) {
      navigate(CEUI_HOME[user.role], { replace: true })
    }
  }, [user?.role, navigate])

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
      app: 'CEUI',
      email: normalizedEmail,
      name: name || inferName(normalizedEmail),
      role: r,
    })
    navigate(CEUI_HOME[r])
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
        <div className="rsaui-login-brand">
          <RsAppBrand appLabel="CEUI" variant="login" />
        </div>
        <h1>Republic Services workspace</h1>
        <p>Knowledge documents and service-area workflows — POC, BUFM, and KMT in one application.</p>
        <ul>
          <li><strong>POC</strong> — Knowledge documents and service-area requests</li>
          <li><strong>BUFM</strong> — Field review and dual-stream queues</li>
          <li><strong>KMT</strong> — Templates, publishing, and governance</li>
        </ul>
      </div>

      <div className="rsaui-login-right">
        <button type="button" className="rsaui-back-link" onClick={() => navigate('/')}>← Back</button>
        <div className="rsaui-login-card">
          <h2>Sign in</h2>
          <p>Same account as the main CEUI login</p>

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
                <option value="POC">POC — Point of Contact</option>
                <option value="BUFM">BUFM — Business Unit Field Manager</option>
                <option value="KMT">KMT — Knowledge Management Team</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary">Sign In</button>
          </form>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import RsAppBrand from '../components/RsAppBrand.jsx'

const ROLE_CONFIG = {
  POC: {
    color: '#1976d2',
    desc: 'Access to Knowledge Documents, contract management and approvals',
    path: '/poc',
  },
  BUFM: {
    color: '#e67e22',
    desc: 'Access to field operations, reporting and team oversight',
    path: '/bufm',
  },
  KMT: {
    color: '#27ae60',
    desc: 'Access to knowledge base management, analytics and publishing',
    path: '/kmt',
  },
}

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.role) return
    if (ROLE_CONFIG[user.role]) {
      navigate(ROLE_CONFIG[user.role].path, { replace: true })
    }
  }, [user, navigate])

  const [email, setEmail] = useState('demo.user@republicservices.com')
  const [password, setPassword] = useState('demo123456')
  const [role, setRole] = useState('POC')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [alertError, setAlertError] = useState('')

  const validate = () => {
    const e = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Please enter a valid email address.'
    if (password.length < 6) e.password = 'Password must be at least 6 characters.'
    if (!role) e.role = 'Please select a role to continue.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = e => {
    e?.preventDefault()
    setAlertError('')
    if (!validate()) return

    setLoading(true)
    setTimeout(() => {
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      login({ email: email.trim(), role, name, app: 'CEUI' })
      navigate(ROLE_CONFIG[role].path)
    }, 1200)
  }

  const roleCfg = role && ROLE_CONFIG[role]

  const featureCards = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      title: 'Knowledge Documents',
      sub: 'CEUI contracts, templates, and BUFM/KMT knowledge reviews',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M18 17V9M13 17V5M8 17v-3" />
        </svg>
      ),
      title: 'Service-area (RSAUI) workflows',
      sub: 'Create, review, and publish residential service-area requests in one workspace',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
      title: 'Role-based access',
      sub: 'POC, BUFM & KMT tailored dashboards — dual CEUI / RSAUI queues where needed',
    },
  ]

  return (
    <div className="login-split">
      <div className="login-split__brand">
        <style>{`
          .login-split { display: flex; min-height: 100vh; width: 100%; background: #f0f4f8; }
          .login-split__brand {
            width: 44%; min-height: 100vh;
            background: linear-gradient(160deg, #1b3a5c 0%, #0d2137 60%, #091829 100%);
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            padding: 56px 44px; position: relative; overflow: hidden;
          }
          .login-split__brand::before {
            content: ''; position: absolute; width: 420px; height: 420px; border-radius: 50%;
            border: 60px solid rgba(255,255,255,.04); top: -100px; left: -100px;
          }
          .login-split__brand::after {
            content: ''; position: absolute; width: 300px; height: 300px; border-radius: 50%;
            border: 40px solid rgba(255,255,255,.04); bottom: -80px; right: -80px;
          }
          .login-split__brand-inner { position: relative; z-index: 1; max-width: 400px; text-align: center; }
          .login-split__brand-inner .rs-app-brand-wrap { justify-content: center; margin-bottom: 40px; }
          .login-split__brand h1 {
            font-size: 26px; font-weight: 700; color: #fff; line-height: 1.35; margin: 0 0 14px;
          }
          .login-split__brand > .login-split__brand-inner > p {
            font-size: 15px; color: rgba(168,196,223,.88); line-height: 1.65; margin: 0 0 40px;
          }
          .login-split__cards { display: flex; flex-direction: column; gap: 14px; text-align: left; }
          .login-split__card {
            display: flex; align-items: flex-start; gap: 14px;
            background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08);
            border-radius: 10px; padding: 14px 16px;
          }
          .login-split__card-icon {
            width: 38px; height: 38px; border-radius: 10px; background: rgba(25,118,210,.25);
            display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #4ab3f4;
          }
          .login-split__card strong { display: block; color: #fff; font-size: 13.5px; margin-bottom: 3px; }
          .login-split__card span { color: rgba(168,196,223,.78); font-size: 12px; line-height: 1.45; }
          .login-split__form-panel {
            flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 28px;
          }
          .login-split__card-box {
            background: #fff; border-radius: 18px; box-shadow: 0 8px 40px rgba(0,0,0,.10);
            padding: 44px 40px; width: 100%; max-width: 440px;
          }
          .login-split__card-box h2 { font-size: 26px; font-weight: 800; color: #1a2b3c; margin: 0 0 6px; }
          .login-split__card-box > p { font-size: 14px; color: #5c7185; margin: 0 0 32px; }
          .login-split__field { margin-bottom: 18px; }
          .login-split__field label { display: block; font-size: 13px; font-weight: 600; color: #5c7185; margin-bottom: 6px; }
          .login-split__input-wrap { position: relative; display: flex; align-items: center; }
          .login-split__input-wrap .login-split__icon-left {
            position: absolute; left: 13px; color: #b0bec5; display: flex; pointer-events: none;
          }
          .login-split__input {
            width: 100%; padding: 11px 14px 11px 40px; border: 1.5px solid #dce6f0; border-radius: 10px;
            font-size: 14px; color: #1a2b3c; font-family: inherit; outline: none;
          }
          .login-split__input:focus { border-color: #1976d2; box-shadow: 0 0 0 3px rgba(25,118,210,.12); }
          .login-split__input--err { border-color: #e74c3c; }
          .login-split__pw-btn {
            position: absolute; right: 10px; background: none; border: none; cursor: pointer; color: #b0bec5; padding: 6px;
          }
          .login-split__select-wrap .login-split__input { padding-right: 36px; appearance: none; cursor: pointer; }
          .login-split__select-wrap::after {
            content: ''; position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
            border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #b0bec5;
            pointer-events: none;
          }
          .login-split__role-hint { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12.5px; color: #5c7185; }
          .login-split__role-dot { width: 8px; height: 8px; border-radius: 50%; }
          .login-split__row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 26px; font-size: 13px; color: #5c7185; }
          .login-split__row a { color: #1976d2; text-decoration: none; font-weight: 500; }
          .login-split__submit {
            width: 100%; padding: 13px; border: none; border-radius: 10px; font-size: 15px; font-weight: 700;
            cursor: pointer; font-family: inherit;
            background: linear-gradient(135deg, #1976d2, #1256a3); color: #fff;
            box-shadow: 0 4px 14px rgba(25,118,210,.35);
            display: flex; align-items: center; justify-content: center; gap: 8px;
          }
          .login-split__submit:disabled { opacity: .7; cursor: not-allowed; }
          .login-split__footer { text-align: center; font-size: 12.5px; color: #5c7185; margin-top: 22px; }
          .login-split__footer a { color: #1976d2; text-decoration: none; font-weight: 500; }
          .login-split__err { font-size: 12px; color: #e74c3c; margin-top: 4px; }
          .login-split__alert {
            border-radius: 8px; padding: 12px 16px; font-size: 13px; margin-bottom: 18px;
            background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
          }
          @keyframes login-spin { to { transform: rotate(360deg); } }
          .login-split__spinner {
            width: 17px; height: 17px; border: 2.5px solid rgba(255,255,255,.4); border-top-color: #fff;
            border-radius: 50%; animation: login-spin .7s linear infinite;
          }
          @media (max-width: 900px) {
            .login-split { flex-direction: column; }
            .login-split__brand { width: 100%; min-height: auto; padding: 40px 24px; }
            .login-split__form-panel { padding: 32px 20px 48px; }
          }
        `}</style>

        <div className="login-split__brand-inner">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RsAppBrand appLabel="CEUI" variant="login-hero" />
          </div>
          <h1>Contract &amp; Knowledge Management Portal</h1>
          <p>
            Streamline CEUI knowledge documents <strong style={{ color: '#e2e8f0' }}>and</strong> RSAUI service-area workflows —
            reports, dual review queues, and team oversight in one login.
          </p>
          <div className="login-split__cards">
            {featureCards.map(c => (
              <div key={c.title} className="login-split__card">
                <div className="login-split__card-icon">{c.icon}</div>
                <div>
                  <strong>{c.title}</strong>
                  <span>{c.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-split__form-panel">
        <div className="login-split__card-box">
          <h2>Welcome back</h2>
          <p>Sign in to your CEUI account to continue</p>

          {alertError && <div className="login-split__alert" role="alert">{alertError}</div>}

          <form onSubmit={handleLogin} noValidate>
            <div className="login-split__field">
              <label htmlFor="login-email">Email Address</label>
              <div className="login-split__input-wrap">
                <span className="login-split__icon-left" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                </span>
                <input
                  id="login-email"
                  className={`login-split__input${errors.email ? ' login-split__input--err' : ''}`}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
                  placeholder="demo.user@republicservices.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <div className="login-split__err">{errors.email}</div>}
            </div>

            <div className="login-split__field">
              <label htmlFor="login-pw">Password</label>
              <div className="login-split__input-wrap">
                <span className="login-split__icon-left" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                <input
                  id="login-pw"
                  className={`login-split__input${errors.password ? ' login-split__input--err' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                  autoComplete="current-password"
                />
                <button type="button" className="login-split__pw-btn" onClick={() => setShowPw(p => !p)} aria-label="Toggle password">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
              </div>
              {errors.password && <div className="login-split__err">{errors.password}</div>}
            </div>

            <div className="login-split__field">
              <label htmlFor="login-role">Select Your Role</label>
              <div className="login-split__input-wrap login-split__select-wrap">
                <span className="login-split__icon-left" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </span>
                <select
                  id="login-role"
                  className={`login-split__input${errors.role ? ' login-split__input--err' : ''}`}
                  value={role}
                  onChange={e => { setRole(e.target.value); setErrors(p => ({ ...p, role: '' })) }}
                >
                  <option value="">-- Select a role --</option>
                  <option value="POC">POC – Point of Contact</option>
                  <option value="BUFM">BUFM – Business Unit Field Manager</option>
                  <option value="KMT">KMT – Knowledge Management Team</option>
                </select>
              </div>
              {roleCfg && (
                <div className="login-split__role-hint">
                  <span className="login-split__role-dot" style={{ background: roleCfg.color }} />
                  {roleCfg.desc}
                </div>
              )}
              {errors.role && <div className="login-split__err">{errors.role}</div>}
            </div>

            <div className="login-split__row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#1976d2' }} />
                Remember me
              </label>
              <a href="#" onClick={e => e.preventDefault()}>Forgot password?</a>
            </div>

            <button type="submit" className="login-split__submit" disabled={loading}>
              {loading ? <span className="login-split__spinner" /> : (
                <>
                  Sign In
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </>
              )}
            </button>
          </form>

          <p className="login-split__footer">
            Need help? <a href="mailto:support@ceui.com">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  )
}

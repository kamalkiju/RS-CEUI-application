import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import RsAppBrand from '../components/RsAppBrand.jsx'

const ROLE_CONFIG = {
  POC: { color: '#1976d2', desc: 'Knowledge documents, document review, and service-area workflows', path: '/poc' },
  BUFM: { color: '#e67e22', desc: 'Field operations, dual-stream document review, and team oversight', path: '/bufm' },
  KMT: { color: '#27ae60', desc: 'Templates, publishing, analytics, and combined review queues', path: '/kmt' },
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

  const handleLogin = (e) => {
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

  return (
    <div className="login-page-ceui">
      <div className="login-page-ceui__backdrop" aria-hidden />
      <div className="login-page-ceui__card">
        <div className="login-page-ceui__brand">
          <RsAppBrand appLabel="CEUI" variant="login-hero" />
        </div>
        <h1 className="login-page-ceui__title">Sign in</h1>
        <p className="login-page-ceui__lead">Contract and knowledge management — one workspace for POC, BUFM, and KMT.</p>

        {alertError && (
          <div className="login-page-ceui__alert" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {alertError}
          </div>
        )}

        <form className="login-page-ceui__form" onSubmit={handleLogin} noValidate>
          <label className="login-page-ceui__field">
            <span className="login-page-ceui__label">Email</span>
            <div className="login-page-ceui__input-wrap">
              <span className="login-page-ceui__input-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
                placeholder="you@example.com"
                autoComplete="email"
                className={errors.email ? 'login-page-ceui__input login-page-ceui__input--error' : 'login-page-ceui__input'}
              />
            </div>
            {errors.email && <span className="login-page-ceui__error">{errors.email}</span>}
          </label>

          <label className="login-page-ceui__field">
            <span className="login-page-ceui__label">Password</span>
            <div className="login-page-ceui__input-wrap">
              <span className="login-page-ceui__input-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={errors.password ? 'login-page-ceui__input login-page-ceui__input--error' : 'login-page-ceui__input'}
              />
              <button type="button" className="login-page-ceui__pw-toggle" onClick={() => setShowPw(p => !p)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="login-page-ceui__error">{errors.password}</span>}
          </label>

          <label className="login-page-ceui__field">
            <span className="login-page-ceui__label">Role</span>
            <div className="login-page-ceui__input-wrap login-page-ceui__input-wrap--select">
              <span className="login-page-ceui__input-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <select
                value={role}
                onChange={e => { setRole(e.target.value); setErrors(p => ({ ...p, role: '' })) }}
                className={errors.role ? 'login-page-ceui__input login-page-ceui__input--error' : 'login-page-ceui__input'}
              >
                <option value="">Select a role</option>
                <option value="POC">POC — Point of Contact</option>
                <option value="BUFM">BUFM — Business Unit Field Manager</option>
                <option value="KMT">KMT — Knowledge Management Team</option>
              </select>
            </div>
            {roleCfg && (
              <span className="login-page-ceui__role-hint">
                <span className="login-page-ceui__role-dot" style={{ background: roleCfg.color }} />
                {roleCfg.desc}
              </span>
            )}
            {errors.role && <span className="login-page-ceui__error">{errors.role}</span>}
          </label>

          <div className="login-page-ceui__row">
            <label className="login-page-ceui__remember">
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#" className="login-page-ceui__link" onClick={e => e.preventDefault()}>Forgot password?</a>
          </div>

          <button type="submit" className="login-page-ceui__submit btn btn-primary" disabled={loading}>
            {loading ? <span className="login-page-ceui__spinner" aria-hidden /> : 'Sign in'}
          </button>
        </form>

        <p className="login-page-ceui__footer">
          Need help? <a href="mailto:support@ceui.com" className="login-page-ceui__link">Contact support</a>
        </p>
      </div>

      <style>{`
        @keyframes login-spin { to { transform: rotate(360deg); } }
        .login-page-ceui {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          position: relative;
          background: #f4f7fb;
        }
        .login-page-ceui__backdrop {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(25, 118, 210, 0.12), transparent),
            radial-gradient(ellipse 60% 40% at 100% 100%, rgba(39, 174, 96, 0.08), transparent);
          pointer-events: none;
        }
        .login-page-ceui__card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 12px 48px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset;
          border: 1px solid rgba(226, 232, 240, 0.9);
          padding: 40px 36px 32px;
        }
        .login-page-ceui__brand { display: flex; justify-content: center; margin-bottom: 24px; }
        .login-page-ceui__title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 8px; text-align: center; }
        .login-page-ceui__lead { font-size: 0.9rem; color: #64748b; margin: 0 0 28px; text-align: center; line-height: 1.5; }
        .login-page-ceui__alert {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 10px; margin-bottom: 20px;
          background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 13px;
        }
        .login-page-ceui__form { display: flex; flex-direction: column; gap: 18px; }
        .login-page-ceui__field { display: flex; flex-direction: column; gap: 6px; }
        .login-page-ceui__label { font-size: 13px; font-weight: 600; color: #475569; }
        .login-page-ceui__input-wrap {
          position: relative; display: flex; align-items: center;
        }
        .login-page-ceui__input-icon {
          position: absolute; left: 12px; color: #94a3b8; display: flex; pointer-events: none;
        }
        .login-page-ceui__input {
          width: 100%; padding: 11px 14px 11px 40px; border: 1.5px solid #e2e8f0;
          border-radius: 10px; font-size: 14px; color: #0f172a; font-family: inherit; background: #fff;
        }
        .login-page-ceui__input:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.15); }
        .login-page-ceui__input--error { border-color: #e74c3c; }
        .login-page-ceui__input-wrap--select .login-page-ceui__input {
          appearance: none; cursor: pointer; padding-right: 36px;
        }
        .login-page-ceui__input-wrap--select::after {
          content: ''; position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent;
          border-top: 6px solid #94a3b8; pointer-events: none;
        }
        .login-page-ceui__pw-toggle {
          position: absolute; right: 8px; background: none; border: none; cursor: pointer;
          color: #94a3b8; padding: 6px; display: flex; border-radius: 6px;
        }
        .login-page-ceui__pw-toggle:hover { color: #64748b; background: #f1f5f9; }
        .login-page-ceui__error { font-size: 12px; color: #e74c3c; }
        .login-page-ceui__role-hint { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b; margin-top: 2px; }
        .login-page-ceui__role-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .login-page-ceui__row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #64748b; }
        .login-page-ceui__remember { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .login-page-ceui__link { color: #1976d2; text-decoration: none; font-weight: 500; }
        .login-page-ceui__link:hover { text-decoration: underline; }
        .login-page-ceui__submit { width: 100%; padding: 13px; font-size: 15px; font-weight: 700; margin-top: 4px; }
        .login-page-ceui__spinner {
          width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,.35); border-top-color: #fff;
          border-radius: 50%; animation: login-spin 0.7s linear infinite; display: inline-block;
        }
        .login-page-ceui__footer { text-align: center; font-size: 12.5px; color: #64748b; margin: 24px 0 0; }
      `}</style>
    </div>
  )
}

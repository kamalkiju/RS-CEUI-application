import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const IT_HOME = '/it/documents'

/** Demo defaults — single IT operator account (no role selection). */
const DEFAULT_EMAIL = 'it.admin@republicservices.com'
const DEFAULT_PASSWORD = 'itdemo123'

export default function ItLogin() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.app === 'IT' && user?.role === 'IT') {
      navigate(IT_HOME, { replace: true })
    }
  }, [user, navigate])

  const [email, setEmail] = useState(DEFAULT_EMAIL)
  const [password, setPassword] = useState(DEFAULT_PASSWORD)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [alertError, setAlertError] = useState('')

  const validate = () => {
    const e = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Please enter a valid email address.'
    if (password.length < 6) e.password = 'Password must be at least 6 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = e => {
    e?.preventDefault()
    setAlertError('')
    if (!validate()) return

    setLoading(true)
    setTimeout(() => {
      login({
        email: email.trim(),
        role: 'IT',
        name: 'IT Administrator',
        app: 'IT',
      })
      navigate(IT_HOME)
      setLoading(false)
    }, 600)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#f0f4f8' }}>
      <div
        className="brand-panel"
        style={{
          width: '45%',
          background: 'linear-gradient(160deg, #1e3d52 0%, #0f2538 60%, #0a1824 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <style>{`
          .brand-panel::before { content:''; position:absolute; width:420px; height:420px; border-radius:50%; border:60px solid rgba(255,255,255,.04); top:-100px; left:-100px; }
          .brand-panel::after { content:''; position:absolute; width:300px; height:300px; border-radius:50%; border:40px solid rgba(255,255,255,.04); bottom:-80px; right:-80px; }
          @media(max-width:860px) { .brand-panel { display: none !important; } }
        `}</style>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div
              style={{
                width: 52,
                height: 52,
                background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(13,148,136,.4)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <span style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>IT Team</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
            Operations &amp; template tooling
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(168,196,223,.85)', lineHeight: 1.6 }}>
            Manage document templates, publishing, and platform settings for CEUI and RSAUI.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 8px 40px rgba(0,0,0,.10)',
            padding: '48px 44px',
            width: '100%',
            maxWidth: 440,
          }}
        >
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1a2b3c', marginBottom: 6 }}>IT sign in</h2>
          <p style={{ fontSize: 14, color: '#5c7185', marginBottom: 36 }}>Use the demo credentials below to continue</p>

          {alertError && (
            <div
              style={{
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 13,
                marginBottom: 20,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
              }}
            >
              {alertError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#334155' }}>Email</label>
            <input
              type="email"
              className="kmt-input"
              style={{ width: '100%', marginBottom: 16, padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
            />
            {errors.email && <p style={{ color: '#b91c1c', fontSize: 12, marginTop: -12, marginBottom: 12 }}>{errors.email}</p>}

            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#334155' }}>Password</label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="kmt-input"
                style={{ width: '100%', padding: '12px 14px', paddingRight: 44, borderRadius: 10, border: '1px solid #e2e8f0' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: 12,
                }}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <p style={{ color: '#b91c1c', fontSize: 12, marginTop: -12, marginBottom: 12 }}>{errors.password}</p>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, marginTop: 8 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            Demo account — prefilled username and password for prototype use only.
          </p>
        </div>
      </div>
    </div>
  )
}

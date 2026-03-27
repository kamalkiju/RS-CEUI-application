import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const ROLE_CONFIG = {
  POC:  { color: '#1976d2', desc: 'Access to Knowledge Documents, contract management and approvals', path: '/poc' },
  BUFM: { color: '#e67e22', desc: 'Access to field operations, reporting and team oversight', path: '/bufm' },
  KMT:  { color: '#27ae60', desc: 'Access to knowledge base management, analytics and publishing', path: '/kmt' },
}

const RSAUI_ROLE_HOME = {
  POC: '/rsaui/poc/dashboard',
  BUFM: '/rsaui/bufm/dashboard',
  KMT: '/rsaui/kmt/dashboard',
}

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.role) return
    if (user.app === 'RSAUI' && RSAUI_ROLE_HOME[user.role]) {
      navigate(RSAUI_ROLE_HOME[user.role], { replace: true })
      return
    }
    if (ROLE_CONFIG[user.role]) {
      navigate(ROLE_CONFIG[user.role].path, { replace: true })
    }
  }, [user, navigate])

  /** Demo defaults — prefilled; change role in dropdown as needed. */
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
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#f0f4f8' }}>
      {/* ── Left brand panel ── */}
      <div className="brand-panel" style={{
        width: '45%', background: 'linear-gradient(160deg, #1b3a5c 0%, #0d2137 60%, #091829 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '60px 48px', position: 'relative', overflow: 'hidden'
      }}>
        <style>{`
          .brand-panel::before { content:''; position:absolute; width:420px; height:420px; border-radius:50%; border:60px solid rgba(255,255,255,.04); top:-100px; left:-100px; }
          .brand-panel::after { content:''; position:absolute; width:300px; height:300px; border-radius:50%; border:40px solid rgba(255,255,255,.04); bottom:-80px; right:-80px; }
          @media(max-width:860px) { .brand-panel { display: none !important; } }
        `}</style>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #1976d2, #4ab3f4)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(25,118,210,.4)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <span style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>CEUI</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>Contract &amp; Knowledge<br/>Management Portal</h1>
          <p style={{ fontSize: 15, color: 'rgba(168,196,223,.8)', lineHeight: 1.6, marginBottom: 52 }}>Streamline your residential services contracts, knowledge documents, and team workflows — all in one place.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>, title: 'Knowledge Documents', sub: 'Manage contracts and service agreements' },
              { icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></>, title: 'Reports & Analytics', sub: 'Track performance and contract metrics' },
              { icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>, title: 'Role-Based Access', sub: 'POC, BUFM & KMT tailored dashboards' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '14px 18px', textAlign: 'left' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(25,118,210,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#4ab3f4' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#fff', fontSize: 13.5, marginBottom: 2 }}>{item.title}</strong>
                  <span style={{ color: 'rgba(168,196,223,.75)', fontSize: 12 }}>{item.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 40px rgba(0,0,0,.10)', padding: '48px 44px', width: '100%', maxWidth: 440 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1a2b3c', marginBottom: 6 }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: '#5c7185', marginBottom: 36 }}>Sign in to your CEUI account to continue</p>

          {alertError && (
            <div style={{ borderRadius: 8, padding: '12px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {alertError}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5c7185', marginBottom: 6 }}>Email Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 13, color: '#b0bec5', display: 'flex', pointerEvents: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <input
                  type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email:''})) }}
                  placeholder="you@example.com" autoComplete="email"
                  style={{ width: '100%', padding: '11px 14px 11px 40px', border: `1.5px solid ${errors.email ? '#e74c3c' : '#dce6f0'}`, borderRadius: 10, fontSize: 14, color: '#1a2b3c', outline: 'none', fontFamily: 'inherit', boxShadow: errors.email ? '0 0 0 3px rgba(231,76,60,.10)' : 'none' }}
                />
              </div>
              {errors.email && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 5 }}>{errors.email}</div>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5c7185', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 13, color: '#b0bec5', display: 'flex', pointerEvents: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password:''})) }}
                  placeholder="Enter your password" autoComplete="current-password"
                  style={{ width: '100%', padding: '11px 40px 11px 40px', border: `1.5px solid ${errors.password ? '#e74c3c' : '#dce6f0'}`, borderRadius: 10, fontSize: 14, color: '#1a2b3c', outline: 'none', fontFamily: 'inherit' }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#b0bec5', display: 'flex', padding: 4 }}>
                  {showPw
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {errors.password && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 5 }}>{errors.password}</div>}
            </div>

            {/* Role */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5c7185', marginBottom: 6 }}>Select Your Role</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#b0bec5', display: 'flex', pointerEvents: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <select
                  value={role} onChange={e => { setRole(e.target.value); setErrors(p => ({...p, role:''})) }}
                  style={{ width: '100%', padding: '11px 14px 11px 40px', border: `1.5px solid ${errors.role ? '#e74c3c' : '#dce6f0'}`, borderRadius: 10, fontSize: 14, color: role ? '#1a2b3c' : '#94a3b8', background: '#fff', outline: 'none', fontFamily: 'inherit', appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">-- Select a role --</option>
                  <option value="POC">POC – Point of Contact</option>
                  <option value="BUFM">BUFM – Business Unit Field Manager</option>
                  <option value="KMT">KMT – Knowledge Management Team</option>
                </select>
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#b0bec5', pointerEvents: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              {roleCfg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5, color: '#5c7185' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: roleCfg.color, display: 'inline-block' }} />
                  {roleCfg.desc}
                </div>
              )}
              {errors.role && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 5 }}>{errors.role}</div>}
            </div>

            {/* Remember / Forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#5c7185', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#1976d2', width: 15, height: 15 }} />
                Remember me
              </label>
              <a href="#" style={{ fontSize: 13, color: '#1976d2', textDecoration: 'none', fontWeight: 500 }} onClick={e => e.preventDefault()}>Forgot password?</a>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: 13, background: 'linear-gradient(135deg, #1976d2, #1256a3)',
                color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(25,118,210,.35)', transition: 'all .2s',
                opacity: loading ? .7 : 1, fontFamily: 'inherit'
              }}
            >
              {loading ? (
                <span style={{ width: 17, height: 17, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
              ) : (
                <>
                  Sign In
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: 12.5, color: '#5c7185', marginTop: 24 }}>
            Need help? <a href="mailto:support@ceui.com" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 500 }}>Contact support</a>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

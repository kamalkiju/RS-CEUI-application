import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

function normalizeStoredUser(u) {
  if (!u || typeof u !== 'object') return u
  if (u.app === 'RSAUI') {
    return { ...u, app: 'CEUI' }
  }
  return u
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('ceui_user')
      const parsed = raw ? JSON.parse(raw) : null
      const n = normalizeStoredUser(parsed)
      if (n && n !== parsed) {
        sessionStorage.setItem('ceui_user', JSON.stringify(n))
      }
      return n
    } catch {
      return null
    }
  })
  const [pendingAuth, setPendingAuth] = useState(null)

  const login = (userData) => {
    const payload = normalizeStoredUser({ ...userData, app: 'CEUI' })
    sessionStorage.setItem('ceui_user', JSON.stringify(payload))
    setUser(payload)
    setPendingAuth(null)
  }

  const logout = () => {
    sessionStorage.removeItem('ceui_user')
    setUser(null)
    setPendingAuth(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, pendingAuth, setPendingAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

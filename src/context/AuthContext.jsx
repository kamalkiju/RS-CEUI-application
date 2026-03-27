import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('ceui_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [pendingAuth, setPendingAuth] = useState(null)

  const login = (userData) => {
    sessionStorage.setItem('ceui_user', JSON.stringify(userData))
    setUser(userData)
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

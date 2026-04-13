import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'

const STORAGE_KEY = 'ceui_kmt_directory_users'

const SEED_USERS = [
  { id: 'poc-user-1', name: 'Jordan Lee', role: 'POC', email: 'jordan.lee@republicservices.com', phone: '(555) 100-2001', region: 'Southeast', title: 'Knowledge Coordinator', workspace: 'CEUI' },
  { id: 'poc-user-2', name: 'Sam Rivera', role: 'POC', email: 'sam.rivera@republicservices.com', phone: '(555) 100-2002', region: 'Central Florida', title: 'Contract Specialist', workspace: 'CEUI' },
  { id: 'poc-user-3', name: 'Alex Morgan', role: 'POC', email: 'alex.morgan@republicservices.com', phone: '(555) 100-2003', region: 'Gulf Coast', title: 'Area Lead', workspace: 'CEUI' },
  { id: 'poc-user-4', name: 'Chris Park', role: 'POC', email: 'chris.park@republicservices.com', phone: '(555) 100-2004', region: 'Northeast', title: 'Operations Analyst', workspace: 'CEUI' },
  { id: 'poc-rsa-1', name: 'Pat Kim', role: 'POC', email: 'pat.kim@republicservices.com', phone: '(555) 100-2010', region: 'Southeast', title: 'Service Area Specialist', workspace: 'RSAUI' },
  { id: 'poc-rsa-2', name: 'Riley Nguyen', role: 'POC', email: 'riley.nguyen@republicservices.com', phone: '(555) 100-2011', region: 'West', title: 'RSA Workflow Lead', workspace: 'RSAUI' },
  { id: 'poc-rsa-3', name: 'Casey Wu', role: 'POC', email: 'casey.wu@republicservices.com', phone: '(555) 100-2012', region: 'Midwest', title: 'Field Configurator', workspace: 'RSAUI' },
  { id: 'bufm-user-1', name: 'Taylor Brooks', role: 'BUFM', email: 'taylor.brooks@republicservices.com', phone: '(555) 200-3001', region: 'Southeast', title: 'Field Operations Manager', workspace: 'CEUI' },
  { id: 'bufm-user-2', name: 'Riley Santos', role: 'BUFM', email: 'riley.santos@republicservices.com', phone: '(555) 200-3002', region: 'Central Florida', title: 'Regional BUFM', workspace: 'CEUI' },
  { id: 'bufm-user-3', name: 'Dana Ortiz', role: 'BUFM', email: 'dana.ortiz@republicservices.com', phone: '(555) 200-3003', region: 'West', title: 'BUFM Lead', workspace: 'CEUI' },
  { id: 'bufm-rsa-1', name: 'Morgan Ellis', role: 'BUFM', email: 'morgan.ellis@republicservices.com', phone: '(555) 200-3010', region: 'National', title: 'RSA Review Lead', workspace: 'RSAUI' },
  { id: 'bufm-rsa-2', name: 'Jamie Ford', role: 'BUFM', email: 'jamie.ford@republicservices.com', phone: '(555) 200-3011', region: 'Southeast', title: 'Service Area Reviewer', workspace: 'RSAUI' },
  { id: 'kmt-user-1', name: 'Morgan Chen', role: 'KMT', email: 'morgan.chen@republicservices.com', phone: '(555) 300-4001', region: 'National', title: 'Knowledge Management Lead', workspace: 'CEUI' },
  { id: 'kmt-user-2', name: 'Priya Nair', role: 'KMT', email: 'priya.nair@republicservices.com', phone: '(555) 300-4002', region: 'National', title: 'Content Approver', workspace: 'CEUI' },
  { id: 'kmt-user-3', name: 'James Okonkwo', role: 'KMT', email: 'james.okonkwo@republicservices.com', phone: '(555) 300-4003', region: 'National', title: 'Catalog Admin', workspace: 'CEUI' },
  { id: 'kmt-rsa-1', name: 'Sydney Blake', role: 'KMT', email: 'sydney.blake@republicservices.com', phone: '(555) 300-4010', region: 'National', title: 'RSA Publish Approver', workspace: 'RSAUI' },
  { id: 'kmt-rsa-2', name: 'Devon Hayes', role: 'KMT', email: 'devon.hayes@republicservices.com', phone: '(555) 300-4011', region: 'National', title: 'Service Catalog Editor', workspace: 'RSAUI' },
]

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map(u => ({ workspace: u.workspace || 'CEUI', ...u }))
    }
  } catch {
    /* ignore */
  }
  return null
}

const KmtUsersContext = createContext(null)

export function KmtUsersProvider({ children }) {
  const [users, setUsers] = useState(() => loadStored() || SEED_USERS)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  }, [users])

  const addUser = useCallback(row => {
    const id = row.id || `user-${Date.now()}`
    setUsers(prev => [{ workspace: row.workspace || 'CEUI', ...row, id }, ...prev])
    return id
  }, [])

  const updateUser = useCallback((id, patch) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)))
  }, [])

  const deleteUser = useCallback(id => {
    setUsers(prev => prev.filter(u => u.id !== id))
  }, [])

  const value = useMemo(
    () => ({ users, addUser, updateUser, deleteUser }),
    [users, addUser, updateUser, deleteUser],
  )

  return <KmtUsersContext.Provider value={value}>{children}</KmtUsersContext.Provider>
}

export function useKmtUsers() {
  const ctx = useContext(KmtUsersContext)
  if (!ctx) throw new Error('useKmtUsers must be used within KmtUsersProvider')
  return ctx
}

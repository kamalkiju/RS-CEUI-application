import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'

const READ_KEY = 'ceui_notifications_read'

function loadReadSet() {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

const POC_SEED = [
  {
    id: 'poc-1',
    role: 'POC',
    statusType: 'pending',
    title: 'New Document Assigned',
    message: 'You have been assigned to complete document "Commercial Waste Policy".',
    actor: 'System',
    documentName: 'Commercial Waste Policy',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    ctaAction: { label: 'Open Document', path: '/poc' },
  },
  {
    id: 'poc-2',
    role: 'POC',
    statusType: 'rejection',
    title: 'Document Rejected',
    message: 'BUFM rejected "Residential Service Contract". Please review comments and resubmit.',
    actor: 'Taylor Brooks (BUFM)',
    documentName: 'Residential Service Contract',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    isRead: false,
    ctaAction: { label: 'Edit Document', path: '/poc' },
  },
  {
    id: 'poc-3',
    role: 'POC',
    statusType: 'rejection',
    title: 'Final Approval Rejected',
    message: 'KMT rejected your document. Please update workflow.',
    actor: 'Morgan Chen (KMT)',
    documentName: 'Regional Pricing Guide',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
    ctaAction: { label: 'Edit Document', path: '/poc' },
  },
  {
    id: 'poc-4',
    role: 'POC',
    statusType: 'approval',
    title: 'Document Passed Level-1 Review',
    message: 'Your document has been approved by BUFM and sent to KMT.',
    actor: 'Taylor Brooks (BUFM)',
    documentName: 'City Annex Schedule',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    isRead: false,
    ctaAction: { label: 'View Status', path: '/poc' },
  },
  {
    id: 'poc-5',
    role: 'POC',
    statusType: 'publish',
    title: 'Document Published Successfully',
    message: 'Your document is now active in the system.',
    actor: 'Morgan Chen (KMT)',
    documentName: 'Holiday Collection Policy',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    isRead: true,
    ctaAction: { label: 'View Document', path: '/poc' },
  },
  {
    id: 'poc-6',
    role: 'POC',
    statusType: 'reminder',
    title: 'Completion Reminder',
    message: 'You must complete "Service Area Update" within 1 day.',
    actor: 'System',
    documentName: 'Service Area Update',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    isRead: false,
    ctaAction: { label: 'Open Task', path: '/poc' },
  },
]

const BUFM_SEED = [
  {
    id: 'bufm-1',
    role: 'BUFM',
    statusType: 'pending',
    title: 'New Document Pending Review',
    message: 'POC submitted "City Waste Policy".',
    actor: 'Jordan Lee (POC)',
    documentName: 'City Waste Policy',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    isRead: false,
    ctaAction: { label: 'Review Now', path: '/bufm/document-review/review' },
  },
  {
    id: 'bufm-2',
    role: 'BUFM',
    statusType: 'reminder',
    title: 'Review Deadline Approaching',
    message: 'Review "Bulk Pickup Rules" within today.',
    actor: 'System',
    documentName: 'Bulk Pickup Rules',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    ctaAction: { label: 'Open Review', path: '/bufm/document-review/review' },
  },
  {
    id: 'bufm-3',
    role: 'BUFM',
    statusType: 'approval',
    title: 'Document Updated',
    message: 'POC updated rejected document.',
    actor: 'Sam Rivera (POC)',
    documentName: 'Port Orange Contract',
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    isRead: true,
    ctaAction: { label: 'Review Again', path: '/bufm/document-review/review' },
  },
  {
    id: 'bufm-4',
    role: 'BUFM',
    statusType: 'publish',
    title: 'Document Final Status',
    message: 'KMT published "Recycling Standards".',
    actor: 'Morgan Chen (KMT)',
    documentName: 'Recycling Standards',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    isRead: true,
    ctaAction: { label: 'View Timeline', path: '/bufm/document-review/approved' },
  },
  {
    id: 'bufm-5',
    role: 'BUFM',
    statusType: 'delegation',
    title: 'Approval Delegated',
    message: 'KMT assigned review responsibility to you.',
    actor: 'Morgan Chen (KMT)',
    documentName: '—',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    isRead: false,
    ctaAction: { label: 'View Tasks', path: '/bufm' },
  },
]

const KMT_SEED = [
  {
    id: 'kmt-1',
    role: 'KMT',
    statusType: 'approval',
    title: 'Final Approval Required',
    message: 'BUFM approved "Commercial Policy".',
    actor: 'Taylor Brooks (BUFM)',
    documentName: 'Commercial Policy',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    isRead: false,
    ctaAction: { label: 'Open Approval', path: '/kmt/document-review/knowledge/review' },
  },
  {
    id: 'kmt-2',
    role: 'KMT',
    statusType: 'reminder',
    title: 'Final Approval Deadline',
    message: 'Approve document within 1 day.',
    actor: 'System',
    documentName: 'Metro Commercial Waste',
    timestamp: new Date(Date.now() - 4800000).toISOString(),
    isRead: false,
    ctaAction: { label: 'Open Document', path: '/kmt/document-review/knowledge/review' },
  },
  {
    id: 'kmt-3',
    role: 'KMT',
    statusType: 'rejection',
    title: 'Document Sent Back',
    message: 'You rejected "Service Pricing".',
    actor: 'You',
    documentName: 'Service Pricing',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    isRead: true,
    ctaAction: { label: 'View History', path: '/kmt/document-review/knowledge/rejected' },
  },
  {
    id: 'kmt-4',
    role: 'KMT',
    statusType: 'publish',
    title: 'Publishing Completed',
    message: 'Document is now live.',
    actor: 'System',
    documentName: 'Ocala Services',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    isRead: true,
    ctaAction: { label: 'View Document', path: '/kmt/document-review/knowledge/approved' },
  },
  {
    id: 'kmt-5',
    role: 'KMT',
    statusType: 'delegation',
    title: 'Delegation Ending Soon',
    message: 'Approval delegation expires tomorrow.',
    actor: 'System',
    documentName: '—',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    isRead: false,
    ctaAction: { label: 'Manage Delegation', path: '/kmt/delegations' },
  },
]

const ALL_SEED = [...POC_SEED, ...BUFM_SEED, ...KMT_SEED]

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [extra, setExtra] = useState([])
  const [readIds, setReadIds] = useState(loadReadSet)

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify([...readIds]))
  }, [readIds])

  const addNotification = useCallback(n => {
    const row = {
      id: `dyn-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      ...n,
    }
    setExtra(prev => [row, ...prev])
  }, [])

  const markRead = useCallback(id => {
    setReadIds(prev => new Set([...prev, id]))
  }, [])

  const markAllRead = useCallback(
    role => {
      setReadIds(prev => {
        const next = new Set(prev)
        ALL_SEED.filter(n => n.role === role).forEach(n => next.add(n.id))
        extra.filter(n => n.role === role).forEach(n => next.add(n.id))
        return next
      })
    },
    [extra],
  )

  const getNotificationsForRole = useCallback(
    role => {
      const seed = ALL_SEED.filter(n => n.role === role)
      const dyn = extra.filter(n => n.role === role)
      const merged = [...dyn, ...seed].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      return merged.map(n => ({
        ...n,
        isRead: readIds.has(n.id) || n.isRead,
      }))
    },
    [extra, readIds],
  )

  const unreadCountForRole = useCallback(
    role => getNotificationsForRole(role).filter(n => !n.isRead).length,
    [getNotificationsForRole],
  )

  const value = useMemo(
    () => ({
      getNotificationsForRole,
      unreadCountForRole,
      addNotification,
      markRead,
      markAllRead,
    }),
    [getNotificationsForRole, unreadCountForRole, addNotification, markRead, markAllRead],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const TODAY = new Date().toISOString().slice(0, 10)

/** Extra knowledge docs so KMT Reports tabs show full lists (~10+ per queue). */
function buildKmtReportSeedDocs() {
  return Array.from({ length: 10 }, (_, i) => {
    const statuses = ['Pending_KMT', 'approved', 'Rejected_KMT']
    const st = statuses[i % 3]
    const base = {
      id: `K-${5100 + i}`,
      sub: `DIV ${900 + i} — Demo Knowledge Queue ${i + 1}`,
      area: 'Florida, FL',
      market: 'Commercial',
      lob: 'Commercial',
      status: st,
      updated: '2024-03-22',
      submittedDate: '2024-03-15',
      tabs: ['all'],
      areas: [{ name: `Demo Area ${i + 1}`, id: String(1617000 + i), type: 'Resi Trash' }],
      createdByUserId: i % 2 === 0 ? 'poc-user-1' : 'poc-user-2',
      pocName: i % 2 === 0 ? 'Jordan Lee' : 'Sam Rivera',
      pocEmail: i % 2 === 0 ? 'jordan.lee@republicservices.com' : 'sam.rivera@republicservices.com',
      pocRegion: 'Southeast',
    }
    if (st === 'approved') {
      return {
        ...base,
        approved_by_BUFM: true,
        approved_by_KMT: true,
        bufmApproveDate: '2024-03-16',
        kmtApproveDate: '2024-03-20',
      }
    }
    if (st === 'Pending_KMT') {
      return {
        ...base,
        approved_by_BUFM: true,
        approved_by_KMT: false,
        bufmApproveDate: '2024-03-16',
      }
    }
    return {
      ...base,
      approved_by_BUFM: true,
      approved_by_KMT: false,
      bufmApproveDate: '2024-03-16',
      kmtRejectDate: '2024-03-21',
      rejection_comment_KMT: 'Demo rejection reason for KMT queue.',
    }
  })
}

const INITIAL_DOCS = [
  {
    id: 'K-5008',
    sub: 'DIV 190 MUNI – City of Ocala Services',
    area: 'Ocala, FL',
    market: 'Muni',
    lob: 'Municipal',
    version: 'V2.0',
    case_stage: 'Approved',
    status: 'approved',
    updated: '2024-02-20',
    submittedDate: '2024-02-10',
    approved_by_BUFM: true,
    approved_by_KMT: true,
    bufmApproveDate: '2024-02-12',
    kmtApproveDate: '2024-02-18',
    serviceAreasAutoPublished: true,
    tabs: ['all'],
    areas: [{ name: 'Muni - Ocala, FL - Area 1', id: '1616001', type: 'Resi Trash' }],
    createdByUserId: 'poc-user-1',
    pocName: 'Jordan Lee',
    pocEmail: 'jordan.lee@republicservices.com',
    pocRegion: 'Southeast',
  },
  {
    id: 'K-5013',
    sub: 'DIV 386 MUNI – City of Port Orange, FL',
    area: 'Port Orange, FL',
    market: 'Muni',
    lob: 'Municipal',
    version: 'V2.0',
    status: 'Rejected_BUFM',
    case_stage: 'Rejected_BUFM',
    completionPercent: 52,
    updated: '2024-03-03',
    submittedDate: '2024-02-25',
    bufmRejectDate: '2024-03-03',
    contractActivation: '2023-06-01',
    tabs: ['rejected-tasks', 'draft', 'all'],
    areas: [{ name: 'Muni - Port Orange, FL - Area 1', id: '1616386', type: 'Resi Trash' }],
    rejection_comment_BUFM:
      'Contract renewal dates and city ordinance effective dates are misaligned. Update Article 4 dates and resubmit.',
    rejection_highlight_sections: ['Fees', 'Knowledge Area'],
    rejection_highlight_fields: ['Contract effective date', 'City ordinance reference'],
    rejectionNote:
      'BUFM: Contract renewal dates and city ordinance effective dates are misaligned. Update Article 4 dates and resubmit.',
    createdByUserId: 'poc-user-1',
    pocName: 'Jordan Lee',
    pocEmail: 'jordan.lee@republicservices.com',
    pocRegion: 'Southeast',
    readOnlyWizard: {
      step1: {
        reviewNotes: 'Pending alignment with city legal review (March 2024).',
        servicingDivision: 'Port Orange, FL · Division 386',
        contracts: 'CNT-PO-2023-12 · Group MUNI-FL-386 — Municipal solid waste & recycling',
      },
      step4: {
        policy: 'Courtesy extra pickups capped at 2 until contract amendment is executed.',
      },
    },
  },
  {
    id: 'K-5019',
    sub: 'DIV 301 RES – Lake County Waste Management',
    area: 'Lake County, FL',
    market: 'Open',
    lob: 'Residential',
    status: 'Rejected_KMT',
    completionPercent: 48,
    updated: '2024-03-01',
    submittedDate: '2024-02-18',
    bufmApproveDate: '2024-02-22',
    kmtRejectDate: '2024-03-01',
    approved_by_BUFM: true,
    approved_by_KMT: false,
    tabs: ['rejected-tasks', 'all'],
    areas: [{ name: 'Open Market - Lake County, FL', id: '1616301', type: 'Resi Recycling' }],
    rejection_comment_KMT:
      'Recycling contamination language does not match current knowledge base standard KB-REC-2024. Revise acceptable / unacceptable notes.',
    rejectionNote:
      'KMT: Recycling contamination language does not match current knowledge base standard KB-REC-2024. Revise acceptable / unacceptable notes.',
    createdByUserId: 'poc-user-2',
    pocName: 'Sam Rivera',
    pocEmail: 'sam.rivera@republicservices.com',
    pocRegion: 'Central Florida',
    readOnlyWizard: {
      step2: {
        recycling:
          'Single-stream per division standard; plastic bags prohibited. Align wording with KB-REC-2024 template before resubmit.',
      },
      step5: {
        standard: 'Include Recycling Contamination Fee with updated threshold language from fee matrix v3.',
      },
    },
  },
  {
    id: 'K-5024',
    sub: 'DIV 412 MUNI – City of Gainesville, FL',
    area: 'Gainesville, FL',
    market: 'Muni',
    lob: 'Municipal',
    status: 'draft',
    completionPercent: 24,
    updated: '2024-03-10',
    submittedDate: '2024-03-08',
    tabs: ['draft', 'all'],
    areas: [{ name: 'Muni - Gainesville, FL - Area 1', id: '1616412', type: 'Resi Trash' }],
    createdByUserId: 'poc-user-1',
    pocName: 'Jordan Lee',
    pocEmail: 'jordan.lee@republicservices.com',
    pocRegion: 'Southeast',
  },
  {
    id: 'K-5031',
    sub: 'DIV 220 RES – Orange County Residential',
    area: 'Orange County, FL',
    market: 'Residential',
    lob: 'Residential',
    status: 'Pending_BUFM',
    updated: '2024-03-14',
    submittedDate: '2024-03-14',
    tabs: ['approval', 'all'],
    areas: [{ name: 'Open Market - Orange County, FL', id: '1616220', type: 'Resi Trash' }],
    createdByUserId: 'poc-user-1',
    pocName: 'Jordan Lee',
    pocEmail: 'jordan.lee@republicservices.com',
    pocRegion: 'Southeast',
  },
  {
    id: 'K-5040',
    sub: 'DIV 500 MUNI – Demo City Solid Waste',
    area: 'Demo City, FL',
    market: 'Muni',
    lob: 'Municipal',
    status: 'Pending_BUFM',
    updated: '2024-03-18',
    submittedDate: '2024-03-17',
    tabs: ['approval', 'all'],
    areas: [{ name: 'Muni - Demo City, FL - Area 2', id: '1616500', type: 'Resi Trash' }],
    createdByUserId: 'poc-user-2',
    pocName: 'Sam Rivera',
    pocEmail: 'sam.rivera@republicservices.com',
    pocRegion: 'Central Florida',
  },
  {
    id: 'K-5048',
    sub: 'DIV 410 COMM – Metro Commercial Waste',
    area: 'Metro, FL',
    market: 'Commercial',
    lob: 'Commercial',
    version: 'V1.0',
    case_stage: 'Pending_KMT',
    status: 'Pending_KMT',
    updated: '2024-03-19',
    submittedDate: '2024-03-12',
    approved_by_BUFM: true,
    approved_by_KMT: false,
    bufmApproveDate: '2024-03-15',
    tabs: ['approval', 'all'],
    areas: [{ name: 'Commercial - Metro, FL', id: '1616410', type: 'Comm Waste' }],
    createdByUserId: 'poc-user-1',
    pocName: 'Jordan Lee',
    pocEmail: 'jordan.lee@republicservices.com',
    pocRegion: 'Southeast',
  },
  {
    id: 'K-5051',
    sub: 'DIV 600 RES – Coastal County Recycling',
    area: 'Coastal, FL',
    market: 'Residential',
    lob: 'Residential',
    status: 'Pending_KMT',
    updated: '2024-03-20',
    submittedDate: '2024-03-11',
    approved_by_BUFM: true,
    approved_by_KMT: false,
    bufmApproveDate: '2024-03-14',
    tabs: ['approval', 'all'],
    areas: [{ name: 'Coastal County', id: '1616600', type: 'Resi Recycling' }],
    createdByUserId: 'poc-user-2',
    pocName: 'Sam Rivera',
    pocEmail: 'sam.rivera@republicservices.com',
    pocRegion: 'Central Florida',
  },
  {
    id: 'K-5052',
    sub: 'DIV 700 IND – Industrial Park Waste',
    area: 'Industrial Park, FL',
    market: 'Commercial',
    lob: 'Industrial',
    status: 'Pending_KMT',
    updated: '2024-03-21',
    submittedDate: '2024-03-16',
    approved_by_BUFM: true,
    approved_by_KMT: false,
    bufmApproveDate: '2024-03-18',
    tabs: ['approval', 'all'],
    areas: [{ name: 'Industrial Zone A', id: '1616700', type: 'Roll-off' }],
    createdByUserId: 'poc-user-1',
    pocName: 'Jordan Lee',
    pocEmail: 'jordan.lee@republicservices.com',
    pocRegion: 'Southeast',
  },
  {
    id: 'K-5055',
    sub: 'DIV 800 MUNI – County Landfill Ops',
    area: 'Inland County, FL',
    market: 'Muni',
    lob: 'Municipal',
    status: 'approved',
    updated: '2024-03-05',
    submittedDate: '2024-02-28',
    approved_by_BUFM: true,
    approved_by_KMT: true,
    bufmApproveDate: '2024-03-01',
    kmtApproveDate: '2024-03-04',
    tabs: ['all'],
    areas: [{ name: 'County Landfill', id: '1616800', type: 'MSW' }],
    createdByUserId: 'poc-user-2',
    pocName: 'Sam Rivera',
    pocEmail: 'sam.rivera@republicservices.com',
    pocRegion: 'Central Florida',
  },
  ...buildKmtReportSeedDocs(),
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `K-610${i}`,
    sub: `DIV ${880 + i} COMM – CEUI knowledge queue ${i + 1}`,
    area: `Metro Zone ${(i % 4) + 1}, FL`,
    market: i % 2 === 0 ? 'Commercial' : 'Residential',
    lob: i % 2 === 0 ? 'Commercial' : 'Residential',
    status: 'Pending_BUFM',
    updated: '2024-03-22',
    submittedDate: '2024-03-20',
    tabs: ['approval', 'all'],
    areas: [{ name: `Service Area ${i + 1}`, id: String(1617000 + i), type: 'Resi Trash' }],
    createdByUserId: `poc-user-${(i % 4) + 1}`,
    pocName: ['Jordan Lee', 'Sam Rivera', 'Alex Morgan', 'Chris Park'][i % 4],
    pocEmail: ['jordan.lee@republicservices.com', 'sam.rivera@republicservices.com', 'alex.morgan@republicservices.com', 'chris.park@republicservices.com'][i % 4],
    pocRegion: ['Southeast', 'Central Florida', 'Gulf Coast', 'Northeast'][i % 4],
  })),
]

const DocContext = createContext(null)

let docCounter = 5200

export function generateDocId() {
  return `K-${docCounter++}`
}

export function DocProvider({ children }) {
  const [docs, setDocs] = useState(INITIAL_DOCS)

  const addDoc = useCallback((doc) => {
    setDocs(prev => [{ ...doc, updated: TODAY }, ...prev])
  }, [])

  const updateDoc = useCallback((id, updates) => {
    setDocs(prev =>
      prev.map(d => (d.id === id ? { ...d, ...updates, updated: TODAY } : d)),
    )
  }, [])

  const removeDoc = useCallback((id) => {
    setDocs(prev => prev.filter(d => d.id !== id))
  }, [])

  const getDocumentById = useCallback((id) => docs.find(d => d.id === id), [docs])

  const listDocumentsByStatus = useCallback(
    (status) => docs.filter(d => d.status === status),
    [docs],
  )

  const listDocumentsByCreator = useCallback(
    (userId) => docs.filter(d => d.createdByUserId === userId),
    [docs],
  )

  const countDocumentsByUserId = useCallback(
    (userId) => docs.filter(d => d.createdByUserId === userId).length,
    [docs],
  )

  const value = useMemo(
    () => ({
      docs,
      addDoc,
      updateDoc,
      removeDoc,
      getDocumentById,
      listDocumentsByStatus,
      listDocumentsByCreator,
      countDocumentsByUserId,
    }),
    [
      docs,
      addDoc,
      updateDoc,
      removeDoc,
      getDocumentById,
      listDocumentsByStatus,
      listDocumentsByCreator,
      countDocumentsByUserId,
    ],
  )

  return <DocContext.Provider value={value}>{children}</DocContext.Provider>
}

export function useDocs() {
  return useContext(DocContext)
}

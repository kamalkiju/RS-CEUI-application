import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { normalizeTemplateForm } from '../pages/kmt/pocReferenceFormSeed.js'
import { uid } from '../pages/kmt/kmtFormBuilderShared.js'
import { DEFAULT_WF_NODES, DEFAULT_WF_EDGES } from '../components/kmt/WorkflowBuilderBody.jsx'

function defaultApprovalLevels() {
  return [
    { id: `lvl-${uid()}`, role: 'POC' },
    { id: `lvl-${uid()}`, role: 'BUFM' },
    { id: `lvl-${uid()}`, role: 'KMT' },
  ]
}

const STORAGE_KEY = 'ceui_kmt_templates'

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function nowIso() {
  return new Date().toISOString()
}

/** Minimum demo rows per Documents tab (Draft / Submitted / Published catalog). */
const MIN_TEMPLATES_PER_TAB = 8

const DOC_TYPES_ROT = ['Commercial', 'Residential', 'Municipal', 'RSAUI', 'General', 'Commercial', 'Residential', 'Municipal']

function newTemplateForm() {
  return normalizeTemplateForm({ tabs: [] })
}

function demoRow(id, status, title, docType, timeline, targetApp = 'CEUI') {
  return {
    id,
    name: title,
    docType,
    targetApp,
    lineOfBusiness: 'Municipal',
    serviceArea: 'Florida',
    description: 'Demo template — aligned with POC knowledge document structure.',
    marketSegment: 'Muni',
    status,
    assignees: { pocUserIds: [], bufmUserIds: [], kmtUserIds: [] },
    approvalLevels: defaultApprovalLevels(),
    workflow: { nodes: DEFAULT_WF_NODES, edges: DEFAULT_WF_EDGES },
    form: newTemplateForm(),
    timeline: timeline || [
      { id: `${id}-ev`, stage: 'Demo', detail: 'Sample template for list view', actor: 'KMT', at: '2024-03-15T12:00:00.000Z' },
    ],
    createdAt: '2024-03-01T10:00:00.000Z',
    updatedAt: '2024-03-18T12:00:00.000Z',
  }
}

const DEMO_DRAFT = Array.from({ length: MIN_TEMPLATES_PER_TAB }, (_, i) =>
  demoRow(
    `tpl-demo-draft-${String(i + 1).padStart(2, '0')}`,
    'draft',
    `Draft — ${['Recycling rider', 'Commercial SLA', 'Muni pickup', 'RSAUI matrix', 'Fee schedule', 'Safety bulletin', 'Cart policy', 'Landfill SOP'][i]}`,
    DOC_TYPES_ROT[i],
    [{ id: `d-${i}`, stage: 'Draft saved', detail: 'Work in progress', actor: 'You', at: '2024-03-19T08:00:00.000Z' }],
  ),
)

const DEMO_SUBMITTED = Array.from({ length: MIN_TEMPLATES_PER_TAB }, (_, i) =>
  demoRow(
    `tpl-demo-sub-${String(i + 1).padStart(2, '0')}`,
    'submitted',
    `Submitted — ${['Q1 pricing', 'BUFM review pack', 'KMT catalog item', 'Contract addendum', 'Service matrix', 'Contamination fees', 'Holiday schedule', 'Bulk waste'][i]}`,
    DOC_TYPES_ROT[(i + 2) % 8],
    [{ id: `s-${i}`, stage: 'Submitted', detail: 'Awaiting KMT decision', actor: 'You', at: '2024-03-20T11:00:00.000Z' }],
  ),
)

const DEMO_PUBLISHED = Array.from({ length: MIN_TEMPLATES_PER_TAB }, (_, i) =>
  demoRow(
    `tpl-demo-pub-${String(i + 1).padStart(2, '0')}`,
    'published',
    `Published — ${['City franchise', 'HOA bundle', 'Roll-off SOP', 'Cart exchange', 'Yard waste', 'E-waste', 'Compactor', 'Special waste'][i]}`,
    DOC_TYPES_ROT[(i + 4) % 8],
    [{ id: `p-${i}`, stage: 'Published', detail: 'Live in catalog', actor: 'KMT', at: '2024-03-21T09:00:00.000Z' }],
    i % 2 === 0 ? 'CEUI' : 'RSAUI',
  ),
)

const DEMO_RSAUI_DRAFT = Array.from({ length: 4 }, (_, i) =>
  demoRow(
    `tpl-rsa-draft-${String(i + 1).padStart(2, '0')}`,
    'draft',
    `RSAUI Draft — ${['North zone', 'South cart mix', 'Pricing tier A', 'Holiday route'][i]}`,
    'RSAUI',
    [{ id: `rd-${i}`, stage: 'Draft', detail: 'RSAUI template', actor: 'KMT', at: '2024-03-19T08:00:00.000Z' }],
    'RSAUI',
  ),
)

/**
 * Ensures at least MIN_TEMPLATES_PER_TAB items per tab. Merges fixed demo ids so
 * sparse localStorage still fills both tabs.
 */
function mergeMinimumDemoTemplates(existing) {
  const byId = new Set((existing || []).map(t => t.id))
  const out = [...(existing || [])]

  const countDraft = () => out.filter(t => t.status === 'draft').length
  const countSubmitted = () => out.filter(t => t.status === 'submitted').length
  const countPublished = () => out.filter(t => t.status === 'published').length
  const countRsaDraft = () => out.filter(t => t.status === 'draft' && t.targetApp === 'RSAUI').length

  for (const row of DEMO_DRAFT) {
    if (countDraft() >= MIN_TEMPLATES_PER_TAB) break
    if (!byId.has(row.id)) {
      out.push(row)
      byId.add(row.id)
    }
  }
  for (const row of DEMO_SUBMITTED) {
    if (countSubmitted() >= MIN_TEMPLATES_PER_TAB) break
    if (!byId.has(row.id)) {
      out.push(row)
      byId.add(row.id)
    }
  }
  for (const row of DEMO_PUBLISHED) {
    if (countPublished() >= MIN_TEMPLATES_PER_TAB) break
    if (!byId.has(row.id)) {
      out.push(row)
      byId.add(row.id)
    }
  }
  for (const row of DEMO_RSAUI_DRAFT) {
    if (countRsaDraft() >= 4) break
    if (!byId.has(row.id)) {
      out.push(row)
      byId.add(row.id)
    }
  }

  return out
}

const KmtTemplateContext = createContext(null)

export function KmtTemplateProvider({ children }) {
  const [templates, setTemplates] = useState(() => {
    const stored = loadStored()
    return mergeMinimumDemoTemplates(stored?.length ? stored : [])
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  }, [templates])

  const saveTemplate = useCallback((partial, existingId) => {
    const tid = existingId || partial.id || `tpl-${Date.now()}`
    setTemplates(prev => {
      const exists = prev.find(t => t.id === tid)
      const row = {
        id: tid,
        name: partial.name ?? exists?.name ?? 'Untitled',
        docType: partial.docType ?? exists?.docType ?? 'General',
        lineOfBusiness: partial.lineOfBusiness ?? exists?.lineOfBusiness ?? '',
        serviceArea: partial.serviceArea ?? exists?.serviceArea ?? '',
        description: partial.description ?? exists?.description ?? '',
        marketSegment: partial.marketSegment ?? exists?.marketSegment ?? '',
        targetApp: partial.targetApp ?? exists?.targetApp ?? 'CEUI',
        status: partial.status ?? exists?.status ?? 'draft',
        assignees: partial.assignees ?? exists?.assignees ?? { pocUserIds: [], bufmUserIds: [], kmtUserIds: [] },
        approvalLevels: partial.approvalLevels ?? exists?.approvalLevels ?? defaultApprovalLevels(),
        workflow: partial.workflow ?? exists?.workflow ?? { nodes: DEFAULT_WF_NODES, edges: DEFAULT_WF_EDGES },
        form: partial.form ?? exists?.form ?? newTemplateForm(),
        timeline: partial.timeline ?? exists?.timeline ?? [],
        createdAt: exists?.createdAt ?? partial.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      }
      if (!row.timeline.length) {
        row.timeline = [
          { id: `ev-${Date.now()}`, stage: 'Draft saved', detail: 'Template saved', actor: 'You', at: nowIso() },
        ]
      }
      if (exists) return prev.map(t => (t.id === tid ? row : t))
      return [row, ...prev]
    })
    return tid
  }, [])

  const updateTemplate = useCallback((id, patch) => {
    setTemplates(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              ...patch,
              updatedAt: nowIso(),
              timeline: patch.timeline !== undefined ? patch.timeline : t.timeline,
            }
          : t,
      ),
    )
  }, [])

  const deleteTemplate = useCallback(id => {
    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  const appendTimeline = useCallback((id, entry) => {
    setTemplates(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              timeline: [...(t.timeline || []), { id: `ev-${Date.now()}`, at: nowIso(), ...entry }],
              updatedAt: nowIso(),
            }
          : t,
      ),
    )
  }, [])

  const getTemplate = useCallback(id => templates.find(t => t.id === id), [templates])

  const value = useMemo(
    () => ({
      templates,
      saveTemplate,
      updateTemplate,
      deleteTemplate,
      appendTimeline,
      getTemplate,
    }),
    [templates, saveTemplate, updateTemplate, deleteTemplate, appendTimeline, getTemplate],
  )

  return <KmtTemplateContext.Provider value={value}>{children}</KmtTemplateContext.Provider>
}

export function useKmtTemplates() {
  const ctx = useContext(KmtTemplateContext)
  if (!ctx) throw new Error('useKmtTemplates must be used within KmtTemplateProvider')
  return ctx
}

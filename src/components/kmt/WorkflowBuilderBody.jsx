import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useKmtUsers } from '../../context/KmtUsersContext.jsx'

const uid = () => `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const WF_PALETTE = [
  { type: 'start', label: 'Start Node' },
  { type: 'approval', label: 'Approval Node' },
  { type: 'decision', label: 'Decision Node' },
  { type: 'end', label: 'End Node' },
]

export function wfDefaultNode(type, x, y) {
  return {
    id: uid(),
    type,
    x,
    y,
    role: type === 'approval' ? 'BUFM' : 'POC',
    users: [],
    pocRoleCategory: 'Reviewer',
    assigneeNames: [],
    reviewersRequired: 2,
    slaDays: 3,
    reminder: false,
    escalation: false,
    notifyRoles: [],
  }
}

function nodeLabel(n) {
  if (n.type === 'start') return 'Start'
  if (n.type === 'end') return 'End'
  if (n.type === 'decision') return 'Decision'
  if (n.type === 'approval') {
    if (n.role === 'POC') return n.pocRoleCategory ? `POC · ${n.pocRoleCategory}` : 'POC'
    if (n.role === 'BUFM') return 'Approval BUFM'
    if (n.role === 'KMT') return 'Approval MT'
  }
  return n.type
}

export function buildWorkflowTimeline(nodes, edges) {
  const start = nodes.find(n => n.type === 'start')
  if (!start) return ['Start', 'POC', 'Approval BUFM', 'Approval MT', 'End']
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  const outs = {}
  edges.forEach(e => {
    outs[e.from] = outs[e.from] || []
    outs[e.from].push(e.to)
  })
  const seen = new Set()
  const order = []
  const walk = id => {
    if (seen.has(id)) return
    seen.add(id)
    const n = byId[id]
    if (n) order.push(nodeLabel(n))
    ;(outs[id] || []).forEach(walk)
  }
  walk(start.id)
  return order.length ? order : ['Start', 'POC', 'Approval BUFM', 'Approval MT', 'End']
}

export const DEFAULT_WF_NODES = [
  { ...wfDefaultNode('start', 40, 120), id: 'n-seed-start' },
  { ...wfDefaultNode('approval', 200, 100), id: 'n-seed-poc', role: 'POC' },
  { ...wfDefaultNode('approval', 380, 100), id: 'n-seed-bufm', role: 'BUFM' },
  { ...wfDefaultNode('approval', 560, 100), id: 'n-seed-kmt', role: 'KMT' },
  { ...wfDefaultNode('end', 740, 120), id: 'n-seed-end' },
]

export const DEFAULT_WF_EDGES = [
  { from: 'n-seed-start', to: 'n-seed-poc' },
  { from: 'n-seed-poc', to: 'n-seed-bufm' },
  { from: 'n-seed-bufm', to: 'n-seed-kmt' },
  { from: 'n-seed-kmt', to: 'n-seed-end' },
]

const POC_WORKFLOW_ROLES = ['Reviewer', 'Approver', 'Admin', 'Underwriter']

export default function WorkflowBuilderBody({
  nodes,
  setNodes,
  edges,
  setEdges,
  compact = false,
  showTimeline = true,
}) {
  const { users: directoryUsers } = useKmtUsers()
  const [userSearch, setUserSearch] = useState('')
  const canvasRef = useRef(null)
  const [selectedId, setSelectedId] = useState(null)
  const [linkFrom, setLinkFrom] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [toast, setToast] = useState('')

  const selected = nodes.find(n => n.id === selectedId) || null
  const timeline = useMemo(() => buildWorkflowTimeline(nodes, edges), [nodes, edges])

  const canvasBounds = useMemo(() => {
    let w = 1100
    let h = 380
    nodes.forEach(n => {
      w = Math.max(w, (n.x || 0) + 160)
      h = Math.max(h, (n.y || 0) + 100)
    })
    return { width: w, height: h }
  }, [nodes])

  const showToast = msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const onCanvasDrop = e => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/x-kmt-node')
    if (!type || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - 60
    const y = e.clientY - rect.top - 24
    const n = wfDefaultNode(type, Math.max(20, x), Math.max(20, y))
    setNodes(prev => [...prev, n])
  }

  const moveNode = useCallback(
    (id, dx, dy) => {
      setNodes(prev => prev.map(n => (n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n)))
    },
    [setNodes],
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = ev => moveNode(dragging.id, ev.movementX, ev.movementY)
    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, moveNode])

  useEffect(() => {
    setUserSearch('')
  }, [selectedId])

  const handleNodeClick = id => {
    if (linkFrom) {
      if (linkFrom !== id) {
        setEdges(prev => [...prev.filter(e => !(e.from === linkFrom && e.to === id)), { from: linkFrom, to: id }])
        showToast('Connection added')
      }
      setLinkFrom(null)
      return
    }
    setSelectedId(id)
  }

  const updateSelected = patch => {
    if (!selectedId) return
    setNodes(prev => prev.map(n => (n.id === selectedId ? { ...n, ...patch } : n)))
  }

  const linePath = (a, b) => {
    const x1 = a.x + 120
    const y1 = a.y + 28
    const x2 = b.x
    const y2 = b.y + 28
    const mid = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
  }

  return (
    <div className={`kmt-wf${compact ? ' kmt-wf--embedded' : ''}`}>
      {toast && <div className="kmt-toast" role="status">{toast}</div>}

      <div className="kmt-wf__layout">
        <aside className="kmt-wf__palette">
          <h2>Nodes</h2>
          <p className="kmt-wf__hint">Drag into canvas</p>
          {WF_PALETTE.map(p => (
            <div
              key={p.type}
              className={`kmt-wf__palette-item kmt-wf__palette-item--${p.type}`}
              draggable
              onDragStart={e => e.dataTransfer.setData('application/x-kmt-node', p.type)}
            >
              {p.label}
            </div>
          ))}
          <p className="kmt-wf__mini">Use ● on a node, then click another node to connect.</p>
        </aside>

        <div className="kmt-wf__canvas-scroll">
          <p className="kmt-wf__scroll-hint">Scroll horizontally to see all nodes</p>
          <div
            ref={canvasRef}
            className="kmt-wf__canvas kmt-wf__canvas--sized"
            style={{ width: canvasBounds.width, minHeight: canvasBounds.height }}
            onDragOver={e => e.preventDefault()}
            onDrop={onCanvasDrop}
            onClick={() => {
              setSelectedId(null)
              setLinkFrom(null)
            }}
          >
          <svg className="kmt-wf__svg" width="100%" height="100%" aria-hidden>
            {edges.map((e, i) => {
              const a = nodes.find(n => n.id === e.from)
              const b = nodes.find(n => n.id === e.to)
              if (!a || !b) return null
              return <path key={`${e.from}-${e.to}-${i}`} d={linePath(a, b)} className="kmt-wf__edge" fill="none" />
            })}
          </svg>
          {nodes.map(n => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              className={`kmt-wf__node kmt-wf__node--${n.type}${selectedId === n.id ? ' kmt-wf__node--selected' : ''}`}
              style={{ left: n.x, top: n.y }}
              onClick={ev => {
                ev.stopPropagation()
                handleNodeClick(n.id)
              }}
              onMouseDown={ev => {
                ev.stopPropagation()
                setDragging({ id: n.id })
              }}
              onKeyDown={ev => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault()
                  handleNodeClick(n.id)
                }
              }}
            >
              <span className="kmt-wf__node-title">{WF_PALETTE.find(p => p.type === n.type)?.label || n.type}</span>
              {n.type === 'approval' && <span className="kmt-wf__node-sub">{n.role}</span>}
              <button
                type="button"
                className="kmt-wf__link-src"
                onClick={ev => {
                  ev.stopPropagation()
                  setLinkFrom(n.id)
                  showToast('Select target node')
                }}
              >
                ●
              </button>
            </div>
          ))}
          </div>
        </div>

        <aside className={`kmt-wf__drawer${selected ? ' kmt-wf__drawer--open' : ''}`} onClick={e => e.stopPropagation()}>
          {selected ? (
            <>
              <h2>Node configuration</h2>
              <p className="kmt-wf__drawer-id">{selected.id}</p>
              {selected.type === 'approval' && (
                <>
                  <label className="kmt-field">
                    <span>Role</span>
                    <select
                      className="kmt-input"
                      value={selected.role}
                      onChange={e => updateSelected({ role: e.target.value })}
                    >
                      <option value="POC">POC</option>
                      <option value="BUFM">BUFM</option>
                      <option value="KMT">KMT</option>
                    </select>
                  </label>
                  {selected.role === 'POC' && (
                    <>
                      <label className="kmt-field">
                        <span>POC role</span>
                        <select
                          className="kmt-input"
                          value={selected.pocRoleCategory || 'Reviewer'}
                          onChange={e => updateSelected({ pocRoleCategory: e.target.value })}
                        >
                          {POC_WORKFLOW_ROLES.map(r => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="kmt-field">
                        <span>User name</span>
                        <input
                          type="search"
                          className="kmt-input"
                          placeholder="Search users…"
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                          aria-label="Search users to assign"
                        />
                      </label>
                      <div className="kmt-wf__user-pick" role="group" aria-label="Assign users">
                        {directoryUsers
                          .filter(u =>
                            !userSearch.trim() ||
                            u.name.toLowerCase().includes(userSearch.trim().toLowerCase()) ||
                            u.email.toLowerCase().includes(userSearch.trim().toLowerCase()),
                          )
                          .slice(0, 12)
                          .map(u => {
                            const names = selected.assigneeNames || []
                            const checked = names.includes(u.name)
                            return (
                              <label key={u.id} className="kmt-wf__user-pick-row kmt-field kmt-field--row">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const next = checked ? names.filter(n => n !== u.name) : [...names, u.name]
                                    updateSelected({ assigneeNames: next })
                                  }}
                                />
                                <span>
                                  {u.name} <span className="kmt-wf__muted">({u.email})</span>
                                </span>
                              </label>
                            )
                          })}
                      </div>
                    </>
                  )}
                  {selected.role !== 'POC' && (
                    <>
                      <label className="kmt-field">
                        <span>Assigned users (IDs, comma-separated)</span>
                        <input
                          className="kmt-input"
                          value={(selected.users || []).join(', ')}
                          onChange={e =>
                            updateSelected({
                              users: e.target.value
                                .split(',')
                                .map(s => parseInt(s.trim(), 10))
                                .filter(Boolean),
                            })
                          }
                        />
                      </label>
                      <label className="kmt-field">
                        <span>Reviewers required</span>
                        <input
                          type="number"
                          min={0}
                          className="kmt-input"
                          value={selected.reviewersRequired}
                          onChange={e => updateSelected({ reviewersRequired: +e.target.value })}
                        />
                      </label>
                      <label className="kmt-field">
                        <span>Completion SLA (days)</span>
                        <input
                          type="number"
                          min={0}
                          className="kmt-input"
                          value={selected.slaDays}
                          onChange={e => updateSelected({ slaDays: +e.target.value })}
                        />
                      </label>
                      <label className="kmt-field kmt-field--row">
                        <input
                          type="checkbox"
                          checked={!!selected.reminder}
                          onChange={e => updateSelected({ reminder: e.target.checked })}
                        />
                        <span>Reminder</span>
                      </label>
                      <label className="kmt-field kmt-field--row">
                        <input
                          type="checkbox"
                          checked={!!selected.escalation}
                          onChange={e => updateSelected({ escalation: e.target.checked })}
                        />
                        <span>Escalation</span>
                      </label>
                      <label className="kmt-field">
                        <span>Notify roles (comma: POC,BUFM,KMT)</span>
                        <input
                          className="kmt-input"
                          value={(selected.notifyRoles || []).join(', ')}
                          onChange={e =>
                            updateSelected({
                              notifyRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              {(selected.type === 'start' || selected.type === 'end' || selected.type === 'decision') && (
                <p className="kmt-wf__muted">No extra fields for this node type in the mock.</p>
              )}
              <button
                type="button"
                className="btn btn-outline kmt-btn-compact"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setEdges(prev => prev.filter(e => e.from !== selected.id && e.to !== selected.id))
                  setNodes(prev => prev.filter(n => n.id !== selected.id))
                  setSelectedId(null)
                }}
              >
                Delete node
              </button>
            </>
          ) : (
            <p className="kmt-wf__muted">Select a node to configure.</p>
          )}
        </aside>
      </div>

      {showTimeline && (
        <section className="kmt-wf__timeline">
          <h2>Workflow timeline preview</h2>
          <div className="kmt-wf__timeline-track">
            {timeline.map((label, i) => (
              <span key={`${label}-${i}`} className="kmt-wf__timeline-join">
                {i > 0 && (
                  <span className="kmt-wf__timeline-arrow" aria-hidden>
                    →
                  </span>
                )}
                <span className="kmt-wf__timeline-chip">{label}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

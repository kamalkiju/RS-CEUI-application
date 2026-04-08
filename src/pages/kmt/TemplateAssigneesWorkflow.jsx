import { useState, useEffect, useMemo, Fragment } from 'react'
import { uid } from './kmtFormBuilderShared.js'
import './templateAssigneesWorkflow.css'

export const ROLE_COLORS = {
  POC: {
    tint: '#E1F5EE',
    dot: '#0F6E56',
    text: '#085041',
    av: '#9FE1CB',
  },
  BUFM: {
    tint: '#EEEDFE',
    dot: '#534AB7',
    text: '#3C3489',
    av: '#CECBF6',
  },
  JQT: {
    tint: '#E6F1FB',
    dot: '#185FA5',
    text: '#0C447C',
    av: '#B5D4F4',
  },
  KMT: {
    tint: '#E6F1FB',
    dot: '#185FA5',
    text: '#0C447C',
    av: '#B5D4F4',
  },
  RTV: {
    tint: '#E6F1FB',
    dot: '#185FA5',
    text: '#0C447C',
    av: '#B5D4F4',
  },
  DEFAULT: {
    tint: '#F1EFE8',
    dot: '#5F5E5A',
    text: '#2C2C2A',
    av: '#D3D1C7',
  },
}

export function getRoleColor(roleName) {
  const key = String(roleName || '').toUpperCase()
  return ROLE_COLORS[key] || ROLE_COLORS.DEFAULT
}

function userInitials(u) {
  if (u.init) return u.init
  const parts = String(u.name || '')
    .trim()
    .split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return String(u.name || '?')
    .slice(0, 2)
    .toUpperCase()
}

function filterUsers(users, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return users
  return users.filter(u => {
    const name = (u.name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    const role = (u.role || '').toLowerCase()
    return name.includes(q) || email.includes(q) || role.includes(q)
  })
}

export default function TemplateAssigneesWorkflow({
  stages,
  assigneesByLevel,
  users,
  onStagesChange,
  onAssigneesChange,
  onNotify,
}) {
  const [selectedId, setSelectedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  const [dropTargetId, setDropTargetId] = useState(null)
  const [activeGap, setActiveGap] = useState(null)
  const [newRoleDraft, setNewRoleDraft] = useState('')
  const [roleEditDraft, setRoleEditDraft] = useState('')

  useEffect(() => {
    if (selectedId && !stages.find(s => s.id === selectedId)) {
      setSelectedId(null)
      setSearchQuery('')
    }
  }, [stages, selectedId])

  const selected = stages.find(s => s.id === selectedId)

  useEffect(() => {
    if (selected) setRoleEditDraft(selected.name || '')
  }, [selectedId, selected?.name])

  const selectedAssignees = selectedId ? assigneesByLevel[selectedId] || [] : []

  const matches = useMemo(() => filterUsers(users, searchQuery), [users, searchQuery])

  const swapNodes = (idA, idB) => {
    const ia = stages.findIndex(s => s.id === idA)
    const ib = stages.findIndex(s => s.id === idB)
    if (ia < 0 || ib < 0 || ia === ib) return
    const next = [...stages]
    const t = next[ia]
    next[ia] = next[ib]
    next[ib] = t
    onStagesChange(next)
  }

  const insertAtGap = gapIndex => {
    const trimmed = String(newRoleDraft || '').trim()
    if (!trimmed) return
    const nid = uid()
    const next = [...stages]
    next.splice(gapIndex, 0, { id: nid, name: trimmed })
    onStagesChange(next)
    onAssigneesChange(prev => ({ ...prev, [nid]: [] }))
    setActiveGap(null)
    setNewRoleDraft('')
    setSelectedId(nid)
  }

  const toggleUser = userId => {
    if (!selectedId) return
    onAssigneesChange(prev => {
      const cur = prev[selectedId] || []
      const nextIds = cur.includes(userId) ? cur.filter(x => x !== userId) : [...cur, userId]
      return { ...prev, [selectedId]: nextIds }
    })
  }

  const removeUser = userId => {
    if (!selectedId) return
    onAssigneesChange(prev => ({
      ...prev,
      [selectedId]: (prev[selectedId] || []).filter(id => id !== userId),
    }))
  }

  const removeRole = () => {
    if (!selectedId || stages.length <= 1) return
    const rid = selectedId
    onStagesChange(stages.filter(s => s.id !== rid))
    onAssigneesChange(prev => {
      const n = { ...prev }
      delete n[rid]
      return n
    })
    setSelectedId(null)
  }

  const handleUpdateRoleClick = () => {
    if (!selectedId) return
    const trimmed = String(roleEditDraft || '').trim()
    if (!trimmed) return
    onStagesChange(stages.map(s => (s.id === selectedId ? { ...s, name: trimmed } : s)))
    onNotify?.({
      title: 'Role updated',
      message: `Saved “${trimmed}” and assignees. Publish or save draft to persist the template.`,
    })
  }

  const renderGap = gapIndex => (
    <Fragment key={`gap-${gapIndex}`}>
      <div className="taw__connector" aria-hidden>
        <div className="taw__line" />
        <div className="taw__arrow" />
      </div>
      <div className="taw__add-gap">
        {activeGap === gapIndex ? (
          <div className="taw__gap-form">
            <input
              className="taw__gap-input"
              placeholder="Role name"
              value={newRoleDraft}
              onChange={e => setNewRoleDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') insertAtGap(gapIndex)
                if (e.key === 'Escape') {
                  setActiveGap(null)
                  setNewRoleDraft('')
                }
              }}
              autoFocus
            />
            <button type="button" className="taw__gap-submit-btn" onClick={() => insertAtGap(gapIndex)}>
              Add role
            </button>
            <button
              type="button"
              className="taw__remove-role"
              onClick={() => {
                setActiveGap(null)
                setNewRoleDraft('')
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="taw__add-btn"
            aria-label="Add role here"
            onClick={() => {
              setActiveGap(gapIndex)
              setNewRoleDraft('')
            }}
          >
            +
          </button>
        )}
      </div>
      <div className="taw__connector" aria-hidden>
        <div className="taw__line" />
        <div className="taw__arrow" />
      </div>
    </Fragment>
  )

  return (
    <div className="taw">
      <div className="taw__head">
        <h2 className="taw__title">Template assignees</h2>
        <p className="taw__sub">
          Build the flow on the left (Start → Creator → Approval roles → End). Click a role card to assign users on the right.
        </p>
      </div>

      <div className="taw__layout">
        <div className="taw__workflow-column">
          <div className="taw__workflow-head">
            <span className="taw__workflow-head-title">Workflow</span>
            <div className="taw__legend" aria-hidden>
              <span className="taw__legend-chip taw__legend-chip--start">Start</span>
              <span className="taw__legend-sep">→</span>
              <span className="taw__legend-chip taw__legend-chip--creator">Creator</span>
              <span className="taw__legend-sep">→</span>
              <span className="taw__legend-chip taw__legend-chip--approval">Approval</span>
              <span className="taw__legend-sep">→</span>
              <span className="taw__legend-chip taw__legend-chip--end">End</span>
            </div>
            <p className="taw__workflow-hint">First role is the Creator step; additional roles are Approval steps. Use + to add a role and name it (e.g. POC, BUFM).</p>
          </div>
          <div className="taw__canvas-wrap">
            <div className="taw__canvas-scroll">
              <div className="taw__canvas-inner">
                <div className="taw__start" aria-hidden>
                  Start
                </div>
                {renderGap(0)}
                {stages.map((stage, i) => {
                  const colors = getRoleColor(stage.name)
                  const count = (assigneesByLevel[stage.id] || []).length
                  const isSel = selectedId === stage.id
                  const isDrop = dropTargetId === stage.id && draggingId && draggingId !== stage.id
                  return (
                    <Fragment key={stage.id}>
                      <div className="taw__node-wrap">
                        <div
                          className="taw__drag-hint"
                        draggable
                        title="Drag to swap order"
                        onDragStart={e => {
                          e.stopPropagation()
                          setDraggingId(stage.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => {
                          setDraggingId(null)
                          setDropTargetId(null)
                        }}
                        aria-hidden
                      >
                        ⋮
                        <br />
                        ⋮
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        className={`taw__node${i === 0 ? ' taw__node--creator' : ' taw__node--approval'}${isSel ? ' taw__node--selected' : ''}${isDrop ? ' taw__node--drop' : ''}`}
                        onDragOver={e => {
                          e.preventDefault()
                          if (draggingId && draggingId !== stage.id) setDropTargetId(stage.id)
                        }}
                        onDragLeave={() => setDropTargetId(null)}
                        onDrop={e => {
                          e.preventDefault()
                          if (draggingId && draggingId !== stage.id) swapNodes(draggingId, stage.id)
                          setDraggingId(null)
                          setDropTargetId(null)
                        }}
                        onClick={() => setSelectedId(stage.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedId(stage.id)
                          }
                        }}
                      >
                        <div className="taw__node-icon" style={{ background: colors.tint }}>
                          <div className="taw__node-dot" style={{ background: colors.dot }} />
                        </div>
                        <div className="taw__node-role">{stage.name || 'Role'}</div>
                        <div className="taw__node-type">{i === 0 ? 'Creator' : 'Approval'}</div>
                        <div
                          className={`taw__node-badge ${count > 0 ? 'taw__node-badge--ok' : 'taw__node-badge--empty'}`}
                        >
                          {count > 0 ? `${count} user${count === 1 ? '' : 's'} assigned` : 'No users'}
                        </div>
                      </div>
                    </div>
                    {renderGap(i + 1)}
                  </Fragment>
                )
              })}
                <div className="taw__end" aria-hidden>
                  End
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="taw__divider" aria-hidden />

        <div className="taw__panel-wrap taw__panel-wrap--right">
          {!selected ? (
            <div className="taw__panel taw__panel-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Click a Creator or Approval role on the left to assign users</span>
            </div>
          ) : (
            <div className="taw__panel">
              <div className="taw__panel-header">
                <h3 className="taw__panel-title">Assign users</h3>
                <span
                  className="taw__role-pill"
                  style={{
                    background: getRoleColor(selected.name).tint,
                    color: getRoleColor(selected.name).text,
                  }}
                >
                  {selected.name}
                </span>
                <span className="taw__panel-kind">
                  {stages.findIndex(s => s.id === selectedId) === 0 ? 'Creator' : 'Approval'}
                </span>
              </div>

              <div className="taw__role-edit">
                <label className="taw__label-upper" htmlFor={`taw-role-${selected.id}`}>
                  Role name
                </label>
                <input
                  id={`taw-role-${selected.id}`}
                  value={roleEditDraft}
                  onChange={e => setRoleEditDraft(e.target.value)}
                  placeholder="POC, BUFM, RTV…"
                />
              </div>

              <label className="taw__label-upper" htmlFor="taw-search-users">
                Search users
              </label>
              <input
                id="taw-search-users"
                type="search"
                className="taw__search"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoComplete="off"
              />

              <div className="taw__user-list" role="list">
                {matches.length === 0 ? (
                  <div className="taw__user-row" style={{ cursor: 'default' }}>
                    <span className="taw__user-meta" style={{ padding: '8px' }}>
                      No users match this search.
                    </span>
                  </div>
                ) : (
                  matches.map(u => {
                    const on = selectedAssignees.includes(u.id)
                    const rc = getRoleColor(selected.name)
                    return (
                      <div
                        key={u.id}
                        role="listitem"
                        className={`taw__user-row${on ? ' taw__user-row--on' : ''}`}
                        onClick={() => toggleUser(u.id)}
                      >
                        <div
                          className="taw__avatar"
                          style={{ background: rc.av, color: rc.text }}
                        >
                          {userInitials(u)}
                        </div>
                        <div className="taw__user-mid">
                          <div className="taw__user-name">{u.name}</div>
                          <div className="taw__user-meta">{u.email || '—'}</div>
                        </div>
                        <input
                          type="checkbox"
                          className="taw__cb"
                          checked={on}
                          onChange={() => toggleUser(u.id)}
                          onClick={e => e.stopPropagation()}
                          aria-label={`Assign ${u.name}`}
                        />
                      </div>
                    )
                  })
                )}
              </div>

              <div className="taw__label-upper taw__assigned-label">Assigned to this role</div>
              {selectedAssignees.length === 0 ? (
                <p className="taw__assigned-empty">No users assigned yet</p>
              ) : (
                <ul className="taw__chips">
                  {selectedAssignees.map(uid => {
                    const u = users.find(x => x.id === uid)
                    if (!u)
                      return (
                        <li key={uid}>
                          <span className="taw__chip">{uid}</span>
                        </li>
                      )
                    return (
                      <li key={uid}>
                        <span className="taw__chip">
                          <span>{u.name}</span>
                          <button
                            type="button"
                            className="taw__chip-x"
                            aria-label={`Remove ${u.name}`}
                            onClick={() => removeUser(uid)}
                          >
                            ×
                          </button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}

              <button type="button" className="taw__update-btn" onClick={handleUpdateRoleClick}>
                Update role
              </button>

              {stages.length > 1 && (
                <button type="button" className="taw__remove-role" onClick={removeRole}>
                  Remove this role from workflow
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

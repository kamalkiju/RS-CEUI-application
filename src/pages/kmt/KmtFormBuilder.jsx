import { useState, useCallback, useMemo, useRef, useEffect, Fragment } from 'react'
import Layout from '../../components/Layout.jsx'
import { FIELD_LIBRARY, uid, emptyField } from './kmtFormBuilderShared.js'
import { normalizeTemplateForm } from './pocReferenceFormSeed.js'

export default function KmtFormBuilder({ embedded = false, controlledForm, setControlledForm }) {
  const initialRef = useRef(null)
  if (!initialRef.current) initialRef.current = normalizeTemplateForm({ tabs: [] })
  const [localForm, setLocalForm] = useState(initialRef.current)
  const form = controlledForm !== undefined ? controlledForm : localForm
  const setForm = setControlledForm !== undefined ? setControlledForm : setLocalForm

  const [activeTabId, setActiveTabId] = useState(() =>
    (controlledForm || initialRef.current).tabs[0].id,
  )

  useEffect(() => {
    if (controlledForm?.tabs?.length) {
      const exists = controlledForm.tabs.some(t => t.id === activeTabId)
      if (!exists) setActiveTabId(controlledForm.tabs[0].id)
    }
  }, [controlledForm, activeTabId])
  const [selected, setSelected] = useState(null)
  const [dragTabId, setDragTabId] = useState(null)
  const [toast, setToast] = useState('')

  const activeTab = useMemo(
    () => form.tabs.find(t => t.id === activeTabId) || form.tabs[0],
    [form.tabs, activeTabId],
  )

  const showToast = msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const updateField = useCallback((tabId, groupId, fieldId, patch) => {
    setForm(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id !== tabId
          ? t
          : {
              ...t,
              groups: t.groups.map(g =>
                g.id !== groupId
                  ? g
                  : { ...g, fields: g.fields.map(f => (f.id === fieldId ? { ...f, ...patch } : f)) },
              ),
            },
      ),
    }))
  }, [])

  const addTab = () => {
    const t = { id: uid(), title: 'New Tab', groups: [{ id: uid(), title: 'New Group', columns: 2, fields: [] }] }
    setForm(prev => ({ ...prev, tabs: [...prev.tabs, t] }))
    setActiveTabId(t.id)
  }

  const renameTab = id => {
    const title = window.prompt('Tab name', form.tabs.find(t => t.id === id)?.title || '')
    if (title == null || !title.trim()) return
    setForm(prev => ({ ...prev, tabs: prev.tabs.map(t => (t.id === id ? { ...t, title: title.trim() } : t)) }))
  }

  const reorderTabs = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return
    setForm(prev => {
      const tabs = [...prev.tabs]
      const i = tabs.findIndex(t => t.id === fromId)
      const j = tabs.findIndex(t => t.id === toId)
      if (i < 0 || j < 0) return prev
      const [row] = tabs.splice(i, 1)
      tabs.splice(j, 0, row)
      return { ...prev, tabs }
    })
  }

  const deleteTab = id => {
    setForm(prev => {
      if (prev.tabs.length <= 1) return prev
      const nextTabs = prev.tabs.filter(t => t.id !== id)
      setActiveTabId(cur => (cur === id ? nextTabs[0].id : cur))
      return { ...prev, tabs: nextTabs }
    })
  }

  const insertGroupAfter = useCallback(
    afterGroupId => {
      const title = window.prompt('Group name', 'New group')
      if (title == null) return
      const trimmed = title.trim() || 'New group'
      const g = { id: uid(), title: trimmed, columns: 2, fields: [] }
      setForm(prev => ({
        ...prev,
        tabs: prev.tabs.map(t => {
          if (t.id !== activeTabId) return t
          const groups = t.groups || []
          if (afterGroupId == null) {
            return { ...t, groups: [...groups, g] }
          }
          const idx = groups.findIndex(x => x.id === afterGroupId)
          if (idx < 0) return { ...t, groups: [...groups, g] }
          return { ...t, groups: [...groups.slice(0, idx + 1), g, ...groups.slice(idx + 1)] }
        }),
      }))
    },
    [activeTabId],
  )

  const duplicateGroup = gid => {
    setForm(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => {
        if (t.id !== activeTabId) return t
        const g = t.groups.find(x => x.id === gid)
        if (!g) return t
        const copy = {
          ...g,
          id: uid(),
          fields: g.fields.map(f => ({ ...f, id: uid(), options: (f.options || []).map(o => ({ ...o, id: uid() })) })),
        }
        const idx = t.groups.findIndex(x => x.id === gid)
        const groups = [...t.groups.slice(0, idx + 1), copy, ...t.groups.slice(idx + 1)]
        return { ...t, groups }
      }),
    }))
  }

  const deleteGroup = gid => {
    setForm(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === activeTabId ? { ...t, groups: t.groups.filter(g => g.id !== gid) } : t,
      ),
    }))
  }

  const onDropOnGroup = (e, tabId, groupId) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/x-kmt-field')
    if (!type) return
    const f = emptyField(type)
    setForm(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id !== tabId
          ? t
          : {
              ...t,
              groups: t.groups.map(g =>
                g.id !== groupId ? g : { ...g, fields: [...g.fields, f] },
              ),
            },
      ),
    }))
  }

  const moveField = (tabId, fromG, toG, fieldId, newIndex) => {
    setForm(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => {
        if (t.id !== tabId) return t
        let field = null
        const groups = t.groups.map(g => {
          if (g.id !== fromG) return g
          field = g.fields.find(f => f.id === fieldId)
          return { ...g, fields: g.fields.filter(f => f.id !== fieldId) }
        })
        if (!field) return t
        return {
          ...t,
          groups: groups.map(g => {
            if (g.id !== toG) return g
            const next = [...g.fields]
            next.splice(newIndex, 0, field)
            return { ...g, fields: next }
          }),
        }
      }),
    }))
  }

  const sel = selected
    ? (() => {
        for (const t of form.tabs) {
          for (const g of t.groups) {
            const f = g.fields.find(x => x.id === selected.fieldId)
            if (f) return { tabId: t.id, groupId: g.id, field: f }
          }
        }
        return null
      })()
    : null

  const applyFieldPatch = patch => {
    if (!sel) return
    updateField(sel.tabId, sel.groupId, sel.field.id, patch)
  }

  const inner = (
    <div className={`kmt-page kmt-fb${embedded ? ' kmt-fb--embedded' : ''}`}>
        {toast && <div className="kmt-toast" role="status">{toast}</div>}
        {!embedded && (
        <div className="kmt-fb__top">
          <div>
            <h1 className="kmt-page__title">Form builder</h1>
            <p className="kmt-page__sub">Tabs → groups → fields. Drag types from the library.</p>
          </div>
          <div className="kmt-fb__save">
            <button type="button" className="btn btn-outline" onClick={() => showToast('Template saved (draft)')}>
              Save draft
            </button>
            <button type="button" className="btn btn-primary" onClick={() => showToast('Template published')}>
              Publish template
            </button>
          </div>
        </div>
        )}
        <div className="kmt-fb__layout">
          <aside className="kmt-fb__library">
            <h2>Fields</h2>
            <input type="search" className="kmt-input kmt-fb__search" placeholder="Search fields" aria-label="Search fields" />
            <div className="kmt-fb__library-scroll">
              {FIELD_LIBRARY.map(ft => (
                <div
                  key={ft.type}
                  className="kmt-fb__lib-item"
                  draggable
                  onDragStart={e => e.dataTransfer.setData('application/x-kmt-field', ft.type)}
                >
                  <span className="kmt-fb__grip">⋮⋮</span>
                  {ft.label}
                </div>
              ))}
            </div>
          </aside>

          <main className="kmt-fb__canvas">
            <div className="kmt-fb__tabs-row kmt-fb__tabs-row--with-add">
              <div className="kmt-fb__tabs-scroll">
                {form.tabs.map(t => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={e => {
                      setDragTabId(t.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => setDragTabId(null)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      if (dragTabId) reorderTabs(dragTabId, t.id)
                      setDragTabId(null)
                    }}
                    className={`kmt-fb__tab-chip${t.id === activeTabId ? ' kmt-fb__tab-chip--active' : ''}`}
                  >
                    <button type="button" className="kmt-fb__tab-main" onClick={() => setActiveTabId(t.id)}>
                      {t.title}
                    </button>
                    <button type="button" className="kmt-fb__tab-x" aria-label="Rename tab" onClick={() => renameTab(t.id)}>✎</button>
                    <button type="button" className="kmt-fb__tab-x" aria-label="Delete tab" onClick={() => deleteTab(t.id)}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-outline kmt-btn-compact" onClick={addTab}>
                + Add Tab
              </button>
            </div>

            {(!activeTab?.groups || activeTab.groups.length === 0) && (
              <div className="kmt-fb__add-group-wrap kmt-fb__add-group-wrap--solo">
                <p className="kmt-fb__add-group-hint">No groups on this tab yet.</p>
                <div className="kmt-fb__add-group-rule">
                  <span>Add new group</span>
                </div>
                <button
                  type="button"
                  className="kmt-fb__add-group-btn"
                  onClick={() => insertGroupAfter(null)}
                >
                  <span className="kmt-fb__add-group-icon" aria-hidden>
                    +
                  </span>
                  <span>Add new group</span>
                </button>
              </div>
            )}
            {(activeTab?.groups || []).map(g => (
              <Fragment key={g.id}>
                <section className="kmt-fb__group">
                  <header className="kmt-fb__group-head">
                    <span className="kmt-fb__grip">⋮⋮</span>
                    <h3>{g.title}</h3>
                    <div className="kmt-fb__group-actions">
                      <button
                        type="button"
                        className="btn btn-outline kmt-btn-compact"
                        onClick={() => {
                          const t = window.prompt('Group title', g.title)
                          if (t == null || !t.trim()) return
                          setForm(prev => ({
                            ...prev,
                            tabs: prev.tabs.map(tab =>
                              tab.id !== activeTabId
                                ? tab
                                : { ...tab, groups: tab.groups.map(x => (x.id === g.id ? { ...x, title: t.trim() } : x)) },
                            ),
                          }))
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="btn btn-outline kmt-btn-compact" onClick={() => duplicateGroup(g.id)}>
                        Duplicate
                      </button>
                      <select
                        className="kmt-input kmt-input--inline"
                        value={g.columns}
                        onChange={e =>
                          setForm(prev => ({
                            ...prev,
                            tabs: prev.tabs.map(tab =>
                              tab.id !== activeTabId
                                ? tab
                                : {
                                    ...tab,
                                    groups: tab.groups.map(x =>
                                      x.id === g.id ? { ...x, columns: +e.target.value } : x,
                                    ),
                                  },
                            ),
                          }))
                        }
                      >
                        <option value={1}>1 Column</option>
                        <option value={2}>2 Column</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline kmt-btn-compact"
                        style={{ color: 'var(--danger)', borderColor: '#fecaca' }}
                        onClick={() => deleteGroup(g.id)}
                      >
                        Delete group
                      </button>
                    </div>
                  </header>
                  <div
                    className="kmt-fb__fields"
                    style={{ gridTemplateColumns: `repeat(${g.columns}, 1fr)` }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onDropOnGroup(e, activeTabId, g.id)}
                  >
                    {g.fields.map((f, idx) => (
                      <div
                        key={f.id}
                        className="kmt-fb__field-card"
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData(
                            'application/x-kmt-move',
                            JSON.stringify({ scope: 'tab', fieldId: f.id, fromGroup: g.id, idx }),
                          )
                        }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                          e.preventDefault()
                          const raw = e.dataTransfer.getData('application/x-kmt-move')
                          if (!raw) return
                          const parsed = JSON.parse(raw)
                          if (parsed.scope === 'header') return
                          const { fieldId, fromGroup } = parsed
                          moveField(activeTabId, fromGroup, g.id, fieldId, idx)
                        }}
                      >
                        <div className="kmt-fb__field-head">
                          <span>{FIELD_LIBRARY.find(x => x.type === f.type)?.label || f.type}</span>
                          <div className="kmt-fb__field-tools">
                            <button
                              type="button"
                              className="kmt-icon-btn"
                              aria-label="Edit"
                              onClick={() => setSelected({ fieldId: f.id })}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="kmt-icon-btn"
                              aria-label="Duplicate"
                              onClick={() => {
                                const copy = { ...f, id: uid(), options: (f.options || []).map(o => ({ ...o, id: uid() })) }
                                setForm(prev => ({
                                  ...prev,
                                  tabs: prev.tabs.map(tab =>
                                    tab.id !== activeTabId
                                      ? tab
                                      : {
                                          ...tab,
                                          groups: tab.groups.map(gr =>
                                            gr.id === g.id
                                              ? { ...gr, fields: [...gr.fields.slice(0, idx + 1), copy, ...gr.fields.slice(idx + 1)] }
                                              : gr,
                                          ),
                                        },
                                  ),
                                }))
                              }}
                            >
                              ⧉
                            </button>
                            <button
                              type="button"
                              className="kmt-icon-btn"
                              aria-label="Delete"
                              onClick={() =>
                                setForm(prev => ({
                                  ...prev,
                                  tabs: prev.tabs.map(tab =>
                                    tab.id !== activeTabId
                                      ? tab
                                      : {
                                          ...tab,
                                          groups: tab.groups.map(gr =>
                                            gr.id === g.id ? { ...gr, fields: gr.fields.filter(x => x.id !== f.id) } : gr,
                                          ),
                                        },
                                  ),
                                }))
                              }
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div className="kmt-fb__field-body">
                          <label className="kmt-fb__preview-label">
                            {f.label}
                            {f.mandatory && <span className="kmt-fb__req"> *</span>}
                          </label>
                          {f.type === 'date' && <input className="kmt-input" type="date" readOnly />}
                          {f.type === 'button' && (
                            <button
                              type="button"
                              className={`btn ${f.buttonStyle === 'secondary' ? 'btn-outline' : f.buttonStyle === 'tertiary' ? 'btn-outline' : 'btn-primary'}`}
                            >
                              {f.label}
                            </button>
                          )}
                          {f.type === 'notes' && (
                            <textarea className="kmt-input" readOnly rows={3} placeholder={f.placeholder || '…'} defaultValue={f.defaultValue || ''} />
                          )}
                          {!['date', 'button', 'notes'].includes(f.type) && (
                            <input className="kmt-input" readOnly placeholder={f.placeholder || '…'} defaultValue={f.defaultValue || ''} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="kmt-fb__drop-hint">Drop fields here to add to this group</div>
                </section>
                <div className="kmt-fb__add-group-wrap">
                  <div className="kmt-fb__add-group-rule">
                    <span>Add new group below</span>
                  </div>
                  <button type="button" className="kmt-fb__add-group-btn" onClick={() => insertGroupAfter(g.id)}>
                    <span className="kmt-fb__add-group-icon" aria-hidden>
                      +
                    </span>
                    <span>Add new group</span>
                  </button>
                </div>
              </Fragment>
            ))}
          </main>
        </div>

        {sel && (
          <div className="confirm-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
            <div className="confirm-modal kmt-fb__field-modal" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
              <button type="button" className="kmt-drawer__close" aria-label="Close" onClick={() => setSelected(null)}>
                ×
              </button>
              <>
                <h2>Field settings</h2>
                <label className="kmt-field">
                  <span>Label</span>
                  <input
                    className="kmt-input"
                    value={sel.field.label}
                    onChange={e => applyFieldPatch({ label: e.target.value })}
                  />
                </label>
                <label className="kmt-field">
                  <span>Placeholder</span>
                  <input
                    className="kmt-input"
                    value={sel.field.placeholder}
                    onChange={e => applyFieldPatch({ placeholder: e.target.value })}
                  />
                </label>
                <label className="kmt-field kmt-field--row">
                  <input
                    type="checkbox"
                    checked={!!sel.field.mandatory}
                    onChange={e => applyFieldPatch({ mandatory: e.target.checked })}
                  />
                  <span>Mandatory</span>
                </label>
                <label className="kmt-field">
                  <span>Max length</span>
                  <input
                    className="kmt-input"
                    value={sel.field.maxLength}
                    onChange={e => applyFieldPatch({ maxLength: e.target.value })}
                  />
                </label>
                <label className="kmt-field">
                  <span>Default value</span>
                  <input
                    className="kmt-input"
                    value={sel.field.defaultValue}
                    onChange={e => applyFieldPatch({ defaultValue: e.target.value })}
                  />
                </label>
                <label className="kmt-field">
                  <span>Help text</span>
                  <input
                    className="kmt-input"
                    value={sel.field.helpText}
                    onChange={e => applyFieldPatch({ helpText: e.target.value })}
                  />
                </label>

                {['dropdown', 'radio', 'checkbox'].includes(sel.field.type) && (
                  <div className="kmt-fb__options">
                    <h3>Options</h3>
                    {(sel.field.options || []).map((opt, oi) => (
                      <div key={opt.id} className="kmt-fb__option-row">
                        <span className="kmt-fb__grip">⋮⋮</span>
                        <input
                          className="kmt-input"
                          value={opt.text}
                          onChange={e => {
                            const options = [...(sel.field.options || [])]
                            options[oi] = { ...opt, text: e.target.value }
                            applyFieldPatch({ options })
                          }}
                        />
                        <button
                          type="button"
                          className="kmt-icon-btn"
                          onClick={() =>
                            applyFieldPatch({
                              options: (sel.field.options || []).filter(x => x.id !== opt.id),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline kmt-btn-compact"
                      onClick={() =>
                        applyFieldPatch({
                          options: [...(sel.field.options || []), { id: uid(), text: `Option ${(sel.field.options || []).length + 1}` }],
                        })
                      }
                    >
                      Add option
                    </button>
                  </div>
                )}

                {sel.field.type === 'date' && (
                  <>
                    <label className="kmt-field kmt-field--row">
                      <input
                        type="checkbox"
                        checked={sel.field.dateMode === 'datetime'}
                        onChange={e =>
                          applyFieldPatch({
                            dateMode: e.target.checked ? 'datetime' : 'date',
                          })
                        }
                      />
                      <span>DateTime</span>
                    </label>
                    <label className="kmt-field">
                      <span>Min date</span>
                      <input
                        type="date"
                        className="kmt-input"
                        value={sel.field.minDate}
                        onChange={e => applyFieldPatch({ minDate: e.target.value })}
                      />
                    </label>
                    <label className="kmt-field">
                      <span>Max date</span>
                      <input
                        type="date"
                        className="kmt-input"
                        value={sel.field.maxDate}
                        onChange={e => applyFieldPatch({ maxDate: e.target.value })}
                      />
                    </label>
                  </>
                )}

                {sel.field.type === 'currency' && (
                  <>
                    <label className="kmt-field">
                      <span>Currency</span>
                      <select
                        className="kmt-input"
                        value={sel.field.currencyCode}
                        onChange={e => applyFieldPatch({ currencyCode: e.target.value })}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </label>
                    <label className="kmt-field">
                      <span>Decimal places</span>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        className="kmt-input"
                        value={sel.field.decimalPlaces}
                        onChange={e => applyFieldPatch({ decimalPlaces: +e.target.value })}
                      />
                    </label>
                  </>
                )}

                {sel.field.type === 'file' && (
                  <>
                    <label className="kmt-field">
                      <span>Allowed types (comma)</span>
                      <input
                        className="kmt-input"
                        value={(sel.field.fileTypes || []).join(', ')}
                        onChange={e =>
                          applyFieldPatch({
                            fileTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                          })
                        }
                      />
                    </label>
                    <label className="kmt-field">
                      <span>Max file size (MB)</span>
                      <input
                        type="number"
                        className="kmt-input"
                        value={sel.field.maxFileMb}
                        onChange={e => applyFieldPatch({ maxFileMb: +e.target.value })}
                      />
                    </label>
                    <label className="kmt-field kmt-field--row">
                      <input
                        type="checkbox"
                        checked={!!sel.field.fileMultiple}
                        onChange={e => applyFieldPatch({ fileMultiple: e.target.checked })}
                      />
                      <span>Multiple upload</span>
                    </label>
                  </>
                )}

                {sel.field.type === 'button' && (
                  <label className="kmt-field">
                    <span>Button style</span>
                    <select
                      className="kmt-input"
                      value={sel.field.buttonStyle}
                      onChange={e => applyFieldPatch({ buttonStyle: e.target.value })}
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="tertiary">Tertiary</option>
                    </select>
                  </label>
                )}
              </>
            </div>
          </div>
        )}
    </div>
  )

  if (embedded) return inner
  return <Layout>{inner}</Layout>
}

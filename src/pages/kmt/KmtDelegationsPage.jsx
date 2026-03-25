import { useState, useMemo, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { useKmtUsers } from '../../context/KmtUsersContext.jsx'

const STORAGE_KEY = 'ceui_kmt_delegations'

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    return Array.isArray(p) && p.length ? p : null
  } catch {
    return null
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function isActiveDelegation(d, day = todayIso()) {
  return d.start <= day && d.end >= day
}

/** Migrate older rows that only had delegator / delegate name strings */
function normalizeDelegationRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: raw.id || `d-mig-${Math.random().toString(36).slice(2, 10)}`,
    region: raw.region || '—',
    delegatorId: raw.delegatorId || '',
    delegatorName: raw.delegatorName || raw.delegator || '—',
    delegateId: raw.delegateId || '',
    delegateName: raw.delegateName || raw.delegate || '—',
    start: raw.start || todayIso(),
    end: raw.end || todayIso(),
    reason: raw.reason ?? '—',
  }
}

function seedDelegations() {
  const end = new Date()
  end.setFullYear(end.getFullYear() + 1)
  return [
    {
      id: 'd-seed-1',
      region: 'Southeast',
      delegatorId: 'poc-user-1',
      delegatorName: 'Jordan Lee',
      delegateId: 'bufm-user-1',
      delegateName: 'Taylor Brooks',
      start: todayIso(),
      end: end.toISOString().slice(0, 10),
      reason: 'Regional knowledge review coverage',
    },
  ]
}

export default function KmtDelegationsPage() {
  const { users } = useKmtUsers()
  const [region, setRegion] = useState('')
  const [delegatorId, setDelegatorId] = useState('')
  const [delegateId, setDelegateId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')
  const [list, setList] = useState(() => {
    const stored = loadStored()
    if (stored?.length) return stored.map(normalizeDelegationRow).filter(Boolean)
    return seedDelegations()
  })

  const regions = useMemo(() => {
    const set = new Set()
    for (const u of users) {
      const r = (u.region || '').trim()
      if (r) set.add(r)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [users])

  const usersInRegion = useMemo(() => {
    if (!region) return []
    return users.filter(u => (u.region || '').trim() === region).sort((a, b) => a.name.localeCompare(b.name))
  }, [users, region])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }, [list])

  useEffect(() => {
    if (!region) return
    setDelegatorId(id => (id && usersInRegion.some(u => u.id === id) ? id : ''))
    setDelegateId(id => (id && usersInRegion.some(u => u.id === id) ? id : ''))
  }, [region, usersInRegion])

  const activeList = useMemo(() => list.filter(d => isActiveDelegation(d)), [list])
  const pastList = useMemo(() => list.filter(d => !isActiveDelegation(d)).sort((a, b) => b.end.localeCompare(a.end)), [list])

  const save = e => {
    e.preventDefault()
    if (!region || !delegatorId || !delegateId || !start || !end) return
    if (delegatorId === delegateId) return
    if (end < start) return

    const del = users.find(u => u.id === delegatorId)
    const def = users.find(u => u.id === delegateId)
    if (!del || !def) return

    setList(prev => [
      {
        id: `d-${Date.now()}`,
        region,
        delegatorId,
        delegatorName: del.name,
        delegateId,
        delegateName: def.name,
        start,
        end,
        reason: (reason || '').trim() || '—',
      },
      ...prev,
    ])
    setDelegatorId('')
    setDelegateId('')
    setStart('')
    setEnd('')
    setReason('')
  }

  const remove = id => {
    setList(prev => prev.filter(d => d.id !== id))
  }

  return (
    <Layout>
      <div className="kmt-page kmt-delegations">
        <h1 className="kmt-page__title">Delegations</h1>
        <p className="kmt-page__sub">
          Choose a <strong>region</strong> first, then pick delegator and delegate from users in that region. Set dates and a reason.
        </p>

        <form className="kmt-delegations__form" onSubmit={save}>
          <label className="kmt-field kmt-field--full kmt-delegations__region">
            <span>Region</span>
            <select
              className="kmt-input"
              value={region}
              onChange={e => {
                setRegion(e.target.value)
                setDelegatorId('')
                setDelegateId('')
              }}
              required
            >
              <option value="">Select region…</option>
              {regions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="kmt-field">
            <span>Delegator</span>
            <select
              className="kmt-input"
              value={delegatorId}
              onChange={e => setDelegatorId(e.target.value)}
              required
              disabled={!region}
            >
              <option value="">{region ? 'Select delegator…' : 'Select region first'}</option>
              {usersInRegion.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </label>

          <label className="kmt-field">
            <span>Delegate</span>
            <select
              className="kmt-input"
              value={delegateId}
              onChange={e => setDelegateId(e.target.value)}
              required
              disabled={!region}
            >
              <option value="">{region ? 'Select delegate…' : 'Select region first'}</option>
              {usersInRegion.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </label>

          <label className="kmt-field">
            <span>Start date</span>
            <input type="date" className="kmt-input" value={start} onChange={e => setStart(e.target.value)} required />
          </label>

          <label className="kmt-field">
            <span>End date</span>
            <input type="date" className="kmt-input" value={end} onChange={e => setEnd(e.target.value)} required />
          </label>

          <label className="kmt-field kmt-field--full">
            <span>Reason</span>
            <textarea
              className="kmt-input"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. PTO, training, temporary coverage…"
            />
          </label>

          <div className="kmt-delegations__submit">
            <button type="submit" className="btn btn-primary" disabled={!region || usersInRegion.length < 2}>
              Save delegation
            </button>
            {region && usersInRegion.length < 2 && (
              <p className="kmt-delegations__hint">Add at least two users in this region in <strong>Users</strong> to create a delegation.</p>
            )}
          </div>
        </form>

        <h2 className="kmt-delegations__h2">Active delegations</h2>
        <p className="kmt-delegations__sub">Delegations where today is between start and end dates.</p>

        {activeList.length === 0 ? (
          <p className="kmt-delegations__empty">No active delegations.</p>
        ) : (
          <div className="kmt-delegations__table-wrap">
            <table className="kmt-delegations-table">
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Delegator</th>
                  <th>Delegate</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Reason</th>
                  <th className="kmt-delegations-table__actions"> </th>
                </tr>
              </thead>
              <tbody>
                {activeList.map(d => (
                  <tr key={d.id}>
                    <td>{d.region || '—'}</td>
                    <td>
                      <strong>{d.delegatorName}</strong>
                    </td>
                    <td>
                      <strong>{d.delegateName}</strong>
                    </td>
                    <td>{d.start}</td>
                    <td>{d.end}</td>
                    <td className="kmt-delegations-table__reason">{d.reason}</td>
                    <td className="kmt-delegations-table__actions">
                      <button type="button" className="btn btn-outline kmt-btn-compact" onClick={() => remove(d.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pastList.length > 0 && (
          <>
            <h2 className="kmt-delegations__h2 kmt-delegations__h2--past">Past delegations</h2>
            <div className="kmt-delegations__table-wrap kmt-delegations__table-wrap--muted">
              <table className="kmt-delegations-table kmt-delegations-table--past">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th>Delegator</th>
                    <th>Delegate</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Reason</th>
                    <th className="kmt-delegations-table__actions"> </th>
                  </tr>
                </thead>
                <tbody>
                  {pastList.map(d => (
                    <tr key={d.id}>
                      <td>{d.region || '—'}</td>
                      <td>{d.delegatorName}</td>
                      <td>{d.delegateName}</td>
                      <td>{d.start}</td>
                      <td>{d.end}</td>
                      <td className="kmt-delegations-table__reason">{d.reason}</td>
                      <td className="kmt-delegations-table__actions">
                        <button type="button" className="btn btn-outline kmt-btn-compact" onClick={() => remove(d.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

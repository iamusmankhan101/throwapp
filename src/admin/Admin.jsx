import { useCallback, useEffect, useMemo, useState } from 'react'

const API = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'demo' ? import.meta.env.VITE_API_URL : '/api').replace(/\/$/, '')
const PASSWORD_KEY = 'throw.admin'

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => b.id - a.id },
  oldest: { label: 'Oldest first', fn: (a, b) => a.id - b.id },
  referrals: { label: 'Most referrals', fn: (a, b) => b.referrals - a.referrals || a.position - b.position },
  position: { label: 'Place in line', fn: (a, b) => a.position - b.position },
}

const fmt = (n) => n.toLocaleString('en-US')
const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : '0%')
// Stored as UTC "YYYY-MM-DD HH:MM:SS"; show it in the viewer's time zone.
const toDate = (s) => new Date(`${s.replace(' ', 'T')}Z`)
const formatDate = (s) =>
  toDate(s).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const session = {
  get: () => {
    try {
      return sessionStorage.getItem(PASSWORD_KEY) || ''
    } catch {
      return ''
    }
  },
  set: (v) => {
    try {
      if (v) sessionStorage.setItem(PASSWORD_KEY, v)
      else sessionStorage.removeItem(PASSWORD_KEY)
    } catch {}
  },
}

async function fetchOverview(password) {
  let res
  try {
    res = await fetch(`${API}/admin/members`, { headers: { Authorization: `Bearer ${password}` } })
  } catch {
    throw Object.assign(new Error('Couldn’t reach the server.'), { status: 0 })
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: res.status })
  return data
}

function toCsv(members, emailByCode) {
  const cols = ['position', 'email', 'code', 'referrals', 'referred_by_email', 'confirmed', 'source', 'joined_utc']
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  const rows = members.map((m) =>
    [m.position, m.email, m.code, m.referrals, emailByCode.get(m.referredBy) ?? '', m.verified ? 'yes' : 'no', m.source ?? '', m.joinedAt]
      .map(esc)
      .join(','),
  )
  return [cols.join(','), ...rows].join('\n')
}

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await fetchOverview(password)
      session.set(password)
      onLogin(password, data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-login">
      <form className="login-card" onSubmit={submit}>
        <span className="admin-logo">throw</span>
        <h1>Admin</h1>
        <p>Sign in to see your waitlist.</p>
        <label className="sr-only" htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

function Dashboard({ password, initial, onSignOut }) {
  const [data, setData] = useState(initial)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(() => new Date())

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      setData(await fetchOverview(password))
      setUpdatedAt(new Date())
    } catch (err) {
      if (err.status === 401) onSignOut()
      else setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }, [password, onSignOut])

  const { stats, members } = data
  const emailByCode = useMemo(() => new Map(members.map((m) => [m.code, m.email])), [members])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? members.filter((m) => m.email.includes(q) || m.code.includes(q) || (m.source ?? '').includes(q)) : [...members]
    return list.sort(SORTS[sort].fn)
  }, [members, query, sort])

  const topReferrers = useMemo(
    () => members.filter((m) => m.referrals > 0).sort(SORTS.referrals.fn).slice(0, 5),
    [members],
  )

  function exportCsv() {
    const blob = new Blob([toCsv([...members].sort(SORTS.position.fn), emailByCode)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `throw-waitlist-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <span className="admin-logo">throw <em>admin</em></span>
        <div className="admin-actions">
          <span className="updated">Updated {updatedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
          <button type="button" className="btn-soft" onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="btn-soft" onClick={exportCsv} disabled={!members.length}>Export CSV</button>
          <button type="button" className="btn-soft" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <main className="admin-main">
        {error && <p className="admin-error" role="alert">{error}</p>}

        <section className="stats">
          <Stat label="Total signups" value={fmt(stats.total)} />
          <Stat label="Last 24 hours" value={fmt(stats.last24h)} />
          <Stat label="Confirmed emails" value={fmt(stats.verified)} sub={`${pct(stats.verified, stats.total)} of signups`} />
          <Stat label="Came from a referral" value={fmt(stats.referred)} sub={`${pct(stats.referred, stats.total)} of signups`} />
          <Stat label="Referrals credited" value={fmt(stats.credited)} sub="Passed the anti-abuse checks" />
        </section>

        <div className="admin-grid">
          <section className="panel">
            <div className="panel-head">
              <h2>Members</h2>
              <div className="controls">
                <input
                  type="search"
                  placeholder="Search email, code or source"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search members"
                />
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort members">
                  {Object.entries(SORTS).map(([key, s]) => (
                    <option key={key} value={key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {members.length === 0 ? (
              <p className="empty">No signups yet. Share the site and they&rsquo;ll show up here.</p>
            ) : shown.length === 0 ? (
              <p className="empty">No members match &ldquo;{query}&rdquo;.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="num">Place</th>
                      <th>Email</th>
                      <th>Invite code</th>
                      <th className="num">Referrals</th>
                      <th>Referred by</th>
                      <th>Confirmed</th>
                      <th>Source</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((m) => (
                      <tr key={m.id}>
                        <td className="num">#{fmt(m.position)}</td>
                        <td className="email">{m.email}</td>
                        <td><code>{m.code}</code></td>
                        <td className="num">{m.referrals}</td>
                        <td className="muted">
                          {m.referredBy ? (
                            <>
                              {emailByCode.get(m.referredBy) ?? m.referredBy}
                              {!m.credited && <span className="tag">not credited</span>}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{m.verified ? <span className="tag ok">Yes</span> : <span className="tag">Pending</span>}</td>
                        <td className="muted">{m.source ?? '—'}</td>
                        <td className="muted nowrap">{formatDate(m.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="panel-foot">
              Showing {fmt(shown.length)} of {fmt(members.length)}
              {stats.total > members.length && ` (newest ${fmt(members.length)} loaded)`}
            </p>
          </section>

          <aside className="panel">
            <h2>Top referrers</h2>
            {topReferrers.length === 0 ? (
              <p className="empty small">Nobody has referred a friend yet.</p>
            ) : (
              <ol className="leaders">
                {topReferrers.map((m, i) => (
                  <li key={m.id}>
                    <span className="rank">{i + 1}</span>
                    <span className="leader-email">{m.email}</span>
                    <strong>{m.referrals}</strong>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}

export default function Admin() {
  const [auth, setAuth] = useState(null) // { password, data }
  const [checking, setChecking] = useState(() => Boolean(session.get()))

  // Resume a session from this tab without asking for the password again.
  useEffect(() => {
    const saved = session.get()
    if (!saved) return
    fetchOverview(saved)
      .then((data) => setAuth({ password: saved, data }))
      .catch(() => session.set(''))
      .finally(() => setChecking(false))
  }, [])

  const signOut = useCallback(() => {
    session.set('')
    setAuth(null)
  }, [])

  if (checking) return <main className="admin-login"><p className="muted">Loading…</p></main>
  if (!auth) return <Login onLogin={(password, data) => setAuth({ password, data })} />
  return <Dashboard password={auth.password} initial={auth.data} onSignOut={signOut} />
}

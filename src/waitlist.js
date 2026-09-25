import { CODE_RE, isValidEmail } from './referrals.js'

export { isValidEmail }

// Base URL of the referral API (see server/index.js). Unset = demo mode:
// signups succeed locally but nothing is stored or counted.
const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const DEMO = !API

const MEMBER_KEY = 'throw.member'
const REF_KEY = 'throw.ref'

const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  },
}

// Remembers the ?ref= code from an invite link and tidies it out of the URL.
export function captureReferral() {
  const params = new URLSearchParams(window.location.search)
  const ref = params.get('ref')
  if (ref && CODE_RE.test(ref)) {
    store.set(REF_KEY, ref.toLowerCase())
    params.delete('ref')
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
  }
  return store.get(REF_KEY)
}

export const referralLink = (code) => `${window.location.origin}${window.location.pathname}?ref=${code}`

export const savedMember = () => store.get(MEMBER_KEY)
export const forgetMember = () => store.set(MEMBER_KEY, null)

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
  } catch {
    throw new Error('Couldn’t reach the waitlist. Check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status })
  return data
}

export async function joinWaitlist(email, source) {
  let member
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 600))
    member = { code: Math.random().toString(36).slice(2, 10), referrals: 0, position: null, total: null, demo: true }
  } else {
    member = await request('/join', { method: 'POST', body: JSON.stringify({ email, source, ref: store.get(REF_KEY) }) })
  }
  store.set(MEMBER_KEY, member)
  return member
}

export async function refreshMember(code) {
  const member = await request(`/status/${encodeURIComponent(code)}`)
  store.set(MEMBER_KEY, member)
  return member
}

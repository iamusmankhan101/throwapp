// Shared by the site and the server (server/index.js), so keep it free of
// browser- or Vite-only code.

// Each friend who joins through your link moves you this many spots up the line.
export const SPOTS_PER_REFERRAL = 3

export const TIERS = [
  { count: 1, id: 'kraft', name: 'Kraft Paper', reward: 'Unlock the exclusive Kraft paper style for your letters.' },
  { count: 3, id: 'wave', name: 'First Wave', reward: 'Skip ahead into the very first wave of invites.' },
  { count: 5, id: 'airmail', name: 'Airmail Collection', reward: 'Every premium paper style, plus custom wax seals.' },
  { count: 10, id: 'founder', name: 'Founding Member', reward: 'A Founding Member badge on your map, forever.' },
]

// The waitlist total is only shown once it's big enough to impress; until then
// early members see a Founding badge instead of "of 3 people".
export const SHOW_TOTAL_FROM = 100
export const FOUNDING_SPOTS = 100

export const CODE_RE = /^[a-z0-9]{6,12}$/i

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)

export function tierProgress(referrals) {
  const unlocked = TIERS.filter((t) => referrals >= t.count)
  const next = TIERS.find((t) => referrals < t.count) ?? null
  return { current: unlocked.at(-1) ?? null, next, remaining: next ? next.count - referrals : 0 }
}

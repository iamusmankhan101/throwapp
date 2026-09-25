// Waitlist storage on Turso (libSQL). Used by the Vercel functions in /api and
// by the local dev server (server/index.js). Without TURSO_DATABASE_URL it falls
// back to a local SQLite file, so development needs no account.
//
// Fake-signup protection:
//   - honeypot field + minimum time on page before submitting (bots)
//   - one member per real inbox: "+tags" and Gmail dots are normalized away
//   - throwaway inbox domains are rejected
//   - at most MAX_SIGNUPS_PER_IP_PER_DAY signups per network (IP stored hashed)
//   - a referral is only credited when the friend signs up from a different
//     network than the referrer, once per network per referrer, and (when
//     email is configured) only after the friend confirms their email

import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@libsql/client'
import { CODE_RE, SPOTS_PER_REFERRAL, isValidEmail } from '../src/referrals.js'
import { DISPOSABLE_DOMAINS } from './disposable.js'
import { emailEnabled, sendConfirmation } from './email.js'

const MIN_FILL_MS = 1500
const MAX_SIGNUPS_PER_IP_PER_DAY = 5
const RESEND_AFTER_MINUTES = 10

// THROW_DATABASE_* come first: the Vercel Turso integration injects its own
// TURSO_* values per deployment (a fresh "dpl-..." database each deploy), which
// would silently start every deployment with an empty waitlist.
const remoteUrl = process.env.THROW_DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
const authToken = process.env.THROW_DATABASE_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN

// Never fall back to a throwaway local file on Vercel: signups would vanish.
if (process.env.VERCEL && !remoteUrl) {
  throw new Error('TURSO_DATABASE_URL is not set for this Vercel environment.')
}

const db = createClient({ url: remoteUrl || 'file:server/local.db', authToken })

// Columns added after the first release; migrate() adds any that are missing.
const ADDED_COLUMNS = {
  email_key: 'TEXT',
  ip_hash: 'TEXT',
  verified: 'INTEGER NOT NULL DEFAULT 0',
  verify_token: 'TEXT',
  verify_sent_at: 'TEXT',
  credited: 'INTEGER NOT NULL DEFAULT 0',
}

let ready
function migrate() {
  ready ??= (async () => {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS members (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        email       TEXT NOT NULL UNIQUE,
        code        TEXT NOT NULL UNIQUE,
        referrals   INTEGER NOT NULL DEFAULT 0,
        referred_by TEXT,
        source      TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )`)
    const { rows } = await db.execute('PRAGMA table_info(members)')
    const have = new Set(rows.map((r) => r.name))
    for (const [name, type] of Object.entries(ADDED_COLUMNS)) {
      if (have.has(name)) continue
      try {
        await db.execute(`ALTER TABLE members ADD COLUMN ${name} ${type}`)
      } catch (err) {
        if (!/duplicate column/i.test(err.message)) throw err // another instance got there first
      }
      // Members from before this migration were already credited and trusted.
      if (name === 'verified') await db.execute('UPDATE members SET verified = 1')
      if (name === 'credited') await db.execute('UPDATE members SET credited = 1 WHERE referred_by IS NOT NULL')
    }
    await db.batch(
      [
        'UPDATE members SET email_key = email WHERE email_key IS NULL',
        'CREATE UNIQUE INDEX IF NOT EXISTS members_email_key ON members(email_key)',
        'CREATE UNIQUE INDEX IF NOT EXISTS members_verify_token ON members(verify_token)',
        'CREATE INDEX IF NOT EXISTS members_ip ON members(ip_hash, created_at)',
        'CREATE INDEX IF NOT EXISTS members_referred_by ON members(referred_by)',
      ],
      'write',
    )
  })().catch((err) => {
    ready = undefined
    throw err
  })
  return ready
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no look-alikes (0/o, 1/l/i)
const newCode = () => [...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join('')

// One key per real inbox: drop "+tags" everywhere, and dots for Gmail.
export function emailKey(email) {
  let [local, domain] = email.split('@')
  if (domain === 'googlemail.com') domain = 'gmail.com'
  local = local.split('+')[0]
  if (domain === 'gmail.com') local = local.replaceAll('.', '')
  return `${local}@${domain}`
}

function hashIp(ip) {
  if (!ip) return null
  return createHash('sha256').update(`${process.env.IP_HASH_SALT || 'throw-waitlist'}:${ip}`).digest('hex').slice(0, 32)
}

// Place in line: signup order, moved up SPOTS_PER_REFERRAL per credited referral.
const SCORE = (t) => `(${t}.id - ${SPOTS_PER_REFERRAL} * ${t}.referrals)`
const VIEW_SQL = `
  SELECT m.code, m.referrals, m.verified,
    (SELECT COUNT(*) FROM members o
      WHERE ${SCORE('o')} < ${SCORE('m')}
         OR (${SCORE('o')} = ${SCORE('m')} AND o.id < m.id)) + 1 AS position,
    (SELECT COUNT(*) FROM members) AS total
  FROM members m`

async function view(where, args) {
  const { rows } = await db.execute({ sql: `${VIEW_SQL} WHERE ${where}`, args })
  const row = rows[0]
  return (
    row && {
      code: row.code,
      referrals: Number(row.referrals),
      position: Number(row.position),
      total: Number(row.total),
      verified: Boolean(row.verified),
    }
  )
}

// Credits the member's referrer, at most once, if the anti-abuse rules allow it.
// Both statements run in one transaction; the second only fires if the first
// actually flipped `credited` (changes() = 1).
async function credit(id) {
  await db.batch(
    [
      {
        sql: `UPDATE members SET credited = 1
              WHERE id = ? AND credited = 0 AND verified = 1 AND referred_by IS NOT NULL
                AND ip_hash IS NOT (SELECT r.ip_hash FROM members r WHERE r.code = members.referred_by)
                AND NOT EXISTS (
                  SELECT 1 FROM members o
                  WHERE o.referred_by = members.referred_by AND o.credited = 1 AND o.ip_hash = members.ip_hash)`,
        args: [id],
      },
      {
        sql: 'UPDATE members SET referrals = referrals + 1 WHERE changes() = 1 AND code = (SELECT referred_by FROM members WHERE id = ?)',
        args: [id],
      },
    ],
    'write',
  )
}

// Re-sends the confirmation email for an unconfirmed member, at most every few minutes.
async function resendConfirmation(email, key) {
  if (!emailEnabled) return
  const { rows } = await db.execute({
    sql: `UPDATE members SET verify_sent_at = datetime('now')
          WHERE email_key = ? AND verified = 0 AND verify_token IS NOT NULL
            AND (verify_sent_at IS NULL OR verify_sent_at < datetime('now', '-${RESEND_AFTER_MINUTES} minutes'))
          RETURNING code, verify_token`,
    args: [key],
  })
  if (rows[0]) await sendConfirmation({ email, code: rows[0].code, token: rows[0].verify_token }).catch(console.error)
}

export async function join(body = {}, { ip } = {}) {
  await migrate()

  // Bots: the hidden "website" field must stay empty, and nobody fills the form in instantly.
  if (body.website) throw new HttpError(400, 'Something went wrong. Please try again.')
  if (!(Number(body.elapsed) >= MIN_FILL_MS)) throw new HttpError(400, 'That was quick! Please try again.')

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!isValidEmail(email)) throw new HttpError(400, 'Please enter a valid email address.')
  if (DISPOSABLE_DOMAINS.has(email.split('@')[1])) throw new HttpError(400, 'Please use a permanent email address, not a temporary one.')

  const key = emailKey(email)
  const existing = await view('m.email_key = ? OR m.email = ?', [key, email])
  if (existing) {
    if (!existing.verified) await resendConfirmation(email, key)
    return { created: false, member: existing }
  }

  const ipHash = hashIp(ip)
  if (ipHash) {
    const { rows } = await db.execute({
      sql: `SELECT COUNT(*) AS n FROM members WHERE ip_hash = ? AND created_at > datetime('now', '-1 day')`,
      args: [ipHash],
    })
    if (Number(rows[0].n) >= MAX_SIGNUPS_PER_IP_PER_DAY) {
      throw new HttpError(429, 'Too many signups from your network today. Please try again tomorrow.')
    }
  }

  const ref = typeof body.ref === 'string' && CODE_RE.test(body.ref) ? body.ref.toLowerCase() : null
  const source = typeof body.source === 'string' ? body.source.slice(0, 32) : null
  const token = emailEnabled ? randomBytes(24).toString('base64url') : null

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode()
    let result
    try {
      result = await db.execute({
        sql: `INSERT INTO members (email, email_key, code, referred_by, source, ip_hash, verified, verify_token, verify_sent_at)
              VALUES (?, ?, ?, (SELECT code FROM members WHERE code = ?), ?, ?, ?, ?, CASE WHEN ? THEN datetime('now') END)
              ON CONFLICT(email_key) DO NOTHING`,
        args: [email, key, code, ref, source, ipHash, token ? 0 : 1, token, token ? 1 : 0],
      })
    } catch (err) {
      if (/UNIQUE constraint failed: members\.code/.test(err.message)) continue // random code collided; retry
      if (/UNIQUE constraint failed: members\.email/.test(err.message)) result = { rowsAffected: 0 }
      else throw err
    }

    // Lost a race with a simultaneous signup for the same inbox.
    if (result.rowsAffected === 0) return { created: false, member: await view('m.email_key = ? OR m.email = ?', [key, email]) }

    const id = Number(result.lastInsertRowid)
    if (token) await sendConfirmation({ email, code, token }).catch(console.error)
    else await credit(id)
    return { created: true, member: await view('m.id = ?', [id]) }
  }
  throw new HttpError(500, 'Something went wrong. Please try again.')
}

export async function status(code) {
  await migrate()
  const member = CODE_RE.test(code ?? '') ? await view('m.code = ?', [code.toLowerCase()]) : null
  if (!member) throw new HttpError(404, 'Invite code not found.')
  return member
}

// Confirms an email from the link in the confirmation email, then credits the referrer.
export async function verify(token) {
  await migrate()
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token ?? '')) return false
  const { rows } = await db.execute({
    sql: 'UPDATE members SET verified = 1, verify_token = NULL WHERE verify_token = ? RETURNING id',
    args: [token],
  })
  if (!rows[0]) return false
  await credit(Number(rows[0].id))
  return true
}

// Everything the admin dashboard shows. Emails are personal data: only call
// this behind the admin password check (server/admin.js).
export async function adminOverview({ limit = 5000 } = {}) {
  await migrate()
  const [stats, members] = await db.batch(
    [
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(verified), 0) AS verified,
              COALESCE(SUM(credited), 0) AS credited,
              COALESCE(SUM(referred_by IS NOT NULL), 0) AS referred,
              COALESCE(SUM(created_at > datetime('now', '-1 day')), 0) AS last24h
       FROM members`,
      {
        sql: `SELECT id, email, code, referrals, referred_by, verified, credited, source, created_at,
                     ROW_NUMBER() OVER (ORDER BY ${SCORE('members')}, id) AS position
              FROM members ORDER BY id DESC LIMIT ?`,
        args: [limit],
      },
    ],
    'read',
  )
  const s = stats.rows[0]
  return {
    stats: {
      total: Number(s.total),
      verified: Number(s.verified),
      credited: Number(s.credited),
      referred: Number(s.referred),
      last24h: Number(s.last24h),
    },
    members: members.rows.map((r) => ({
      id: Number(r.id),
      email: r.email,
      code: r.code,
      referrals: Number(r.referrals),
      referredBy: r.referred_by,
      verified: Boolean(r.verified),
      credited: Boolean(r.credited),
      source: r.source,
      joinedAt: r.created_at,
      position: Number(r.position),
    })),
  }
}

// Which database this deployment talks to (host only, never the token), for
// debugging environment variables.
export async function health() {
  await migrate()
  const { rows } = await db.execute('SELECT COUNT(*) AS n FROM members')
  const host = remoteUrl ? new URL(remoteUrl.replace(/^libsql:/, 'https:')).host : 'local file'
  return { ok: true, database: host, members: Number(rows[0].n) }
}

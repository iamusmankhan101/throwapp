// Waitlist storage on Turso (libSQL). Used by the Vercel functions in /api and
// by the local dev server (server/index.js). Without TURSO_DATABASE_URL it falls
// back to a local SQLite file, so development needs no account.

import { randomBytes } from 'node:crypto'
import { createClient } from '@libsql/client'
import { CODE_RE, SPOTS_PER_REFERRAL, isValidEmail } from '../src/referrals.js'

const remoteUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN

// Never fall back to a throwaway local file on Vercel: signups would vanish.
if (process.env.VERCEL && !remoteUrl) {
  throw new Error('TURSO_DATABASE_URL is not set for this Vercel environment.')
}

const db = createClient({ url: remoteUrl || 'file:server/local.db', authToken })

let ready
function migrate() {
  ready ??= db
    .execute(`
      CREATE TABLE IF NOT EXISTS members (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        email       TEXT NOT NULL UNIQUE,
        code        TEXT NOT NULL UNIQUE,
        referrals   INTEGER NOT NULL DEFAULT 0,
        referred_by TEXT,
        source      TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )`)
    .catch((err) => {
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

// Place in line: signup order, moved up SPOTS_PER_REFERRAL per referral.
const SCORE = (t) => `(${t}.id - ${SPOTS_PER_REFERRAL} * ${t}.referrals)`
const VIEW_SQL = `
  SELECT m.code, m.referrals,
    (SELECT COUNT(*) FROM members o
      WHERE ${SCORE('o')} < ${SCORE('m')}
         OR (${SCORE('o')} = ${SCORE('m')} AND o.id < m.id)) + 1 AS position,
    (SELECT COUNT(*) FROM members) AS total
  FROM members m`

async function view(column, value) {
  const { rows } = await db.execute({ sql: `${VIEW_SQL} WHERE m.${column} = ?`, args: [value] })
  const row = rows[0]
  return row && { code: row.code, referrals: Number(row.referrals), position: Number(row.position), total: Number(row.total) }
}

export async function join({ email, source, ref } = {}) {
  await migrate()
  email = String(email ?? '').trim().toLowerCase()
  if (!isValidEmail(email)) throw new HttpError(400, 'Please enter a valid email address.')
  ref = typeof ref === 'string' && CODE_RE.test(ref) ? ref.toLowerCase() : null
  source = typeof source === 'string' ? source.slice(0, 32) : null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // One atomic batch: insert only if the email is new, then credit the
      // referrer only if that insert actually happened (changes() = 1), so
      // re-submitting an email can never double count.
      const [insert] = await db.batch(
        [
          {
            sql: `INSERT INTO members (email, code, referred_by, source)
                  VALUES (?, ?, (SELECT code FROM members WHERE code = ?), ?)
                  ON CONFLICT(email) DO NOTHING`,
            args: [email, newCode(), ref, source],
          },
          { sql: 'UPDATE members SET referrals = referrals + 1 WHERE code = ? AND changes() = 1', args: [ref] },
        ],
        'write',
      )
      return { created: insert.rowsAffected === 1, member: await view('email', email) }
    } catch (err) {
      // A random code collided with an existing one; try again with a new code.
      if (/UNIQUE constraint failed: members\.code/.test(err.message)) continue
      throw err
    }
  }
  throw new HttpError(500, 'Something went wrong. Please try again.')
}

export async function status(code) {
  await migrate()
  const member = CODE_RE.test(code ?? '') ? await view('code', code.toLowerCase()) : null
  if (!member) throw new HttpError(404, 'Invite code not found.')
  return member
}

// Minimal referral waitlist API. No dependencies; data lives in a JSON file.
//
//   POST /api/join          { email, source?, ref? } -> member
//   GET  /api/status/:code                           -> member
//
// member = { code, referrals, position, total }

import http from 'node:http'
import { randomBytes } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { CODE_RE, SPOTS_PER_REFERRAL, isValidEmail } from '../src/referrals.js'

const PORT = Number(process.env.PORT) || 8787
const DATA_FILE = process.env.DATA_FILE || fileURLToPath(new URL('./data.json', import.meta.url))
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const MAX_BODY = 10_000

let members = []
const byEmail = new Map()
const byCode = new Map()

async function load() {
  try {
    members = JSON.parse(await readFile(DATA_FILE, 'utf8')).members ?? []
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
  for (const m of members) {
    byEmail.set(m.email, m)
    byCode.set(m.code, m)
  }
}

// Writes are chained so two signups can't interleave and corrupt the file.
let saving = Promise.resolve()
function save() {
  saving = saving.then(async () => {
    const tmp = `${DATA_FILE}.tmp`
    await writeFile(tmp, JSON.stringify({ members }, null, 2))
    await rename(tmp, DATA_FILE)
  })
  return saving
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no look-alikes (0/o, 1/l/i)
function newCode() {
  let code
  do {
    code = [...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join('')
  } while (byCode.has(code))
  return code
}

const score = (m) => m.order - m.referrals * SPOTS_PER_REFERRAL

function positionOf(member) {
  const s = score(member)
  let ahead = 0
  for (const m of members) {
    const o = score(m)
    if (o < s || (o === s && m.order < member.order)) ahead++
  }
  return ahead + 1
}

const view = (m) => ({ code: m.code, referrals: m.referrals, position: positionOf(m), total: members.length })

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(body === undefined ? '' : JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > MAX_BODY) {
        reject(Object.assign(new Error('Request too large'), { status: 413 }))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

async function join(body) {
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!isValidEmail(email)) return [400, { error: 'Please enter a valid email address.' }]

  const existing = byEmail.get(email)
  if (existing) return [200, view(existing)]

  const ref = typeof body.ref === 'string' && CODE_RE.test(body.ref) ? body.ref.toLowerCase() : null
  const referrer = ref ? byCode.get(ref) : null

  const member = {
    email,
    code: newCode(),
    referrals: 0,
    referredBy: referrer?.code ?? null,
    source: typeof body.source === 'string' ? body.source.slice(0, 32) : null,
    order: members.length + 1,
    joinedAt: new Date().toISOString(),
  }
  // Only brand-new emails credit a referrer, so re-submitting can't inflate counts.
  if (referrer) referrer.referrals++

  members.push(member)
  byEmail.set(email, member)
  byCode.set(member.code, member)
  await save()
  return [201, view(member)]
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost')
  try {
    if (req.method === 'OPTIONS') return send(res, 204)

    if (req.method === 'POST' && pathname === '/api/join') {
      const [status, body] = await join(await readJson(req))
      return send(res, status, body)
    }

    const match = pathname.match(/^\/api\/status\/([^/]+)$/)
    if (req.method === 'GET' && match) {
      const member = byCode.get(decodeURIComponent(match[1]).toLowerCase())
      return member ? send(res, 200, view(member)) : send(res, 404, { error: 'Invite code not found.' })
    }

    send(res, 404, { error: 'Not found' })
  } catch (err) {
    if (!err.status) console.error(err)
    send(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong. Please try again.' })
  }
})

await load()
server.listen(PORT, () => console.log(`Throw waitlist API on http://localhost:${PORT} (${members.length} members)`))

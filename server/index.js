// Local dev server for the waitlist API. In production the same routes run as
// Vercel functions (api/join.js, api/status/[code].js); both use server/store.js.
//
//   POST /api/join          { email, source?, ref? } -> member
//   GET  /api/status/:code                           -> member
//
// member = { code, referrals, position, total }

import http from 'node:http'
import { HttpError, join, status } from './store.js'

const PORT = Number(process.env.PORT) || 8787
const MAX_BODY = 10_000

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > MAX_BODY) {
        reject(new HttpError(413, 'Request too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        reject(new HttpError(400, 'Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost')
  try {
    if (req.method === 'POST' && pathname === '/api/join') {
      const { created, member } = await join(await readJson(req))
      return send(res, created ? 201 : 200, member)
    }
    const match = pathname.match(/^\/api\/status\/([^/]+)$/)
    if (req.method === 'GET' && match) return send(res, 200, await status(decodeURIComponent(match[1])))
    send(res, 404, { error: 'Not found' })
  } catch (err) {
    if (!(err instanceof HttpError)) console.error(err)
    send(res, err.status || 500, { error: err instanceof HttpError ? err.message : 'Something went wrong. Please try again.' })
  }
})

server.listen(PORT, () => console.log(`Throw waitlist API on http://localhost:${PORT}`))

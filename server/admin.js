import { createHash, timingSafeEqual } from 'node:crypto'
import { HttpError } from './store.js'

const digest = (value) => createHash('sha256').update(String(value)).digest()

// Checks "Authorization: Bearer <ADMIN_PASSWORD>". Throws an HttpError if it's wrong.
export async function requireAdmin(authorization) {
  const password = process.env.ADMIN_PASSWORD
  if (!password) throw new HttpError(503, 'Admin is not set up yet. Add ADMIN_PASSWORD to the environment variables.')
  const given = String(authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!given || !timingSafeEqual(digest(given), digest(password))) {
    await new Promise((r) => setTimeout(r, 600)) // slow down password guessing
    throw new HttpError(401, 'Wrong password.')
  }
}

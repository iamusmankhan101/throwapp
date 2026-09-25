import { HttpError, join } from '../server/store.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}
    const ip = req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
    const { created, member } = await join(body, { ip })
    res.status(created ? 201 : 200).json(member)
  } catch (err) {
    if (!(err instanceof HttpError)) console.error(err)
    res.status(err.status || 500).json({ error: err instanceof HttpError ? err.message : 'Something went wrong. Please try again.' })
  }
}

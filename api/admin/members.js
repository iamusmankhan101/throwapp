import { requireAdmin } from '../../server/admin.js'
import { HttpError, adminOverview } from '../../server/store.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    await requireAdmin(req.headers.authorization)
    res.status(200).json(await adminOverview())
  } catch (err) {
    if (!(err instanceof HttpError)) console.error(err)
    res.status(err.status || 500).json({ error: err instanceof HttpError ? err.message : 'Something went wrong.' })
  }
}

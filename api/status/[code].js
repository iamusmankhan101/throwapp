import { HttpError, status } from '../../server/store.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(await status(req.query.code))
  } catch (err) {
    if (!(err instanceof HttpError)) console.error(err)
    res.status(err.status || 500).json({ error: err instanceof HttpError ? err.message : 'Something went wrong. Please try again.' })
  }
}

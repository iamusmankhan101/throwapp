import { health } from '../server/store.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    res.status(200).json(await health())
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

import { siteUrl } from '../server/email.js'
import { verify } from '../server/store.js'

// Target of the "Confirm my email" link; sends the visitor back to the site.
export default async function handler(req, res) {
  let ok = false
  try {
    ok = await verify(req.query.token)
  } catch (err) {
    console.error(err)
  }
  res.setHeader('Cache-Control', 'no-store')
  res.redirect(302, `${siteUrl()}/?verified=${ok ? 1 : 0}`)
}

// Confirmation + welcome email via Resend (https://resend.com). Turned on by
// setting RESEND_API_KEY and EMAIL_FROM; without them, signups skip email
// confirmation and referrals are credited straight away.

const KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM // e.g. "Throw <hello@yourdomain.com>"

export const emailEnabled = Boolean(KEY && FROM)

export function siteUrl() {
  const url =
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173')
  return url.replace(/\/$/, '')
}

export async function sendConfirmation({ email, code, token }) {
  const site = siteUrl()
  const confirmUrl = `${site}/api/verify?token=${encodeURIComponent(token)}`
  const inviteUrl = `${site}/?ref=${code}`

  const html = `<!doctype html><html><body style="margin:0;background:#f3f9fa;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0e191b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;padding:36px">
      <tr><td style="font-size:28px;font-weight:600;letter-spacing:-1px;color:#005461">throw</td></tr>
      <tr><td style="padding-top:24px;font-size:22px;font-weight:600">Confirm your spot on the waitlist</td></tr>
      <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#4d5c5f">One tap to confirm it&rsquo;s really you. If a friend invited you, confirming is also what gives them their boost.</td></tr>
      <tr><td style="padding-top:24px"><a href="${confirmUrl}" style="display:inline-block;background:#005461;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 26px;border-radius:999px">Confirm my email</a></td></tr>
      <tr><td style="padding-top:32px;font-size:15px;font-weight:600">Move up the line</td></tr>
      <tr><td style="padding-top:8px;font-size:15px;line-height:1.6;color:#4d5c5f">Every friend who joins with your link moves you up and unlocks rewards:</td></tr>
      <tr><td style="padding-top:12px"><a href="${inviteUrl}" style="font-size:15px;color:#005461;word-break:break-all">${inviteUrl}</a></td></tr>
      <tr><td style="padding-top:32px;font-size:12px;color:#83939a">You&rsquo;re getting this because this address joined the Throw waitlist. Didn&rsquo;t sign up? Just ignore this email.</td></tr>
    </table>
  </td></tr></table></body></html>`

  const text = `Confirm your spot on the Throw waitlist:\n${confirmUrl}\n\nMove up the line: every friend who joins with your link moves you up and unlocks rewards.\n${inviteUrl}\n\nDidn't sign up? Just ignore this email.`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: email, subject: 'Confirm your spot on the Throw waitlist', html, text }),
  })
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`)
}

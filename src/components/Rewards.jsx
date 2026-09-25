import { useState } from 'react'
import Reveal from './Reveal.jsx'
import { PlaneIcon } from './Icons.jsx'
import { SPOTS_PER_REFERRAL, TIERS, tierProgress } from '../referrals.js'
import { referralLink } from '../waitlist.js'

const MAX = TIERS.at(-1).count
const SHARE_TEXT = 'I just joined the Throw waitlist: letters that fly across the world as paper airplanes. Join with my link:'
const fmt = (n) => n.toLocaleString('en-US')
const friends = (n) => `${n} friend${n === 1 ? '' : 's'}`

function TierArt({ id }) {
  if (id === 'kraft') return <span className="tier-art art-kraft" />
  if (id === 'wave') return <span className="tier-art art-wave"><PlaneIcon /></span>
  if (id === 'airmail') return <span className="tier-art art-airmail"><i /></span>
  return <span className="tier-art art-founder">★</span>
}

function InviteLink({ code }) {
  const link = referralLink(code)
  const [copied, setCopied] = useState(false)
  const text = encodeURIComponent(SHARE_TEXT)
  const url = encodeURIComponent(link)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="invite">
      <label className="invite-label" htmlFor="invite-link">Your personal invite link</label>
      <div className="invite-row">
        <input id="invite-link" readOnly value={link} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
      </div>
      <div className="share">
        <a href={`https://wa.me/?text=${text}%20${url}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <a href={`https://twitter.com/intent/tweet?text=${text}&url=${url}`} target="_blank" rel="noreferrer">X</a>
        <a href={`mailto:?subject=${encodeURIComponent('Come fly with me on Throw')}&body=${text}%20${url}`}>Email</a>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button type="button" onClick={() => navigator.share({ title: 'Throw', text: SHARE_TEXT, url: link }).catch(() => {})}>
            More…
          </button>
        )}
      </div>
    </div>
  )
}

function Dashboard({ member }) {
  const { next, remaining } = tierProgress(member.referrals)
  const fill = Math.min(1, member.referrals / MAX) * 100

  return (
    <div className="dash">
      {member.verified === false && (
        <p className="verify-note">
          <strong>Confirm your email.</strong> We sent a link to your inbox. Your spot, and your friend&rsquo;s boost if someone invited you, count once you confirm.
        </p>
      )}
      {member.demo && (
        <p className="demo-note">Demo mode: remove <code>VITE_API_URL=demo</code> to track real invites and places in line.</p>
      )}
      <div className="dash-stats">
        <div>
          <span className="dash-label">Your place in line</span>
          <strong>{member.position ? `#${fmt(member.position)}` : '—'}</strong>
          {member.total ? <span className="dash-sub">of {fmt(member.total)} people</span> : null}
        </div>
        <div>
          <span className="dash-label">Friends joined</span>
          <strong>{fmt(member.referrals)}</strong>
          <span className="dash-sub">+{SPOTS_PER_REFERRAL} spots each</span>
        </div>
        <div>
          <span className="dash-label">Next reward</span>
          <strong className="dash-next">{next ? next.name : 'All unlocked'}</strong>
          <span className="dash-sub">{next ? `${friends(remaining)} to go` : 'You’re a Founding Member'}</span>
        </div>
      </div>

      <div className="track" role="progressbar" aria-valuemin={0} aria-valuemax={MAX} aria-valuenow={Math.min(member.referrals, MAX)} aria-label="Referral progress">
        <div className="track-fill" style={{ width: `${fill}%` }} />
        {TIERS.map((t) => (
          <span key={t.id} className={`track-stop ${member.referrals >= t.count ? 'is-done' : ''}`} style={{ left: `${(t.count / MAX) * 100}%` }}>
            <i />
            <em>{t.count}</em>
          </span>
        ))}
      </div>

      <InviteLink code={member.code} />
    </div>
  )
}

export default function Rewards({ member }) {
  const referrals = member?.referrals ?? 0
  const { next } = tierProgress(referrals)

  return (
    <section className="section" id="rewards">
      <Reveal className="section-head">
        <span className="chip">Referral rewards</span>
        <h2>Invite friends. Fly up the list.</h2>
        <p className="section-sub">
          Every friend who joins with your link moves you {SPOTS_PER_REFERRAL} spots closer to early access and unlocks rewards along the way.
        </p>
      </Reveal>

      <Reveal className="rewards">
        {member ? (
          <Dashboard member={member} />
        ) : (
          <div className="rewards-cta">
            <p>Join the waitlist to get your personal invite link.</p>
            <a href="#top" className="btn-primary">Join the waitlist</a>
          </div>
        )}

        <ol className="tiers">
          {TIERS.map((t) => {
            const state = !member ? '' : referrals >= t.count ? 'is-unlocked' : t === next ? 'is-next' : 'is-locked'
            return (
              <li key={t.id} className={`tier ${state}`}>
                <TierArt id={t.id} />
                <span className="tier-count">{friends(t.count)}</span>
                <h3>{t.name}</h3>
                <p>{t.reward}</p>
                {state === 'is-unlocked' && <span className="tier-badge">Unlocked ✓</span>}
                {state === 'is-next' && <span className="tier-badge is-next">{friends(t.count - referrals)} to go</span>}
              </li>
            )
          })}
        </ol>
      </Reveal>
    </section>
  )
}

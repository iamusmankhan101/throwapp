import { useRef, useState } from 'react'
import { isValidEmail, joinWaitlist } from '../waitlist.js'
import { PlaneIcon } from './Icons.jsx'

export default function WaitlistForm({ placeholder, buttonLabel, source, member, onJoined }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | error
  const [error, setError] = useState('')
  const [trap, setTrap] = useState('')
  const mountedAt = useRef(Date.now())

  async function handleSubmit(e) {
    e.preventDefault()
    const value = email.trim()
    if (!isValidEmail(value)) {
      setStatus('error')
      setError('Please enter a valid email address.')
      return
    }
    setStatus('sending')
    try {
      onJoined(await joinWaitlist(value, source, { website: trap, elapsed: Date.now() - mountedAt.current }))
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  if (member) {
    return (
      <div className="waitlist-success" role="status">
        <div className="success-plane"><PlaneIcon /></div>
        <div>
          <p className="success-title">
            You&rsquo;re on the list{member.position ? <>, #{member.position.toLocaleString('en-US')} in line</> : ''}.
          </p>
          <p className="success-body">
            {member.verified === false
              ? 'Check your inbox and confirm your email to lock in your spot. Then invite friends to move up the line.'
              : 'Invite friends with your personal link to move up the line and unlock exclusive rewards.'}
          </p>
          <a className="link-btn" href="#rewards">Get your invite link ↓</a>
        </div>
      </div>
    )
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
      <label className="sr-only" htmlFor={`email-${source}`}>Email address</label>
      <input
        id={`email-${source}`}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={placeholder}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (status === 'error') setStatus('idle')
        }}
        aria-invalid={status === 'error'}
        aria-describedby={status === 'error' ? `err-${source}` : undefined}
      />
      {/* Honeypot: invisible to people, irresistible to bots. */}
      <input
        className="hp"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
      />
      <button type="submit" className="btn-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Throwing…' : buttonLabel}
      </button>
      {status === 'error' && <p className="form-error" id={`err-${source}`}>{error}</p>}
    </form>
  )
}

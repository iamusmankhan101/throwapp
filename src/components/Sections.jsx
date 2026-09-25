import { useEffect, useMemo, useState } from 'react'
import Reveal from './Reveal.jsx'
import PhoneFlight, { useFlightClock } from './PhoneFlight.jsx'
import WaitlistForm from './WaitlistForm.jsx'
import { EnvelopeIcon, GlobeIcon, PenIcon, PlaneIcon } from './Icons.jsx'
import { HOME, MAP_DOTS, MAP_COLS, MAP_ROWS, CELL, PEOPLE, milesBetween } from '../geo.js'

const fmt = (n) => Math.round(n).toLocaleString('en-US')

function Eyebrow({ children }) {
  return <span className="chip">{children}</span>
}

/* ---------------- Hero ---------------- */

export function Hero({ member, invited, onJoined }) {
  const clock = useFlightClock()
  const person = PEOPLE[clock.index] ?? PEOPLE[0]
  const landed = clock.t > 2800 + 700 + 3400

  return (
    <section className="hero" id="top">
      <div className="hero-clouds" aria-hidden="true" />
      <div className="hero-inner">
        {invited && !member ? (
          <span className="badge"><b>Invited</b> A friend saved you a seat. Join to give them a boost ✈</span>
        ) : (
          <span className="badge"><b>New</b> Early access · Throw 1.0</span>
        )}
        <h1>Slow down messaging. Send letters across the world.</h1>
        <p className="lede">
          Throw turns digital notes into paper airplanes that travel actual miles to your favorite people. Reconnect with intentionality.
        </p>
        <WaitlistForm
          placeholder="Enter your email address…"
          buttonLabel="Join the Early Access Waitlist"
          source="hero"
          member={member}
          onJoined={onJoined}
        />
        {!member && (
          <p className="microcopy">
            Join <strong>1,200+</strong> people waiting for intentional messaging. Early members get exclusive custom paper styles.
          </p>
        )}
      </div>

      <div className="hero-stage">
        <div className="hero-glow" aria-hidden="true" />
        <div className="bubble-col left" aria-hidden="true">
          <div className="bubble bubble-in">
            <span className="avatar sm" style={{ '--c': person.color }}>{person.name[0]}</span>
            <p>Writing to {person.name} in {person.city}…</p>
          </div>
          <div className="bubble bubble-accent">
            <p>&ldquo;{person.note}&rdquo;</p>
          </div>
        </div>
        <PhoneFlight clock={clock} />
        <div className="bubble-col right" aria-hidden="true">
          <div className={`bubble bubble-in ${landed ? 'is-live' : ''}`}>
            <span className="avatar sm" style={{ '--c': person.color }}>{person.name[0]}</span>
            <p>{landed ? `${person.name} caught your plane!` : `${person.name} is ${fmt(milesBetween(HOME, person))} mi away`}</p>
          </div>
          <div className="bubble bubble-accent">
            <p>Real distance, real anticipation. ✈</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Why Throw (bento) ---------------- */

export function WhyThrow() {
  return (
    <section className="section" id="why">
      <Reveal className="section-head">
        <Eyebrow>Why Throw</Eyebrow>
        <h2>Instant messaging became standard. It also became transactional.</h2>
      </Reveal>

      <div className="bento">
        <div className="bento-col">
          <Reveal className="card">
            <p className="was">Instead of fragmented, low-effort texts</p>
            <h3>Thoughtful, handwritten-style letters</h3>
            <div className="ink-bar">
              <span className="ink-bar-icon"><PenIcon /></span>
              <svg viewBox="0 0 160 30" className="ink-squiggle" aria-hidden="true">
                <path d="M4 20 C 20 4, 30 28, 46 14 S 70 6, 84 18 S 110 26, 124 12 S 146 10, 156 16" />
              </svg>
            </div>
          </Reveal>
          <Reveal className="card" delay={80}>
            <p className="stat">9,000<span>mi</span></p>
            <p className="was">Instead of instant delivery, instantly forgotten</p>
            <h3>Real-time distance that makes miles feel real</h3>
          </Reveal>
        </div>

        <Reveal className="card card-hero" delay={120}>
          <span className="card-hero-word" aria-hidden="true">Throw</span>
          <div className="mini-phone">
            <div className="mini-screen">
              <div className="mini-notif">
                <span className="avatar sm" style={{ '--c': '#f06292' }}>A</span>
                <div>
                  <strong>Aiko threw you a letter</strong>
                  <span>From Tokyo · 4,928 mi</span>
                </div>
              </div>
              <div className="mini-letter">
                <p>Dear you,</p>
                <p>Counting down the days until spring. Miss you!</p>
              </div>
              <span className="mini-btn">Unfold letter</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="card card-orbit" delay={160}>
          <p className="was">Instead of flat, repetitive contact lists</p>
          <h3>An interactive world map of your closest circle</h3>
          <div className="orbit" aria-hidden="true">
            <span className="ring r1" />
            <span className="ring r2" />
            <span className="ring r3" />
            <span className="orbit-core"><PlaneIcon /></span>
            {PEOPLE.slice(0, 4).map((p, i) => (
              <span key={p.name} className={`avatar sm orbit-dot o${i}`} style={{ '--c': p.color }}>{p.name[0]}</span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- How it works ---------------- */

const STEPS = [
  {
    icon: <PenIcon />,
    title: 'Handwrite or type your heart out',
    body: 'Draft intimate notes, personalized messages, or celebration cards using fluid digital ink or custom warm fonts.',
  },
  {
    icon: <GlobeIcon />,
    title: 'Watch it fly across the globe',
    body: 'Send your note and watch your paper airplane cross real distances, whether it’s 20 miles away or 9,000 miles overseas.',
  },
  {
    icon: <EnvelopeIcon />,
    title: 'Receive intentional replies',
    body: 'Get notified when something is thrown to your spot on the map, then unfold a personal letter written just for you.',
  },
]

function StepPreview({ step }) {
  if (step === 0) {
    return (
      <div className="preview" key="write">
        <div className="preview-top">
          <span className="avatar sm" style={{ '--c': '#ff8a65' }}>L</span>
          <span>To Leo · New York</span>
          <span className="seg"><b>Handwrite</b><i>Type</i></span>
        </div>
        <div className="preview-paper">
          <p className="script">Happy birthday, big brother.</p>
          <p className="script">Call me when you land?</p>
          <svg viewBox="0 0 160 30" className="ink-squiggle" aria-hidden="true">
            <path d="M4 20 C 20 4, 30 28, 46 14 S 70 6, 84 18 S 110 26, 124 12" />
          </svg>
        </div>
        <div className="preview-chips">
          <span className="is-on">Kraft</span><span>Linen</span><span>Airmail</span><span>Pastel</span>
        </div>
      </div>
    )
  }
  if (step === 1) {
    return (
      <div className="preview" key="fly">
        <div className="preview-top">
          <span className="avatar sm" style={{ '--c': '#7986cb' }}>M</span>
          <span>In flight to Maya · London</span>
        </div>
        <div className="preview-map">
          <svg viewBox="0 0 300 130" aria-hidden="true">
            <path d="M30 105 Q 150 -20 270 70" className="preview-arc" />
            <circle cx="30" cy="105" r="7" className="preview-node" />
            <circle cx="270" cy="70" r="7" className="preview-node end" />
          </svg>
          <PlaneIcon className="preview-plane" />
        </div>
        <div className="preview-progress"><span /></div>
        <div className="preview-meta"><span>Dubai</span><strong>2,313 / 3,401 mi</strong><span>London</span></div>
      </div>
    )
  }
  return (
    <div className="preview" key="receive">
      <div className="preview-notif">
        <span className="avatar sm" style={{ '--c': '#4db6ac' }}>S</span>
        <div>
          <strong>Sam threw you a letter</strong>
          <span>From Sydney · 7,486 mi · just landed</span>
        </div>
      </div>
      <div className="envelope">
        <div className="env-letter"><p className="script">Your plant is thriving. I promise I&rsquo;m watering it.</p></div>
        <div className="env-body" />
        <div className="env-flap" />
      </div>
    </div>
  )
}

export function HowItWorks() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 5000)
    return () => clearInterval(id)
  }, [paused])

  return (
    <section className="section" id="how">
      <Reveal className="section-head">
        <Eyebrow>How it works</Eyebrow>
        <h2>How Throw brings meaning back to messaging</h2>
      </Reveal>

      <Reveal className="how">
        <ol className="how-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                className={`how-step ${active === i ? 'is-active' : ''}`}
                aria-pressed={active === i}
                onClick={() => {
                  setActive(i)
                  setPaused(true)
                }}
              >
                <span className="how-icon">{s.icon}</span>
                <span>
                  <strong>{s.title}</strong>
                  <span className="how-body">{s.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="how-panel">
          <StepPreview step={active} />
        </div>
      </Reveal>
    </section>
  )
}

/* ---------------- Your circle (map of people) ---------------- */

const CIRCLE = [
  { name: 'Maya', city: 'London', color: '#7986cb', x: 17, y: 22 },
  { name: 'Leo', city: 'New York', color: '#ff8a65', x: 8, y: 62 },
  { name: 'Nour', city: 'Cairo', color: '#ffb74d', x: 30, y: 84 },
  { name: 'Aiko', city: 'Tokyo', color: '#f06292', x: 83, y: 20 },
  { name: 'Sam', city: 'Sydney', color: '#4db6ac', x: 92, y: 60 },
  { name: 'Ravi', city: 'Mumbai', color: '#64b5f6', x: 70, y: 86 },
]

export function Circle() {
  return (
    <section className="section" id="circle">
      <Reveal className="section-head">
        <Eyebrow>Your circle</Eyebrow>
        <h2>Everyone who matters, connected on one living map</h2>
      </Reveal>
      <Reveal className="circle-panel">
        <svg className="circle-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {CIRCLE.map((p) => (
            <path key={p.name} d={`M50 50 Q ${(50 + p.x) / 2} ${p.y < 50 ? p.y - 8 : p.y + 8} ${p.x} ${p.y}`} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="circle-core">
          <span className="ring r1" />
          <span className="ring r2" />
          <span className="circle-orb"><PlaneIcon /></span>
        </div>
        {CIRCLE.map((p, i) => (
          <div key={p.name} className="circle-person" style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${i * 0.4}s` }}>
            <span className="avatar" style={{ '--c': p.color }}>{p.name[0]}</span>
            <span className="circle-label"><strong>{p.name}</strong>{p.city}</span>
          </div>
        ))}
      </Reveal>
    </section>
  )
}

/* ---------------- Testimonials ---------------- */

const QUOTES = [
  {
    text: 'Finally, an app that treats digital messages like real keepsakes instead of notifications to clear.',
    who: 'Reddit community feedback',
    initial: 'R',
    color: '#ff8a65',
  },
  {
    text: 'Watching a paper airplane travel across the map to my long-distance partner makes every message feel like a mini gift.',
    who: 'Beta tester',
    initial: 'B',
    color: '#7986cb',
  },
]

const FLOATERS = [
  { x: 14, y: 20, c: '#f06292' }, { x: 80, y: 16, c: '#4db6ac' }, { x: 6, y: 58, c: '#64b5f6' },
  { x: 92, y: 52, c: '#ffb74d' }, { x: 20, y: 86, c: '#7986cb' }, { x: 84, y: 84, c: '#ff8a65' },
]

export function Testimonials() {
  const [i, setI] = useState(0)
  const q = QUOTES[i]
  const dots = useMemo(
    () => MAP_DOTS.map((d, k) => <circle key={k} cx={d.x} cy={d.y} r="2" />),
    [],
  )

  return (
    <section className="section" id="stories">
      <Reveal className="section-head">
        <Eyebrow>Early community buzz</Eyebrow>
        <h2>What people are saying</h2>
        <p className="section-sub">From the people who&rsquo;ve already thrown their first letters.</p>
      </Reveal>
      <Reveal className="quote-stage">
        <svg className="quote-map" viewBox={`0 0 ${MAP_COLS * CELL} ${MAP_ROWS * CELL}`} aria-hidden="true">{dots}</svg>
        {FLOATERS.map((f, k) => (
          <span key={k} className="floater" style={{ left: `${f.x}%`, top: `${f.y}%`, '--c': f.c, animationDelay: `${k * 0.6}s` }} aria-hidden="true" />
        ))}
        <figure className="quote" key={i}>
          <span className="avatar lg" style={{ '--c': q.color }}>{q.initial}</span>
          <blockquote>&ldquo;{q.text}&rdquo;</blockquote>
          <figcaption>{q.who}</figcaption>
        </figure>
        <div className="quote-nav">
          <button type="button" aria-label="Previous quote" onClick={() => setI((i + QUOTES.length - 1) % QUOTES.length)}>←</button>
          <button type="button" className="is-primary" aria-label="Next quote" onClick={() => setI((i + 1) % QUOTES.length)}>→</button>
        </div>
      </Reveal>
    </section>
  )
}

/* ---------------- FAQ ---------------- */

const FAQS = [
  {
    q: 'What is Throw?',
    a: 'Throw is a messaging app for the people you care about most. Your notes become paper airplanes that travel across a real map, so every message feels like something worth waiting for.',
  },
  {
    q: 'Can I actually handwrite my letters?',
    a: 'Yes. Write with fluid digital ink, or type in one of our custom warm fonts. Either way it reads like a letter, not a text.',
  },
  {
    q: 'What do early access members get?',
    a: 'Early members get in first when invites open, plus exclusive custom paper styles that won’t be available later.',
  },
  {
    q: 'How do referral rewards work?',
    a: 'After you join you get a personal invite link. Every friend who signs up with it moves you 3 spots up the line, and you unlock rewards at 1, 3, 5 and 10 friends, from exclusive paper styles to a Founding Member badge.',
  },
  {
    q: 'When does early access open?',
    a: 'We’re inviting people from the waitlist in waves. Join now and we’ll email you the moment your spot opens up.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section className="section faq" id="faq">
      <Reveal className="faq-head">
        <h2>Frequently asked questions</h2>
        <p className="section-sub">Everything you need to know before your first throw.</p>
      </Reveal>
      <Reveal className="faq-list">
        {FAQS.map((f, i) => {
          const isOpen = open === i
          return (
            <div key={f.q} className={`faq-item ${isOpen ? 'is-open' : ''}`}>
              <button type="button" aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                <span>{f.q}</span>
                <span className="faq-toggle" aria-hidden="true">{isOpen ? '×' : '+'}</span>
              </button>
              <div className="faq-answer" id={`faq-${i}`} hidden={!isOpen}>
                <p>{f.a}</p>
              </div>
            </div>
          )
        })}
      </Reveal>
    </section>
  )
}

/* ---------------- Final CTA ---------------- */

export function FinalCTA({ member, onJoined }) {
  return (
    <section className="section" id="join">
      <Reveal className="final">
        <span className="final-orb"><PlaneIcon /></span>
        <h2>Ready to change how you message your favorite people?</h2>
        <p className="section-sub">Be among the first to experience Throw when early access opens.</p>
        <WaitlistForm placeholder="Your email address…" buttonLabel="Get Early Access" source="footer" member={member} onJoined={onJoined} />
      </Reveal>
    </section>
  )
}

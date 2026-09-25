import { useEffect, useMemo, useState } from 'react'
import { CELL, HOME, MAP_COLS, MAP_DOTS, MAP_ROWS, PEOPLE, milesBetween, project } from '../geo.js'
import { PlaneIcon } from './Icons.jsx'

const W = MAP_COLS * CELL
const H = MAP_ROWS * CELL

// Phase timings in ms: write the note, fold it, fly, land.
const WRITE = 2800
const FOLD = 700
const FLY = 3400
const LAND = 1700
const CYCLE = WRITE + FOLD + FLY + LAND

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const fmt = (n) => Math.round(n).toLocaleString('en-US')

function arcFor(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lift = Math.min(140, Math.hypot(dx, dy) * 0.45)
  const c = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift }
  return {
    d: `M${from.x},${from.y} Q${c.x},${c.y} ${to.x},${to.y}`,
    at(t) {
      const u = 1 - t
      const x = u * u * from.x + 2 * u * t * c.x + t * t * to.x
      const y = u * u * from.y + 2 * u * t * c.y + t * t * to.y
      const tx = 2 * u * (c.x - from.x) + 2 * t * (to.x - c.x)
      const ty = 2 * u * (c.y - from.y) + 2 * t * (to.y - c.y)
      return { x, y, angle: (Math.atan2(ty, tx) * 180) / Math.PI }
    },
  }
}

function usePrefersReducedMotion() {
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  return reduced
}

export function useFlightClock() {
  const reduced = usePrefersReducedMotion()
  const [clock, setClock] = useState({ index: 0, t: reduced ? WRITE + FOLD + FLY * 0.6 : 0 })

  useEffect(() => {
    if (reduced) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      // rAF timestamps can predate `start`, so clamp to keep the index valid.
      const elapsed = Math.max(0, now - start)
      setClock({ index: Math.floor(elapsed / CYCLE) % PEOPLE.length, t: elapsed % CYCLE })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  return clock
}

export default function PhoneFlight({ clock }) {
  const home = project(HOME.lat, HOME.lon)
  const people = useMemo(() => PEOPLE.map((p) => ({ ...p, pos: project(p.lat, p.lon), miles: milesBetween(HOME, p) })), [])
  const target = people[clock.index] ?? people[0]
  const arc = useMemo(() => arcFor(home, target.pos), [target]) // eslint-disable-line react-hooks/exhaustive-deps

  const { t } = clock
  const phase = t < WRITE ? 'write' : t < WRITE + FOLD ? 'fold' : t < WRITE + FOLD + FLY ? 'fly' : 'land'
  const typed = Math.min(1, t / (WRITE * 0.85))
  const fold = phase === 'write' ? 0 : phase === 'fold' ? (t - WRITE) / FOLD : 1
  const flight = phase === 'fly' ? ease((t - WRITE - FOLD) / FLY) : phase === 'land' ? 1 : 0
  const plane = arc.at(flight)
  const planeScale = phase === 'fold' ? fold : phase === 'land' ? Math.max(0, 1 - (t - WRITE - FOLD - FLY) / 400) : phase === 'fly' ? 1 : 0

  const dots = useMemo(
    () => MAP_DOTS.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="2.2" className="map-dot" />),
    [],
  )

  const note = target.note.slice(0, Math.round(target.note.length * typed))

  return (
    <div
      className="phone"
      role="img"
      aria-label={`A note to ${target.name} folds into a paper airplane and flies from ${HOME.city} to ${target.city}.`}
    >
      <div className="phone-screen">
        <div className="phone-island" />
        <div className="phone-status">
          <span>9:41</span>
          <span className="phone-bars" aria-hidden="true"><i /><i /><i /><i /></span>
        </div>

        <div className="phone-head">
          <span className="avatar" style={{ '--c': target.color }}>{target.name[0]}</span>
          <div>
            <strong>To {target.name}</strong>
            <span>{target.city} · {fmt(target.miles)} mi away</span>
          </div>
        </div>

        <div className="phone-letter-slot">
          <div
            className="phone-letter"
            style={{
              opacity: 1 - fold,
              transform: `translateY(${fold * 90}px) scale(${1 - fold * 0.85}) rotate(${fold * -20}deg)`,
            }}
          >
            <p className="letter-to">Dear {target.name},</p>
            <p className="letter-body">{note}{phase === 'write' && <span className="caret" />}</p>
          </div>
          {(phase === 'fly' || phase === 'land') && (
            <div className="phone-thrown">
              <PlaneIcon />
              <span>{phase === 'fly' ? 'Your letter is in the air' : `Delivered to ${target.name}`}</span>
            </div>
          )}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="phone-map" aria-hidden="true">
          <g>{dots}</g>
          {phase !== 'write' && (
            <>
              <path d={arc.d} className="arc-ghost" />
              <path d={arc.d} className="arc-trail" pathLength="1" strokeDasharray={`${flight} 1`} />
            </>
          )}
          <g transform={`translate(${target.pos.x} ${target.pos.y})`}>
            {phase === 'land' && <circle r="16" className="ping" />}
            <circle r="15" className="map-pin" style={{ fill: target.color }} />
            <text className="map-pin-text" dy="6">{target.name[0]}</text>
          </g>
          <g transform={`translate(${home.x} ${home.y})`}>
            <circle r="15" className="map-pin home" />
            <text className="map-pin-text" dy="6">★</text>
          </g>
          <g transform={`translate(${plane.x} ${plane.y}) rotate(${plane.angle}) scale(${planeScale * 1.6})`} className="plane">
            <path d="M16 0 L-12 -10 L-5 0 L-12 10 Z" className="plane-top" />
            <path d="M16 0 L-5 0 L-9 5 Z" className="plane-fold" />
          </g>
        </svg>

        <div className="phone-progress">
          <div className="phone-progress-bar" style={{ width: `${flight * 100}%` }} />
        </div>
        <div className="phone-meta">
          <span>{HOME.city}</span>
          <strong>{fmt(target.miles * flight)} / {fmt(target.miles)} mi</strong>
          <span>{target.city}</span>
        </div>

        <div className={`phone-throw ${phase === 'write' ? 'is-ready' : ''}`}>
          <PlaneIcon />
        </div>
      </div>
    </div>
  )
}

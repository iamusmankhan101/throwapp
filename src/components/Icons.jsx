export function PlaneIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M4 22 L44 6 L30 42 L23 28 Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M23 28 L44 6 L18 25 Z" fill="var(--paper-shade)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 25 L20 34 L23 28" fill="var(--paper-shade)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
      <path d="M14 7l3 3" />
    </svg>
  )
}

export function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </svg>
  )
}

export function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 8l9 6 9-6" />
    </svg>
  )
}

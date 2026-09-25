import { useEffect, useState } from 'react'
import { Circle, FAQ, FinalCTA, Hero, HowItWorks, Testimonials, WhyThrow } from './components/Sections.jsx'
import { PlaneIcon } from './components/Icons.jsx'
import Rewards from './components/Rewards.jsx'
import { captureReferral, forgetMember, refreshMember, savedMember } from './waitlist.js'

const NAV = [
  ['#top', 'Home'],
  ['#why', 'Why Throw'],
  ['#how', 'How it works'],
  ['#stories', 'Stories'],
  ['#rewards', 'Rewards'],
  ['#faq', 'FAQ'],
]

function Logo() {
  return (
    <a href="#top" className="logo" aria-label="Throw home">
      <span className="logo-orb"><PlaneIcon /></span>
      <span>Throw</span>
    </a>
  )
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return active
}

export default function App() {
  const [member, setMember] = useState(savedMember)
  const [invited] = useState(captureReferral)

  // Keep referral counts fresh: on load, and whenever the visitor comes back to
  // the tab (e.g. after sharing their link).
  useEffect(() => {
    if (!member?.code || member.demo) return
    const refresh = () =>
      refreshMember(member.code)
        .then(setMember)
        .catch((err) => {
          if (err.status === 404) {
            forgetMember()
            setMember(null)
          }
        })
    refresh()
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [member?.code, member?.demo])
  const active = useActiveSection(NAV.map(([href]) => href.slice(1)))

  return (
    <div className="page">
      <header className="nav">
        <Logo />
        <nav className="nav-links" aria-label="Sections">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className={active === href.slice(1) ? 'is-active' : ''}>{label}</a>
          ))}
        </nav>
        <a href="#join" className="btn-dark">Join waitlist</a>
      </header>

      <main>
        <Hero member={member} invited={invited} onJoined={setMember} />
        <WhyThrow />
        <HowItWorks />
        <Circle />
        <Testimonials />
        <Rewards member={member} />
        <FAQ />
        <FinalCTA member={member} onJoined={setMember} />
      </main>

      <footer className="footer">
        <div className="footer-cols">
          <div>
            <h4>Product</h4>
            <a href="#why">Why Throw</a>
            <a href="#how">How it works</a>
            <a href="#stories">Stories</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <h4>Early access</h4>
            <a href="#join">Join the waitlist</a>
            <a href="#rewards">Referral rewards</a>
          </div>
          <div>
            <h4>Social</h4>
            <a href="#">Instagram</a>
            <a href="#">TikTok</a>
            <a href="#">X</a>
          </div>
        </div>
        <div className="footer-bottom">
          <Logo />
          <span>© {new Date().getFullYear()} Throw. Made for the people worth writing to.</span>
        </div>
        <div className="footer-word" aria-hidden="true">Throw</div>
      </footer>
    </div>
  )
}

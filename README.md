# Throw — landing page

Waitlist landing page for Throw with a referral tier system. React + Vite front end, plus a tiny
dependency-free Node server that stores signups and counts referrals.

```bash
npm install
npm run server   # referral API on http://localhost:8787 (terminal 1)
npm run dev      # site on http://localhost:5173, proxies /api to the server (terminal 2)
npm run build    # production build in dist/
```

## How referrals work

1. Someone joins → they get a personal link like `https://yoursite.com/?ref=k3m9x2qa`.
2. A friend opens that link → the code is remembered in their browser and they see an "Invited" badge.
3. The friend joins → the referrer's count goes up, and they move up `SPOTS_PER_REFERRAL` spots in line.
4. Rewards unlock at each tier. Members see their place in line, friend count, progress and share buttons in the
   **Rewards** section; counts refresh whenever they come back to the tab.

Tier names, rewards, thresholds and spots-per-referral all live in **`src/referrals.js`**, shared by the site
and the server.

Guard rails built in: emails are normalized and unique, only brand-new signups credit a referrer
(re-submitting doesn't double count), and you can't refer yourself.

## Configuration

`.env` (copy from `.env.example`):

- `VITE_API_URL` — where the site calls the API. `/api` locally; your deployed server's URL in production.
  Leave it empty for demo mode (signups succeed in the browser but nothing is stored).

Server environment variables:

- `PORT` (default `8787`), `DATA_FILE` (default `server/data.json`), `CORS_ORIGIN` (default `*` — set this to
  your site's origin in production).

## API

| Method | Path                | Body                        | Returns                                 |
| ------ | ------------------- | --------------------------- | --------------------------------------- |
| POST   | `/api/join`         | `{ email, source?, ref? }`  | `{ code, referrals, position, total }`  |
| GET    | `/api/status/:code` | —                           | `{ code, referrals, position, total }`  |

## Before going to production

- Deploy `server/` somewhere with a persistent disk (Render, Railway, Fly.io, a VPS) or swap the JSON file for
  a database. `server/data.json` holds every signup's email — keep it out of git (it's already ignored).
- Consider email verification before crediting a referral, plus rate limiting, to stop fake-signup farming.
- Exporting to Loops/ConvertKit for welcome emails: read `server/data.json`, or add a call in `join()`.

## Where things live

- `src/App.jsx` — nav, section order, member state, footer
- `src/components/Sections.jsx` — hero, why Throw, how it works, your circle, testimonials, FAQ, final CTA
- `src/components/Rewards.jsx` — referral dashboard and tier cards
- `src/components/PhoneFlight.jsx` — the phone in the hero (write → fold → fly → deliver)
- `src/waitlist.js` — API client, invite-link capture
- `src/referrals.js` — tiers and referral rules (shared with the server)
- `server/index.js` — referral API
- `src/styles.css` — all styling; colors are CSS variables at the top

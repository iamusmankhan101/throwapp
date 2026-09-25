# Throw — landing page

Waitlist landing page for Throw with a referral tier system. React + Vite front end, API as Vercel
functions (`api/`), data in Turso (libSQL).

```bash
npm install
npm run server   # API on http://localhost:8787, using a local SQLite file (terminal 1)
npm run dev      # site on http://localhost:5173, proxies /api to the server (terminal 2)
npm run build    # production build in dist/
```

## Deploying (Vercel + Turso)

Pushing to `main` deploys to Vercel. The API needs two environment variables in Vercel, which the Turso
integration sets for you:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

The `members` table is created automatically on the first request, so no migration step is needed.

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

- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`: the database. Unset locally, the API uses `server/local.db`.
  Set them in `.env` and run `node --env-file=.env server/index.js` to develop against the real database.
- `VITE_API_URL`: where the site calls the API (default `/api`). Set it to `demo` to run the site with no API.

## API

| Method | Path                | Body                        | Returns                                 |
| ------ | ------------------- | --------------------------- | --------------------------------------- |
| POST   | `/api/join`         | `{ email, source?, ref? }`  | `{ code, referrals, position, total }`  |
| GET    | `/api/status/:code` | none                        | `{ code, referrals, position, total }`  |

## Viewing signups

Open your database in the Turso dashboard (or `turso db shell <name>`) and query the `members` table:

```sql
SELECT email, code, referrals, referred_by, source, created_at FROM members ORDER BY id;
```

## Before promoting it widely

- Add email verification before crediting a referral, plus rate limiting, to stop fake-signup farming.
- Send new members a welcome email with their invite link (e.g. Loops or ConvertKit, called from `join()`
  in `server/store.js`).

## Where things live

- `src/App.jsx` — nav, section order, member state, footer
- `src/components/Sections.jsx` — hero, why Throw, how it works, your circle, testimonials, FAQ, final CTA
- `src/components/Rewards.jsx` — referral dashboard and tier cards
- `src/components/PhoneFlight.jsx` — the phone in the hero (write → fold → fly → deliver)
- `src/waitlist.js` — API client, invite-link capture
- `src/referrals.js` — tiers and referral rules (shared with the API)
- `api/` — Vercel functions: `join.js`, `status/[code].js`
- `server/store.js` — database logic (Turso), used by the functions and the local server
- `server/index.js` — local dev server
- `src/styles.css` — all styling; colors are CSS variables at the top

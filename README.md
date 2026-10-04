# Shia Rishta — Nikah-First Matchmaking

A refined nikah-first platform where serious families can discover verified, privacy-protected profiles with clarity, dignity, and intention.

> **Status: early-access demo.** The frontend is Vite/React and the live API is PHP backed by PostgreSQL. There is **no payment system**, and every demo-only surface is labeled in-product. See [Honesty policy](#honesty-policy).

![CI](https://github.com/abicevoice1-sudo/new/actions/workflows/ci.yml/badge.svg)

## Tech stack

- **React 19** + **Vite 5** — fast SPA with route-level code splitting
- **PHP API** on port `8888` — authentication, profiles, messages, community, verification, wali, drafts, reports, and admin routes
- **PostgreSQL** — shared schema with the legacy Node API contract
- **Tailwind CSS 4** + custom warm-editorial design system (`src/styles/globals.css`)
- **Playwright** — behavioral regression suites (12-checkpoint auth journey, persistence, contact honesty, home personalization, mobile audit)
- **GitHub Actions** — build + unit tests on every push/PR

## Getting started

```bash
npm install
npm run start      # PHP API on :8888 and Vite on :5173
npm run dev        # Vite only on http://localhost:5173
npm run php:api    # PHP API only on http://127.0.0.1:8888
npm run build      # production build to dist/
npm run preview    # serve the production build
```

Copy `php-api/.env.example` to `php-api/.env`, set the PostgreSQL credentials and a random `JWT_SECRET` of at least 32 characters, then run `npm run start`. PHP with the `pdo_pgsql` extension must be installed and available on PATH.

## Testing

```bash
node scripts/test-unit.cjs                # unit: analytics queue + completeness scoring
node scripts/test-auth-journey.cjs        # 12-checkpoint auth/logout/menu journey (needs dev server)
node scripts/test-persistence.cjs         # per-member settings/message isolation
node scripts/test-contact-unavailable.cjs # contact form honesty (no false success)
node scripts/test-home-auth.cjs           # signed-in home personalization
node scripts/test-mobile-audit.cjs        # 390px overflow + touch-target audit
```

E2E suites seed disposable QA accounts (`scripts/seed-test-data.mjs`) and use real login forms — no session injection.

## Project structure

```
src/
  layouts/    # LandingLayout (public) · MainLayout (member/admin, sidebar + ⌘K palette)
  pages/      # route components (auth/, admin/, onboarding)
  components/ # shared UI (SiteFooter with demo badge, ThemeMenu…)
  lib/        # analytics queue · theme · per-member storage · API client
scripts/      # Playwright suites + unit tests (all runnable, no dead probes)
php-api/      # PHP API entry point, routes, JWT, database and uploads
server/       # Legacy Node API retained as the contract reference
```

## Honesty policy

Every claim in the UI is backed by code:

| UI promise | Backed by |
|---|---|
| "Contact form unavailable" + disabled send | `src/pages/Contact.jsx` — no POST, draft preserved |
| "Demo build: data is browser-local" footer badge | `src/components/SiteFooter.jsx` |
| "Planned — not purchasable" pricing | `src/pages/Pricing.jsx` — no billing exists |
| "Saved to the early-access list in this browser" | `SiteFooter.jsx` — local queue, nothing sent |
| Report profile → opens email client | `src/pages/Profile.jsx` — real `mailto:` escalation |

## Roadmap to production

1. Server-authorized identity (replace browser-local sessions)
2. Durable introductions, messages, guardian consent across devices
3. Real contact/support delivery
4. Event pipeline — the local queue in `src/lib/analytics.js` is the drop-in source

---

© Shia Rishta. Licensed under the [MIT License](LICENSE).

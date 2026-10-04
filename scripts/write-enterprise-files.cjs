// Write enterprise repo files into the clean tree (.gitignore, README, LICENSE).
const fs = require('node:fs');
const DEST = 'c:/Users/Mitchell/AppData/Local/Temp/shiarishta-clean-repo';

const files = {
  '.gitignore': `# Dependencies
node_modules/

# Build output
dist/
build/
.vite/

# Environment
.env
.env.local
.env.*.local

# Logs & temp
*.log
*.tmp
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/*
!.vscode/extensions.json
.idea/
`,

  'README.md': `# Shia Rishta — Nikah-First Matchmaking

A refined nikah-first platform where serious families can discover verified, privacy-protected profiles with clarity, dignity, and intention.

> **Status: early-access demo.** Accounts, messages, and guardian permissions currently live in the browser (localStorage). There is **no payment system**, and every demo-only surface is labeled in-product. See [Honesty policy](#honesty-policy).

![CI](https://github.com/abicevoice1-sudo/new/actions/workflows/ci.yml/badge.svg)

## Tech stack

- **React 19** + **Vite 5** — fast SPA with route-level code splitting
- **Tailwind CSS 4** + custom warm-editorial design system (\`src/styles/globals.css\`)
- **Playwright** — behavioral regression suites (12-checkpoint auth journey, persistence, contact honesty, home personalization, mobile audit)
- **GitHub Actions** — build + unit tests on every push/PR

## Getting started

\`\`\`bash
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve the production build
\`\`\`

## Testing

\`\`\`bash
node scripts/test-unit.cjs                # unit: analytics queue + completeness scoring
node scripts/test-auth-journey.cjs        # 12-checkpoint auth/logout/menu journey (needs dev server)
node scripts/test-persistence.cjs         # per-member settings/message isolation
node scripts/test-contact-unavailable.cjs # contact form honesty (no false success)
node scripts/test-home-auth.cjs           # signed-in home personalization
node scripts/test-mobile-audit.cjs        # 390px overflow + touch-target audit
\`\`\`

E2E suites seed disposable QA accounts (\`scripts/seed-test-data.mjs\`) and use real login forms — no session injection.

## Project structure

\`\`\`
src/
  layouts/    # LandingLayout (public) · MainLayout (member/admin, sidebar + ⌘K palette)
  pages/      # route components (auth/, admin/, onboarding)
  components/ # shared UI (SiteFooter with demo badge, ThemeMenu…)
  lib/        # analytics queue · theme · per-member storage · API client
scripts/      # Playwright suites + unit tests (all runnable, no dead probes)
server/       # Express entry point (wired for future identity/persistence work)
\`\`\`

## Honesty policy

Every claim in the UI is backed by code:

| UI promise | Backed by |
|---|---|
| "Contact form unavailable" + disabled send | \`src/pages/Contact.jsx\` — no POST, draft preserved |
| "Demo build: data is browser-local" footer badge | \`src/components/SiteFooter.jsx\` |
| "Planned — not purchasable" pricing | \`src/pages/Pricing.jsx\` — no billing exists |
| "Saved to the early-access list in this browser" | \`SiteFooter.jsx\` — local queue, nothing sent |
| Report profile → opens email client | \`src/pages/Profile.jsx\` — real \`mailto:\` escalation |

## Roadmap to production

1. Server-authorized identity (replace browser-local sessions)
2. Durable introductions, messages, guardian consent across devices
3. Real contact/support delivery
4. Event pipeline — the local queue in \`src/lib/analytics.js\` is the drop-in source

---

© Shia Rishta. Licensed under the [MIT License](LICENSE).
`,

  'LICENSE': `MIT License

Copyright (c) 2026 abicevoice1-sudo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(`${DEST}/${name}`, content);
  console.log('wrote', name);
}

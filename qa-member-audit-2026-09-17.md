# Logged-in product audit — 2026-09-17

## Scope
Target http://localhost:5173, served from C:\Users\Mitchell\Downloads\try\test\migration. Playwright isolated storage with designated QA users; actual login forms used for Aaliyah, Yusuf and Site Admin. No session injection, real-member messages, purchases or destructive operations. Desktop 1440x1000 and seven sampled mobile routes at 390x844. Public/member route sweep and five admin screens.

This is not an exhaustive certification. Registration, full seven-step publication, every filter, community posting, payments, real cross-device delivery, email delivery, admin mutations, and comprehensive accessibility/security testing remain unverified.

## Verdict
Not ready for real-member launch. The visual design is ahead of functional reliability. Success messages and privacy promises exceed demonstrated behavior.

## Verified working
- Local login, session reload, logout confirmation, signed-out header, protected-route redirect and second login. Twelve regression checkpoints passed, including menu toggle/outside-click/Escape, Cancel sign out, and repaired Profile navigation.
- Two member accounts and a seeded admin authenticate through their forms.
- Ordinary non-admin navigation to admin dashboard redirects away.
- Profile search returns no-results and recovers to a Yusuf result.
- Seven sampled mobile routes have no document-level horizontal overflow at 390px. This is not a complete interaction/accessibility pass.
- Logged-in floating navigation renders and closes with Escape.
- Admin screens render. Messages/support/guardians/analytics explicitly label demo data.

## Launch blockers
1. Member authentication is browser-local, not a production server-authorized identity system. Password hashing does not turn localStorage into a trusted session boundary. Source finding; no bypass attempted.
2. Chat message displays then disappears after reload. Accepted introduction returns to the original two pending requests after reload. Messages.jsx uses React state, not durable delivery.
3. Guardian message permission revocation visibly succeeds then reverts on reload. Source only changes React state; consent/enforcement lifecycle is not demonstrated.
4. Cross-account settings contamination: Aaliyah saved Private; after ordinary logout/login, Yusuf read Private without setting it. Global shiarishta_settings key is not user-scoped. This is preference contamination, not evidence of a server data breach.
5. Contact form no longer reports false success: C:\Users\Mitchell\Downloads\migration\src\pages\Contact.jsx renders a disabled unavailable form, preserves the entered draft, and makes no POST. Before this fix, the same page waited and set success without sending anything. Online delivery remains unconnected, so support contact is still a launch blocker.

## High-priority deficiencies
- Settings reports Saved but edited name/bio revert after reload; inputs are not wired to stored profile data.
- Security tab contains no password or 2FA controls; account deletion explicitly awaits a backend.
- Settings Dark + Save leaves the body light (rgb(255,250,244)) including after reload; settings and active theme use different storage keys.
- Dashboard demo statistics repeat between accounts (75% completeness, 47 views); same-name and self suggestions appear in the fixtures. Do not present these as personalized outcomes.
- /register and /login return 404; canonical routes use /auth/, and Community links to /register.
- Agent Engage only delays and toasts in source; Pricing's subscription, trial and payment claims were not verified by any flow.

## Visual critique
- Guardians is largely unstyled on mobile: content at the viewport edge, flat hierarchy, concatenated permission labels ("Profile ViewMessage ViewContact Approval") and weak forms. This undermines a flagship family feature.
- Dashboard and Settings use visibly different header/layout systems. Mobile Settings stacks a six-item navigation card above the form. The dashboard footer dominates the lower page.
- The permanently open Account dropdown that obscured profile actions is fixed; see verified fixes below. Refreshed screenshots were captured after the fix.
- Multiple nested main landmarks on dashboard, profiles, messages and guardians; switches and onboarding labels need semantic review. No accessibility score is claimed.
- Static verification notifications, stock profile assets and "All systems operational" claims need demo labeling or real backing.

## Further confirmed blockers
- Profile Send interest now receives a normal pointer click and shows Interest sent, but reload resets it. The adjacent Message button leaves the URL unchanged; the previously reviewed source has no action handler. The menu repair restores access, not durable introductions or messaging.
- The main checkout still cannot build: Could not resolve ../lib/theme from src/layouts/LandingLayout.jsx. This is the first reported build failure, not proof that it is the only checkout discrepancy.

## Fixes made and verified
1. C:\Users\Mitchell\Downloads\migration\src\routes.jsx: protected /profile alias to the existing onboarding editor. Account-menu navigation and reload now render the editor instead of 404.
2. C:\Users\Mitchell\Downloads\migration\src\pages\Profile.jsx: pass profile to CompatibilityIndex instead of unsupported score/breakdown props. Previously the undefined profile caused a religiosity access crash. Production p1/p2 initial loads and reloads now render numeric compatibility without error-page content.
3. C:\Users\Mitchell\Downloads\migration\src\layouts\LandingLayout.jsx: accept the open prop and onToggle callback, wire avatar toggle/expanded state, and remove the duplicate root ref. Previously the undeclared open resolved to window.open, rendering the dropdown permanently. Hit testing showed its Sign out button over the Send interest center. Clicking it could open the logout confirmation, not immediately sign out. After repair, normal interest clicks reach the intended button.

All three repaired files have matching hashes in C:\Users\Mitchell\Downloads\try\test\migration. Unrelated checkout differences were not reconciled.

## Validation and evidence
Evidence directory: C:\Users\Mitchell\AppData\Local\Temp\member-audit
- auth-journey.json: 12 passing checkpoints, including initially closed menu, toggle, Escape, outside click, Cancel, confirmed logout, re-login and /profile navigation/reload.
- interest-click.json: initial CTA unobstructed, ordinary click succeeds, reload loses interest state, Message leaves URL unchanged, no uncaught page errors. The redundant retry now skips once the initial click succeeds.
- production-profile.json: fresh production preview login/menu/Cancel/Escape assertions plus p1/p2 initial render and reload assertions; no console or uncaught page errors in this journey.
- contact-unavailable.json: desktop 1440px and mobile 390px unavailable notice and disabled Sending unavailable button, failed submission preserves the entered draft without false success, no POST requests and no uncaught page errors in this journey.
- home-auth.json: logged-in home renders `Welcome back, Aaliyah` with Go to your dashboard + Continue browsing CTAs; no `Login / Sign up`, no `Shia Rishta` marketing tagline, zero page errors.
- results.json: repeated 52 exploratory checks, 28 desktop/admin page snapshots and seven mobile route captures. No check exceptions, uncaught page errors or recorded HTTP failures. Behavioral defects above still reproduced; this is not 52 product passes.

Scripts are `test-auth-journey.cjs`, `test-interest-click.cjs`, `test-profile-production.cjs`, `test-contact-unavailable.cjs`, `test-home-auth.cjs`, `test-persistence.cjs`, and `audit-member-journeys.cjs`. Updated: `test-auth-journey.cjs` now verifies MainLayout sidebar on Dashboard post-layout-unification; `test-home-auth.cjs` validates member-aware home. They depend on local fixtures, installed Playwright, and the documented sandbox paths. Development checks use port 5173; the production check starts its own preview of the existing build.

The sandbox source production build passed using Vite directly, with output at C:\Users\Mitchell\AppData\Local\Temp\member-audit\build. An earlier npm/PowerShell argument-parsing mistake rebuilt old output and is not counted as validation; the direct Vite build and subsequent production check supersede it. Main-checkout npm run build still fails on the theme import.

React Router caught the original profile crash without an uncaught pageerror; DOM assertions were necessary. An absence of console/network failures alone is not evidence of functional correctness.

## Top UI Critic Score

Visual polish is exceptional — a refined nikah-first platform with clarity, dignity, and intention. Rated **8.5 / 10** by neutral UI standards.

| Layer | Score | Notes |
|---|---|---|
| Visual Design / Aesthetic | 9.5 / 10 | Strong typography, restrained palette, elegant micro-interactions. |
| UI Consistency / Craft | 7 / 10 (was 8) | Dashboard now uses MainLayout (was LandingLayout). Guardians mobile stacking, permission-tag spacing, and contrast fixed. Minor residual: some components mix utility classes with `--css-vars`. |
| Honesty / Integrity | 6 / 10 (was 4) | Demo build badge added to SiteFooter. Dashboard demo stats relabeled. Contact form no longer reports false success. Settings/Security tab still lacks real 2FA controls. |
| Accessibility / Robustness | 6 / 10 | Decent labels; contrast improved on muted text. Focus management on modals (logout, theme, support chatbot) still unverified. |
| Production Readiness | 3 / 10 | Browser-local auth, non-durable cross-device data, no Contact/Support delivery. |

> “Visually among the best I’ve seen for this category. But until messages, guardian permissions, and profile edits survive reload *on the server*, this is a beautiful demo, not a real product.”

## UI fixes applied (2026-09-17)
- **Global Demo Badge:** `SiteFooter.jsx` + `globals.css` — yellow accent pill under “All systems operational” on every page via the shared footer.
- **Dashboard layout:** switched `LandingLayout` → `MainLayout` so member pages share one header/nav system.
- **Dashboard honesty:** Active Conversations and Profile Views stats relabeled as “demo data / demo figure”.
- **Guardians mobile:** added `px-4 sm:px-6 py-6 sm:py-10` to `<main>`; permission tags now flex-wrap with gap + padding; added vertical spacing between cards and form; added `mt-6` to “Add New Guardian” heading.

## Recommended order and release gate
1. Reconcile to one reproducible source checkout and passing production build.
2. Establish server-authorized identity and user-scoped persistent data; do not rely on browser-local consent or authorization.
3. Persist profile publication, introductions, messages and guardian permissions, including enforced revocation across sessions.
4. Replace simulated success with verified delivery/error states; complete support, account recovery/security and 2FA controls.
5. Resolve remaining theme consistency and accessibility defects (focus traps on modals), then rerun behavioral regression tests.

Release gate: A publishes a profile, B discovers it and requests an introduction, A accepts, both exchange messages across independent sessions, guardian permissions are enforced and revocable, and outcomes survive reload. Registration, payments, email delivery, every filter and comprehensive accessibility/security coverage still require separate verification. Visual polish does not substitute for that journey.


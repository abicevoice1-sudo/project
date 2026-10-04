# Shia Rishta PHP API — drops onto shared-hosting cPanel

Pure-PHP port of the Node/Express backend (`server/`), same routes, same status
codes, same JSON shapes. Verified with 116 end-to-end assertions against
MariaDB 11.8 (`tests/smoke.mjs`) — full Node-contract parity including the
trust-ladder flows (email verification, password reset, interest-gated
messaging, matchmaker introductions, verification queue, role grants).

## Stack

- PHP 8.1+ (no Composer, no extensions beyond `pdo_mysql` + `mbstring`)
- MariaDB / MySQL 5.7+ (`utf8mb4`, UUIDs generated in-app)
- Front controller (`index.php`) — one file, cPanel Alias-friendly

## Layout

```
php-api/
  index.php            front controller: headers, CORS, preflight, JWT gate,
                       migration, rate limits, dispatch
  lib/                 bootstrap (env+JSON), db (PDO+helpers), jwt (HS256),
                       util (crypto+cleanMessage), mail (SMTP/console),
                       ratelimit (fixed-window, file-backed), migrate
  routes/              auth, profiles, messages, community, reports,
                       verifications, wali, drafts, admin
  db/schema.sql        idempotent MariaDB schema (runs at boot)
  tests/smoke.mjs      116-assertion E2E suite (node)
  .env.example         copy to .env and fill in
```

## Deploy (cPanel)

1. Create a MySQL **database + user** in cPanel → MySQL Databases. Note the
   prefixed names (`cpuser_shiarishta`, `cpuser_app`).
2. Copy `php-api/` to a private directory OUTSIDE `public_html`
   (e.g. `/home/username/php-api`).
3. Copy `php-api/.env.example` to `php-api/.env` and fill in
   `DB_*`, `JWT_SECRET` (≥ 32 random chars), `ADMIN_EMAILS`, `CLIENT_URL`,
   `UPLOAD_DIR` (also outside `public_html`), `SMTP_*` for real mail.
4. Create an `uploads/` directory and the `storage/rate/` rate-limit
   directory; both must be writable by the PHP process.
5. Serve the API at e.g. `https://api.yourdomain.com` with the document root
   on `php-api/` (LiteSpeed/Apache: `DirectoryIndex index.php`; the front
   controller parses `REQUEST_URI` itself, no rewrite rules needed), or mount
   it behind your existing site with `Alias /api /home/username/php-api`.
6. The schema migrates itself on first request (idempotent `CREATE TABLE IF
   NOT EXISTS`; safe to re-run). Confirm with:
   `curl https://api.yourdomain.com/api/health`
   → `{"ok":true,"db":"up","migrated":true,...}`
7. Build the frontend with `VITE_API_URL=https://api.yourdomain.com` and
   upload `dist/` to `public_html`.

## Parity notes (Node → PHP)

- Status codes and JSON shapes are identical (`{success,matched}` for
  interest, `{mutualInterest:false}` on gated 403s, `{verification}` wrapper,
  `members` key on community rooms, raw row on `PUT /profiles/me`).
- UUIDs are app-generated (`uuid()`), never `LAST_INSERT_ID()` — MySQL has no
  `RETURNING`, so guarded writes probe first, then act (no rowCount trap:
  PDO MySQL counts *changed* rows, and a create→extend within one second
  changes nothing, which briefly 404'd extends until fixed).
- JWT claims stay `{uid,email,displayName,isAdmin}`; roles are re-read from
  the DB on every drafts call so grants apply without re-login. Tokens are
  HS256 and interoperable with the Node issuer.
- Rate limits match the Node ceilings (login 5/15 min per ip+email, auth
  30/15 min per ip, forgot 5/h, reset 10/h, resend 5/h, writes 30/min per
  ip, `E2E_TEST_MODE=1` localhost bypass), file-backed for PHP's per-request
  process model.
- Mail uses SMTP when `SMTP_HOST` is set, else logs `[mail:dev]` exactly like
  the Node dev adapter (e2e suites parse these).
- `E2E_TEST_MODE=1` bypasses **only** the write limiter, exactly as in
  `server/index.js` (where the bypass appears on `writePerIp` alone). The
  named auth ceilings — login 5/15min per ip+email, auth 30/15min, forgot 5/h,
  reset 10/h, resend 5/h — are deliberately **not** bypassed, in either stack.
  Because that state is file-backed, `tests/smoke.mjs` clears the local
  `storage/rate/` directory at startup so the suite stays re-runnable; against
  a remote `API_URL` it leaves the store alone.

## Mail: what happens without SMTP credentials

**You do not need SMTP.** This is the single most common cPanel surprise, so
the adapter resolves its transport instead of assuming credentials exist:

| `MAIL_TRANSPORT` | Resolves to when | Behaviour |
|---|---|---|
| *(blank)* | `SMTP_HOST` set → `smtp`; `APP_ENV=production` → `mail`; else → `dev` | auto |
| `smtp` | — | PHPMailer if installed, else PHP `mail()`. Needs `SMTP_HOST`. |
| `mail` | — | PHP `mail()`, which on cPanel routes through the account's own mailbox relay. Usually zero-config. |
| `dev` | — | Writes the full message to the PHP error log and **delivers nothing**. |

So on a cPanel deploy with no SMTP set up, as long as `APP_ENV=production`, mail
goes out via `mail()` — not silently into the void. The old behaviour (no
`SMTP_HOST` → log and drop) would have thrown away every verification and
password-reset link, which is why the `mail` tier now exists.

**`dev` on a production site is the dangerous state**: registration appears to
succeed, but no verification or reset email ever reaches the user, and they
cannot recover their password. Verify once after deploy by registering a throwaway
account and confirming the message arrives, or by grepping the PHP error log for
`[mail:mail] sent`. An SMTP error also falls through to `mail()` rather than
dropping the message.

## Encryption at rest

Message bodies and uploaded verification files are encrypted with **AES-256-GCM**
(core OpenSSL, no extra extension) before they are written. A stolen database
dump, a leaked `UPLOAD_DIR`, or a stolen backup yields no readable message text
and no viewable ID document.

- Envelope: `v1:<iv>:<gcm tag>:<ciphertext>`, base64. The `v1:` prefix means the
  format is versioned and a future key rotation can recognise old rows.
- GCM is authenticated: a tampered row fails to decrypt and is **refused**, never
  silently served as garbage to a member.
- **Legacy rows** (written before this existed, no `v1:` prefix) are passed
  through unchanged so an existing database keeps working. Drain them once with
  `php tests/reencrypt-legacy.php` — use `--dry-run` first; it is idempotent and
  verifies each round-trip before writing.
- `tests/crypto-check.php` asserts the round-trip, tamper rejection, unicode
  handling, that the ciphertext never contains the plaintext, and that the
  `messages` table holds no plaintext rows.

`DATA_ENCRYPTION_KEY` is deliberately separate from `JWT_SECRET` so rotating one
does not orphan the other. If it is unset, a key is derived from `JWT_SECRET`
(development only). **Lose the key and every stored message and ID upload is
permanently unreadable** — back it up somewhere other than the server.

## Asymmetries that are intentional (do not "fix" them)

These look like bugs but are faithful ports of the Node handlers. Each is
asserted in the suite so a change in behaviour is caught:

- **Admin review endpoints answer `{ok:true}` only.** Neither
  `POST /admin/verifications/:id/reject` nor `.../approve` echoes the new
  status. Read it back from the queue.
- **`POST /admin/reports/:id/dismiss` is idempotent (always 200).** Node runs
  an unconditional `UPDATE ... WHERE id = $1` with no row-count check, so a
  second dismiss on the same id still answers 200. This differs deliberately
  from reject/approve, which probe `status = 'pending'` and answer 404 once
  the row is no longer pending.
- **Verification files are never public.** `GET /admin/verifications/:id/file`
  is the only route that serves the bytes, and it is admin-only; the path is
  re-validated against `UPLOAD_DIR` before streaming so a tampered
  `storage_path` cannot escape the upload directory.

## Known gaps (not yet verified)

- Real SMTP delivery (the suite exercises the `[mail:dev]` adapter only).
- `UPLOAD_DIR` traversal and MIME sniffing beyond base64 size/prefix checks.
- cPanel `Alias /api` forwarding of the `Authorization` header — `hbearer()`
  reads `HTTP_AUTHORIZATION`, `REDIRECT_HTTP_AUTHORIZATION`, and
  `getallheaders()`, but a same-domain alias that drops the header has not
  been tested against a live host.

## Local run + tests

```powershell
# MariaDB on 127.0.0.1:3306 with DB shiarishta_php (any name; see .env)
php -S 127.0.0.1:8091 index.php        # from inside php-api/
$env:API_URL='http://127.0.0.1:8091'; node tests/smoke.mjs
```

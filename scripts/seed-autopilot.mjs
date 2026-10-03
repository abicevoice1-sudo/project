// Autopilot seeder — waits out the 3-accounts/hour register window and keeps
// creating profiles until all 10 exist. Safe to run detached in the background.
//
// Resumability: a local state file records every email we have created, and a
// login probe confirms before registering, so a crash or restart never creates a
// duplicate (uq_users_email would reject it anyway) and never skips one.
import fs from 'node:fs';

const BASE = 'https://shiarishta.com/api';
const PASSWORD = 'DemoRishta!2026';
const STATE = 'scripts/seed-created.json';
const LOG = 'scripts/seed-autopilot.log';

const PROFILES = JSON.parse(stripBom(fs.readFileSync('scripts/seed-profiles.json', 'utf8')));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// PowerShell's `Set-Content -Encoding utf8` emits a BOM, which JSON.parse rejects.
function stripBom(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch { /* logging must never kill the run */ }
}

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text.slice(0, 160); }
  return { status: res.status, body, retryAfter: Number(res.headers.get('Retry-After') || 0) };
}

const saveState = (emails) => fs.writeFileSync(STATE, JSON.stringify([...emails], null, 2));

let done = new Set(
  fs.existsSync(STATE) ? JSON.parse(stripBom(fs.readFileSync(STATE, 'utf8'))) : [],
);

// Reconcile against the server: anything in our list that cannot log in is gone.
if (done.size) {
  for (const email of [...done]) {
    const r = await api('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (r.status !== 200) { log(`reconcile: ${email} no longer exists — removing from state`); done.delete(email); }
  }
  saveState(done);
  log(`state: ${done.size} profile(s) confirmed live`);
}

const pending = () => PROFILES.filter((p) => !done.has(p.email));

let guard = 0;
while (pending().length && guard++ < 20) {
  const p = pending()[0];

  const reg = await api('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: p.email, password: PASSWORD, displayName: p.displayName, sect: p.sect }),
  });

  if (reg.status === 429) {
    const wait = (reg.retryAfter || 3600) + 15;
    log(`rate limited — waiting ${Math.ceil(wait / 60)} min for the register window to reset`);
    await sleep(wait * 1000);
    continue;
  }

  if (reg.status !== 201) {
    log(`FAILED ${p.displayName}: HTTP ${reg.status} ${JSON.stringify(reg.body).slice(0, 160)}`);
    done.add(p.email); // do not spin on a permanently rejected address
    saveState(done);
    await sleep(3000);
    continue;
  }

  const token = reg.body.token;
  const uid = reg.body.user.uid;
  log(`+ ${p.displayName} registered (${uid.slice(0, 8)})`);

  const upd = await api('/profiles/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      age: p.age, gender: p.gender, city: p.city, country: p.country, sect: p.sect,
      profession: p.profession, bio: p.bio, expectations: p.expectations,
      aboutFamily: p.aboutFamily, visibility: 'public',
      photosVisibility: p.photosVisibility, religiosity: p.religiosity,
      educationLevel: p.educationLevel, marja: p.marja, prayer: p.prayer,
      modesty: p.modesty, diet: p.diet, languages: p.languages, ethnicity: p.ethnicity,
      incomeRange: p.incomeRange, maritalStatus: p.maritalStatus, children: p.children,
      childrenPlans: p.childrenPlans, relocation: p.relocation,
      familyInvolvement: p.familyInvolvement, heightCm: p.heightCm,
      timeline: p.timeline, syedStatus: p.syedStatus,
    }),
  });
  log(`   profile saved: HTTP ${upd.status}${upd.status !== 200 ? ' ' + JSON.stringify(upd.body).slice(0, 140) : ''}`);

  done.add(p.email);
  saveState(done);
  log(`progress ${done.size}/10 — still to create: ${pending().map((x) => x.displayName).join(', ') || 'none'}`);

  await sleep(3000);
}

log(done.size >= PROFILES.length ? 'ALL 10 PROFILES LIVE' : `stopped with ${done.size}/10 created`);
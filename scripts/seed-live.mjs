// REAL seeder — talks to the live API and creates actual accounts.
// Resumable: skips emails that already exist, so re-run after each rate window.
import fs from 'node:fs';
const BASE = 'https://shiarishta.com/api';

const PROFILES = JSON.parse(fs.readFileSync('scripts/seed-profiles.json', 'utf8'));
const PASSWORD = 'DemoRishta!2026';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  return { status: res.status, body, retryAfter: Number(res.headers.get('Retry-After') || 0) };
}

const sleepOnLimit = async (r, label) => {
  if (r.status !== 429) return false;
  const wait = (r.retryAfter || 60) + 5;
  console.log(`  ${label}: 429 — rate limit. Retry-After=${r.retryAfter}s.`);
  return true;
};

// ── Which of these emails already exist? ─────────────────────────────────────
const existing = new Set();
{
  const pub = await api('/profiles');
  if (Array.isArray(pub.body)) {
    for (const p of pub.body) existing.add(p.displayName);
  }
}

const results = [];
for (const p of PROFILES) {
  if (existing.has(p.displayName)) {
    console.log(`= ${p.displayName} — already present, skipping`);
    results.push({ ...p, status: 'existing' });
    continue;
  }

  // 1) register
  const reg = await api('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: p.email,
      password: PASSWORD,
      displayName: p.displayName,
      sect: p.sect,
    }),
  });

  if (reg.status === 429) {
    const wait = (reg.retryAfter || 3600) + 10;
    const pending = PROFILES.filter((x) => !results.some((r) => r.displayName === x.displayName));
    console.log(`\n!! Register limit hit at "${p.displayName}".`);
    console.log(`   Window resets in ~${Math.ceil(wait / 60)} min (${wait}s).`);
    console.log(`   Created so far: ${results.length}/10. Remaining: ${pending.length}`);
    console.log(`   Names left: ${pending.map((x) => x.displayName).join(', ')}`);
    await saveResults(results);
    process.exit(2);
  }
  if (reg.status !== 201) {
    console.log(`x ${p.displayName} — register HTTP ${reg.status}: ${JSON.stringify(reg.body).slice(0, 140)}`);
    results.push({ ...p, status: `register-${reg.status}` });
    continue;
  }

  const token = reg.body.token;
  const uid = reg.body.user.uid;
  console.log(`+ ${p.displayName} — created (${uid.slice(0, 8)})`);

  // 2) fill the profile
  const upd = await api('/profiles/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      age: p.age, gender: p.gender, city: p.city, country: p.country,
      sect: p.sect, profession: p.profession,
      bio: p.bio, expectations: p.expectations, aboutFamily: p.aboutFamily,
      visibility: 'public',
      photosVisibility: p.photosVisibility,
      religiosity: p.religiosity, educationLevel: p.educationLevel, marja: p.marja,
      prayer: p.prayer, modesty: p.modesty, diet: p.diet, languages: p.languages,
      ethnicity: p.ethnicity, incomeRange: p.incomeRange, maritalStatus: p.maritalStatus,
      children: p.children, childrenPlans: p.childrenPlans, relocation: p.relocation,
      familyInvolvement: p.familyInvolvement, heightCm: p.heightCm,
      timeline: p.timeline, syedStatus: p.syedStatus,
    }),
  });
  console.log(`   profile: ${upd.status === 200 ? 'OK' : `${upd.status} ${JSON.stringify(upd.body).slice(0, 110)}`}`);

  results.push({ ...p, uid, status: upd.status === 200 ? 'created' : `profile-${upd.status}` });
  await sleep(2500); // stay well under the 30 writes/min ceiling
}

async function saveResults(r) {
  fs.writeFileSync('scripts/seed-created.json', JSON.stringify(r, null, 2));
}

await saveResults(results);
const made = results.filter((r) => r.status === 'created').length;
console.log(`\nDone: ${made} fully created this run, ${results.length} accounted for.`);
console.log(`Password for all: ${PASSWORD}`);
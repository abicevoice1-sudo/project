// Full functional audit of the LIVE site, authenticated as a real seeded member.
// Exercises every documented route and records pass/fail.
import zlib from 'node:zlib';

const API = 'https://shiarishta.com/api';
const WEB = 'https://shiarishta.com';
const PASSWORD = 'DemoRishta!2026';
const ACCOUNTS = [
  ['Fatima Zahra Baig', 'fatima.zahra@example.com'],
  ['Zainab Husayn', 'zainab.husayn@example.com'],
  ['Maryam Siddiqui', 'maryam.siddiqui@example.com'],
];

const pass = [], fail = [], warn = [];
const rec = (b, area, detail) => b.push({ area, detail });

async function req(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text.slice(0, 120); }
  return { status: res.status, body, headers: res.headers };
}
const auth = (t, e = {}) => ({ ...e, Authorization: `Bearer ${t}` });
const jPost = (t, p) => ({ method: 'POST', headers: auth(t, { 'Content-Type': 'application/json' }), body: JSON.stringify(p) });
const jPut = (t, p) => ({ method: 'PUT', headers: auth(t, { 'Content-Type': 'application/json' }), body: JSON.stringify(p) });

function makePng() {
  const size = 64, rgb = Buffer.alloc(size * size * 3, 200), raw = [];
  for (let y = 0; y < size; y++) raw.push(Buffer.from([0]), rgb);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(raw))), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── 1. AUTH ───────────────────────────────────────────────────────────────
console.log('=== AUTH ===');
let token = null, me = null;
for (const [name, email] of ACCOUNTS) {
  const r = await req(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (r.status === 200) {
    console.log(`  OK   login ${name} (${r.body.user.emailVerified ? 'verified' : 'UNVERIFIED'})`);
    if (!token) { token = r.body.token; me = r.body.user; }
    rec(pass, 'auth', `login ${name}`);
  } else {
    console.log(`  FAIL login ${name} -> ${r.status}`);
    rec(fail, 'auth', `login ${name} -> ${r.status}`);
  }
}
const bad = await req(`${API}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: ACCOUNTS[0][1], password: 'wrong-password' }),
});
console.log(`  ${bad.status === 401 ? 'OK  ' : 'FAIL'} bad password rejected -> ${bad.status}`);
rec(bad.status === 401 ? pass : fail, 'auth', 'bad password rejected');

// ── 2. PROFILE ────────────────────────────────────────────────────────────
console.log('\n=== PROFILE ===');
const meRes = await req(`${API}/profiles/me`, { headers: auth(token) });
const prof = meRes.body;
console.log(`  ${meRes.status === 200 ? 'OK  ' : 'FAIL'} GET /profiles/me -> ${meRes.status}`);
console.log(`       ${prof.displayName}, ${prof.age}, ${prof.city} | ${prof.profession}`);
console.log(`       religiosity=${prof.religiosity} education=${prof.educationLevel} marja=${prof.marja}`);
rec(meRes.status === 200 ? pass : fail, 'profile', 'GET /profiles/me');

const upd = await req(`${API}/profiles/me`, jPut(token, { city: prof.city, timeline: prof.timeline }));
console.log(`  ${upd.status === 200 ? 'OK  ' : 'FAIL'} PUT /profiles/me -> ${upd.status}`);
rec(upd.status === 200 ? pass : fail, 'profile', 'PUT /profiles/me');

const postMe = await req(`${API}/profiles/me`, jPost(token, { city: 'Karachi' }));
console.log(`  ${postMe.status === 404 ? 'WARN' : 'OK  '} POST /profiles/me -> ${postMe.status} (only PUT is routed)`);
rec(warn, 'profile', `POST /profiles/me -> ${postMe.status}; route only accepts PUT but still consumes a write-limit slot`);

// ── 3. PHOTO ──────────────────────────────────────────────────────────────
console.log('\n=== PHOTO ===');
const form = new FormData();
form.append('photo', new Blob([makePng()], { type: 'image/png' }), 'avatar.png');
const photo = await req(`${API}/profiles/me/photo`, { method: 'POST', headers: auth(token), body: form });
console.log(`  ${photo.status === 201 ? 'OK  ' : 'FAIL'} POST /profiles/me/photo -> ${photo.status} ${JSON.stringify(photo.body).slice(0, 90)}`);
rec(photo.status === 201 ? pass : fail, 'photo', 'upload avatar');

if (photo.status === 201) {
  const served = await req(`${WEB}${photo.body.photo}`);
  console.log(`  ${served.status === 200 ? 'OK  ' : 'FAIL'} GET served photo -> ${served.status} ${served.headers.get('content-type')}`);
  rec(served.status === 200 ? pass : fail, 'photo', 'photo served over HTTP');
}

const junk = new FormData();
junk.append('photo', new Blob([Buffer.from('<?php echo "x"; ?>')], { type: 'image/png' }), 'x.png');
const rej = await req(`${API}/profiles/me/photo`, { method: 'POST', headers: auth(token), body: junk });
console.log(`  ${rej.status === 400 ? 'OK  ' : 'FAIL'} non-image payload rejected -> ${rej.status} (security)`);
rec(rej.status === 400 ? pass : fail, 'photo', 'rejects non-image');

// ── 4. BROWSE + FILTERS ───────────────────────────────────────────────────
console.log('\n=== BROWSE / FILTERS ===');
const all = await req(`${API}/profiles`, { headers: auth(token) });
const list = Array.isArray(all.body) ? all.body : [];
console.log(`  ${all.status === 200 ? 'OK  ' : 'FAIL'} GET /profiles (member) -> ${all.status}, ${list.length} results`);
const fullView = list.length > 0 && list.every((p) => !p.teaser);
console.log(`       member sees FULL profiles (not teasers): ${fullView ? 'yes' : 'NO'}`);
rec(all.status === 200 ? pass : fail, 'browse', `member browse ${list.length} results`);
if (!fullView) rec(fail, 'browse', 'member view returned teasers');

const filters = [
  ['gender=female', 'gender'],
  ['sect=Ithna Ashari (Twelver)', 'sect'],
  ['religiosity=very-practicing', 'religiosity'],
  ['education=Master%27s degree', 'education'],
  ['marja=Ayatollah al-Sistani', 'marja'],
  ['syedStatus=syed-paternal', 'syedStatus'],
  ['modesty=Hijab %E2%80%94 always observed', 'modesty'],
  ['country=Pakistan', 'country'],
  ['photoAccess=members', 'photoAccess'],
  ['minAge=25&maxAge=35', 'age range'],
  ['verifiedOnly=true', 'verifiedOnly'],
  ['search=Karachi', 'search'],
];
for (const [qs, label] of filters) {
  const r = await req(`${API}/profiles?${qs}`, { headers: auth(token) });
  const n = Array.isArray(r.body) ? r.body.length : -1;
  const ok = r.status === 200 && n >= 0;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(12)} -> ${r.status}, ${n} result(s)`);
  rec(ok ? pass : fail, 'filter', `${label} -> ${n} result(s)`);
  if (ok && n === 0) rec(warn, 'filter', `${label} returned ZERO results — check vocabulary`);
}

// ── 5. INTERESTS ──────────────────────────────────────────────────────────
console.log('\n=== INTERESTS ===');
const other = list.find((p) => p.id !== me.uid);
if (other) {
  const send = await req(`${API}/profiles/${other.id}/interest`, { method: 'POST', headers: auth(token) });
  const okS = [200, 201].includes(send.status);
  console.log(`  ${okS ? 'OK  ' : 'FAIL'} express interest -> ${send.status} ${JSON.stringify(send.body).slice(0, 70)}`);
  rec(okS ? pass : fail, 'interest', 'send interest');

  const rec2 = await req(`${API}/profiles/interests/received`, { headers: auth(token) });
  console.log(`  ${rec2.status === 200 ? 'OK  ' : 'FAIL'} GET interests/received -> ${rec2.status}`);
  rec(rec2.status === 200 ? pass : fail, 'interest', 'received list');

  const rm = await req(`${API}/profiles/${other.id}/interest`, { method: 'DELETE', headers: auth(token) });
  console.log(`  ${rm.status === 200 ? 'OK  ' : 'FAIL'} withdraw interest -> ${rm.status}`);
  rec(rm.status === 200 ? pass : fail, 'interest', 'withdraw interest');
}

// ── 6. MESSAGES / NOTIFICATIONS / SESSIONS ────────────────────────────────
console.log('\n=== MESSAGES / NOTIFICATIONS / SESSIONS ===');
const convos = await req(`${API}/messages/conversations`, { headers: auth(token) });
console.log(`  ${convos.status === 200 ? 'OK  ' : 'FAIL'} GET /messages/conversations -> ${convos.status} (${Array.isArray(convos.body) ? convos.body.length : 0})`);
rec(convos.status === 200 ? pass : fail, 'messages', 'conversations');

for (const [p, label] of [['/profiles/notifications', 'notifications'], ['/profiles/notifications/unread-count', 'unread']]) {
  const r = await req(`${API}${p}`, { headers: auth(token) });
  console.log(`  ${r.status === 200 ? 'OK  ' : 'FAIL'} GET ${p} -> ${r.status}`);
  rec(r.status === 200 ? pass : fail, 'notifications', label);
}
const sess = await req(`${API}/auth/sessions`, { headers: auth(token) });
console.log(`  ${sess.status === 200 ? 'OK  ' : 'FAIL'} GET /auth/sessions -> ${sess.status}`);
rec(sess.status === 200 ? pass : fail, 'sessions', 'active sessions');

const posts = await req(`${API}/community/posts`, { headers: auth(token) });
console.log(`  ${posts.status === 200 ? 'OK  ' : 'FAIL'} GET /community/posts -> ${posts.status} (${Array.isArray(posts.body) ? posts.body.length : 0})`);
rec(posts.status === 200 ? pass : fail, 'community', 'posts');

const contact = await req(`${API}/contact`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'QA Probe', email: 'qa@example.com', subject: 'audit', message: 'functional audit' }),
});
console.log(`  ${contact.status < 400 ? 'OK  ' : 'FAIL'} POST /contact -> ${contact.status}`);
rec(contact.status < 400 ? pass : fail, 'contact', 'contact form');

// ── 7. SECURITY: member must be denied admin; anon must be gated ─────────
console.log('\n=== SECURITY ===');
for (const p of ['/admin/overview', '/admin/users', '/admin/verifications']) {
  const r = await req(`${API}${p}`, { headers: auth(token) });
  const ok = r.status === 403;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} member blocked from ${p} -> ${r.status}`);
  rec(ok ? pass : fail, 'security', `${p} blocked for member`);
}
for (const p of ['/profiles/me', '/messages/conversations', '/admin/overview']) {
  const r = await req(`${API}${p}`);
  const ok = r.status === 401;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} anonymous blocked from ${p} -> ${r.status}`);
  rec(ok ? pass : fail, 'security', `${p} requires auth`);
}
for (const p of ['/api/.env', '/.env', '/api/lib/db.php']) {
  const r = await req(`${WEB}${p}`);
  const ok = r.status === 403 || r.status === 404;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${p.padEnd(16)} not web-accessible -> ${r.status}`);
  rec(ok ? pass : fail, 'security', `${p} blocked`);
}

// ── 8. PUBLIC PAGES ───────────────────────────────────────────────────────
console.log('\n=== PUBLIC PAGES ===');
for (const p of ['/', '/profiles', '/login', '/register', '/about', '/safety', '/privacy', '/terms', '/blog', '/community', '/pricing', '/success-stories', '/support']) {
  const r = await req(`${WEB}${p}`);
  const ok = r.status === 200;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${p.padEnd(18)} -> ${r.status}`);
  rec(ok ? pass : fail, 'pages', `${p} -> ${r.status}`);
}

console.log(`\n================ SUMMARY ================`);
console.log(`PASS ${pass.length} | WARN ${warn.length} | FAIL ${fail.length}`);
if (warn.length) { console.log('\nWARNINGS:'); warn.forEach((w) => console.log(`  [${w.area}] ${w.detail}`)); }
if (fail.length) { console.log('\nFAILURES:'); fail.forEach((f) => console.log(`  [${f.area}] ${f.detail}`)); }
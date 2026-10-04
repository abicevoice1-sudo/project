import fs from 'node:fs';
import { API, PASSWORD, renderAvatar, sleep } from './lib/avatar.mjs';

const GRADIENTS = [
  ['#33604F', '#1B3D31'], ['#B98334', '#8A5A20'], ['#8C5A3B', '#5C3A26'],
  ['#3E5C76', '#22384A'], ['#6B4E71', '#3E2C42'], ['#4A7C59', '#27452F'],
];

const profiles = JSON.parse(fs.readFileSync('scripts/seed-profiles.json', 'utf8').replace(/^\uFEFF/, ''));
const created = new Set(
  fs.existsSync('scripts/seed-created.json')
    ? JSON.parse(fs.readFileSync('scripts/seed-created.json', 'utf8'))
    : [],
);

let ok = 0, skipped = 0, failed = 0;
for (let i = 0; i < profiles.length; i++) {
  const p = profiles[i];
  if (!created.has(p.email)) {
    console.log(`- ${p.displayName}: not created yet, skipping`);
    skipped++; continue;
  }

  const login = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: p.email, password: PASSWORD }),
  });
  if (login.status === 429) { console.log('! rate limited — re-run later to finish'); break; }
  if (login.status !== 200) { console.log(`x ${p.displayName}: login ${login.status}`); failed++; continue; }
  const { token } = await login.json();

  const fd = new FormData();
  fd.append('photo', new Blob([renderAvatar(p.initials, ...GRADIENTS[i % GRADIENTS.length])], { type: 'image/png' }), 'a.png');
  const up = await fetch(`${API}/profiles/me/photo`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
  });
  const body = await up.text();
  if (up.status === 201) { console.log(`+ ${p.displayName}: avatar uploaded`); ok++; }
  else { console.log(`x ${p.displayName}: ${up.status} ${body.slice(0, 90)}`); failed++; }

  await sleep(1200); // stay well under the 30 writes/min ceiling
}

console.log(`\nuploaded ${ok}, skipped ${skipped} (not created yet), failed ${failed}`);
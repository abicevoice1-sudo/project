// Distinguishes "not deployed" from "deployed but CDN-cached".
const WEB = 'https://shiarishta.com';
const bust = `cb=${Date.now()}`;

async function get(path, cacheBust) {
  const url = `${WEB}${path}${cacheBust ? '?' + bust : ''}`;
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
  return { status: res.status, text: await res.text(), cf: res.headers.get('cf-cache-status') };
}

console.log('=== robots.txt ===');
for (const bustIt of [false, true]) {
  const r = await get('/robots.txt', bustIt);
  const rules = (r.text.match(/^Disallow:/gm) || []).length;
  console.log(`  cache-bust=${String(bustIt).padEnd(5)} HTTP ${r.status}  bytes=${String(r.text.length).padStart(4)}  Disallow rules=${rules}  cf-cache=${r.cf}`);
}

console.log('\n=== deployed asset scan for JSON-LD ===');
const html = await (await fetch(`${WEB}/`, { headers: { 'Cache-Control': 'no-cache' } })).text();
const entries = [...new Set([...html.matchAll(/\/assets\/([A-Za-z0-9._-]+\.js)/g)].map((m) => m[1]))];
console.log(`  entry assets: ${entries.join(', ')}`);

const seen = new Set(entries);
const queue = [...entries];
const hits = {};
let scanned = 0;
while (queue.length) {
  const name = queue.shift();
  let src = '';
  try { src = await (await fetch(`${WEB}/assets/${name}`)).text(); } catch { continue; }
  scanned++;
  for (const marker of ['BreadcrumbList', 'FAQPage', 'SearchAction', 'Organization', 'shia-rishta-jsonld', 'application/ld+json']) {
    if (src.includes(marker)) (hits[marker] ||= []).push(name);
  }
  for (const m of src.matchAll(/[A-Za-z0-9._-]+\.js/g)) {
    const n = m[0];
    if (!seen.has(n) && n.includes('-') && n !== name) { seen.add(n); queue.push(n); }
  }
}
console.log(`  scanned ${scanned} chunks`);
for (const [k, v] of Object.entries(hits)) {
  console.log(`  FOUND ${k.padEnd(24)} in ${[...new Set(v)].slice(0, 2).join(', ')}`);
}
const missing = ['BreadcrumbList', 'FAQPage', 'SearchAction', 'Organization'].filter((k) => !hits[k]);
console.log(missing.length ? `\n  MISSING: ${missing.join(', ')}` : '\n  all JSON-LD node types present');
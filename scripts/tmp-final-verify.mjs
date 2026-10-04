// Final live verification: brand rename + SEO + admin wiring on the real site.
const WEB = 'https://shiarishta.com';

const html = await (await fetch(`${WEB}/`, { headers: { 'Cache-Control': 'no-cache' } })).text();
const attr = (a, k) => (html.match(new RegExp(`${a}="${k}"[^>]*content="([^"]*)"`)) || [])[1];

console.log('=== BRAND (live) ===');
for (const [a, k] of [['name', 'description'], ['name', 'apple-mobile-web-app-title'],
  ['property', 'og:site_name'], ['property', 'og:image:alt']]) {
  console.log(`  ${k.padEnd(28)} ${String(attr(a, k)).slice(0, 84)}`);
}
console.log(`  old spellings in <head>:  ${/ShiaRishta|Shiarishta/.test(html)}`);

const mf = await (await fetch(`${WEB}/manifest.webmanifest`, { headers: { 'Cache-Control': 'no-cache' } })).json();
console.log(`  manifest name:            "${mf.name}"`);
console.log(`  manifest short_name:      "${mf.short_name}"`);

console.log('\n=== SEO (live) ===');
const robots = await (await fetch(`${WEB}/robots.txt`, { headers: { 'Cache-Control': 'no-cache' } })).text();
console.log(`  robots.txt disallows: ${(robots.match(/^Disallow:.*$/gm) || []).length} rule(s)`);
console.log(`  /api/ disallowed:      ${robots.includes('Disallow: /api/')}`);
console.log(`  /admin disallowed:     ${robots.includes('Disallow: /admin')}`);
console.log(`  sitemap present:       ${robots.includes('Sitemap:')}`);

const sm = await (await fetch(`${WEB}/sitemap.xml`)).text();
console.log(`  sitemap URLs:           ${(sm.match(/<loc>/g) || []).length}`);

// Find the Seo chunk and confirm the JSON-LD node types shipped.
const entries = [...html.matchAll(/\/assets\/([A-Za-z0-9._-]+\.js)/g)].map((m) => m[1]);
const seen = new Set(entries);
const queue = [...entries];
let seoChunk = null;
while (queue.length && !seoChunk) {
  const src = await (await fetch(`${WEB}/assets/${queue.shift()}`)).text();
  if (src.includes('shia-rishta-jsonld')) seoChunk = src;
  for (const m of src.matchAll(/[A-Za-z0-9._-]+\.js/g)) {
    const n = m[0];
    if (!seen.has(n) && n.includes('-')) { seen.add(n); queue.push(n); }
  }
}
console.log('\n=== JSON-LD (deployed Seo chunk) ===');
if (!seoChunk) {
  console.log('  Seo chunk NOT found');
} else {
  for (const t of ['Organization', 'WebSite', 'SearchAction', 'BreadcrumbList', 'FAQPage']) {
    console.log(`  ${seoChunk.includes(`'${t}'`) ? 'present ' : 'MISSING '}  ${t}`);
  }
  console.log(`  gated on indexability: ${seoChunk.includes('meta.index')}`);
}

console.log('\n=== ADMIN (live API) ===');
const anon = await fetch(`${WEB}/api/admin/overview`);
console.log(`  GET /api/admin/overview (no auth) -> ${anon.status} (403 expected)`);
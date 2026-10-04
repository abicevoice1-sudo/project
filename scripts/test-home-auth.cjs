const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const root = 'C:/Users/Mitchell/Downloads/migration';
(async () => {
  const seed = JSON.parse(execFileSync(process.execPath, [`${root}/scripts/seed-test-data.mjs`], { cwd: root, encoding: 'utf8' }));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:5173/');
    await page.getByRole('heading', { name: 'Shia Rishta' }).waitFor();
    assert.match(await page.locator('body').innerText(), /Create free account/);
    await page.goto('http://localhost:5173/auth/login');
    await page.locator('#email').waitFor();
    await page.evaluate(users => localStorage.setItem('sh_users', JSON.stringify(users)), seed.sh_users);
    await page.locator('#email').fill('aaliyah@example.com');
    await page.locator('input[type=password]').fill('Test1234!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.getByText('Welcome back').waitFor();
    await page.goto('http://localhost:5173/');
    await page.getByRole('heading', { name: /Welcome back, Aaliyah/ }).waitFor();
    const body = await page.locator('body').innerText();
    assert.doesNotMatch(body, /Create free account/);
    assert.match(body, /Go to your dashboard/);
    assert.match(body, /Continue browsing/);
    assert.deepEqual(errors, []);
    fs.mkdirSync('C:/Users/Mitchell/AppData/Local/Temp/member-audit', { recursive: true });
    fs.writeFileSync('C:/Users/Mitchell/AppData/Local/Temp/member-audit/home-auth.json', JSON.stringify([{ check: 'logged-in-home', ok: true }], null, 2));
    console.log('PASS: logged-in home welcomes member, no Login/Sign up CTA, no page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

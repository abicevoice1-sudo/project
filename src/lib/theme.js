// ─── Theme — single source of truth for dark/light ──────────────────────────
// Versioned key: a stale `dark` from an older build can never resurrect.
// Settings Appearance writes through these helpers; layouts only read them.
//
// Legacy key `shiarishta_theme:v2` was written inline by MainLayout for a
// while — read it once and promote it so nobody loses a stored choice.
const THEME_KEY = 'shiarishta_theme_v1';
const LEGACY_THEME_KEY = 'shiarishta_theme:v2';

export function readIsDark() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === 'dark') return true;
    if (raw === 'light') return false;
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === 'dark' || legacy === 'light') {
      localStorage.setItem(THEME_KEY, legacy);
      return legacy === 'dark';
    }
  } catch { /* private mode — fall through to light default */ }
  return false;
}

export function writeIsDark(dark) {
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch { /* quota/private mode — non-fatal */ }
}

export function applyIsDark(dark) {
  try {
    const on = dark === true;
    // The stylesheet keys off `.dark`; `data-theme` is set too so any future
    // CSS or embed that targets [data-theme="dark"] stays in sync.
    document.documentElement.classList.toggle('dark', on);
    document.documentElement.classList.toggle('light', !on);
    document.documentElement.setAttribute('data-theme', on ? 'dark' : 'light');
    document.body.style.backgroundColor = on ? 'var(--color-canvas)' : '';
  } catch { /* SSR — ignore */ }
}

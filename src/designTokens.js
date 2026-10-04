// Design tokens for the Shia Rishta redesign — Linear/Vercel-inspired.
// The single source of truth lives in src/styles/globals.css (:root + .light).
// This module mirrors those values for tooling/documentation.

export const tokens = {
  colors: {
    // ── "Noir" (dark, default pre-v2) — deep slate canvas ──
    background: '#0b0f17',
    surface: '#0e1420',
    elevated: '#131a29',
    ink: '#f4f7fb',
    muted: '#9aa7ba',
    line: 'rgba(255,255,255,0.08)',

    // ── "Heirloom" (premium light, default since theme v2) ──
    // Transplanted from the flagship reference project: warm editorial luxury.
    paper: '#fffaf4',            // cream canvas (ref --paper)
    'paper-warm': '#fff6ea',     // ref --cream
    'ink-dark': '#17130f',       // charcoal ink (ref --ink)
    'muted-warm': '#746c63',     // ref --muted
    'line-warm': '#eadfd4',      // sand hairline (ref --line)
    sage: '#416b5b',             // brand primary (ref --sage)
    'sage-dark': '#21483b',      // brand hover (ref --sage-dark)
    mint: '#e5f0e8',             // brand subtle (ref --mint)
    'gold-deep': '#b98334',      // burnished accent (ref --gold)
    rose: '#f3d8d2',             // ref --rose
    charcoal: '#211b17',         // ref --charcoal

    // Brand (dark theme) — emerald core, gold accent
    primary: '#10b981',
    'primary-light': '#34d399',
    'primary-dark': '#059669',
    accent: '#d4af69',
    gold: '#d4af69',

    // Feedback
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',

    // Static verification badges
    'rose-dark': '#be123c',
    'amber-dark': '#b45309',
    'emerald-dark': '#047857',
    'purple-dark': '#7e22ce',
    'sage-accent-dark': '#15803d',
    'charcoal-darker': '#0a0f1c',
  },

  // Reference signature gradient (charcoal → sage → gold), used on header CTAs
  gradients: {
    cta: 'linear-gradient(135deg, #1a1714 0%, #2c433e 52%, #b98334 100%)',
  },

  fonts: {
    body: 'Inter',
    // One display serif for every surface — light *and* dark, every route.
    // Mirrors --font-display in globals.css; `Fraunces` was listed here before
    // but no stylesheet or component ever referenced it.
    displayLight: 'Cormorant Garamond',
    displayDark: 'Cormorant Garamond',
  },

  radius: {
    sm: '8px',
    default: '12px',
    md: '14px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
};
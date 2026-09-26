import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Per-route SEO for the SPA. index.html ships the homepage <head>; this
// component keeps document.title, meta description, robots, canonical, and
// social tags in sync on every client-side navigation so crawlers and link
// unfurlers see a real page per route instead of one duplicated shell.
//
// Public marketing routes: indexable with keyword-targeted copy.
// Auth / member / admin / token routes: noindex (private by design).
// Unknown routes (NotFound): noindex.
// ─────────────────────────────────────────────────────────────────────────────

const SITE = 'https://shiarishta.com';

const PUBLIC_META = {
  '/': {
    title: 'Shia Matrimony | Find Shia Rishta for Nikah – ShiaRishta',
    desc: 'ShiaRishta is the nikah-first Shia matrimony platform. Browse verified Shia brides and grooms, keep your photos private, and involve family with dignity. Join free.',
  },
  '/profiles': {
    title: 'Browse Shia Brides & Grooms for Nikah | ShiaRishta',
    desc: 'Search verified Shia profiles for nikah — filter by sect, marja, education and location. Serious Shia matrimony with privacy-first profiles. Join free.',
  },
  '/pricing': {
    title: 'Pricing – Free Nikah Matchmaking, No Paywalls | ShiaRishta',
    desc: 'ShiaRishta is free: profiles, browsing, interest and messaging with no paywalls. See exactly what is included and why privacy is never a premium feature.',
  },
  '/blog': {
    title: 'Nikah & Marriage Guidance for Shia Muslims | ShiaRishta Blog',
    desc: 'Practical guidance on nikah, choosing a spouse, and married life for Shia Muslims — written for serious seekers and their families.',
  },
  '/success-stories': {
    title: 'How ShiaRishta Works – Honest Nikah Matchmaking',
    desc: 'How ShiaRishta actually works: verified profiles, mutual-interest messaging, privacy controls and family-supported introductions. No invented stories.',
  },
  '/about': {
    title: 'About ShiaRishta – Nikah-First Shia Matchmaking',
    desc: 'Why ShiaRishta exists: a dignified, nikah-first alternative to swiping for Shia Muslims and their families.',
  },
  '/safety': {
    title: 'Safety & Verification Standards | ShiaRishta',
    desc: 'How ShiaRishta keeps members safe: identity verification, photo privacy tiers, mutual-interest messaging and human review.',
  },
  '/support': {
    title: 'Help & Support | ShiaRishta',
    desc: 'Get help with your ShiaRishta account, verification, privacy settings and messaging.',
  },
  '/contact': {
    title: 'Contact ShiaRishta',
    desc: 'Reach the ShiaRishta team with questions, feedback or partnership enquiries.',
  },
  '/privacy': {
    title: 'Privacy Policy | ShiaRishta',
    desc: 'How ShiaRishta collects, encrypts and protects your personal data. Your photos and details stay under your control.',
  },
  '/terms': {
    title: 'Terms of Service | ShiaRishta',
    desc: 'The terms governing your use of ShiaRishta, the nikah-first Shia matrimony platform.',
  },
  '/agents': {
    title: 'Matchmaking Agents & Family Introductions | ShiaRishta',
    desc: 'Family members and matchmakers can create private, photo-free introductions on ShiaRishta — with the person concerned in control throughout.',
  },
  '/community': {
    title: 'Shia Community, Guidance & Events | ShiaRishta',
    desc: 'Community guidance and events for Shia Muslims preparing for nikah — beyond the profile.',
  },
  '/guardians': {
    title: 'Wali & Guardian Workflow for Nikah | ShiaRishta',
    desc: 'How walis and guardians stay involved on ShiaRishta: approvals, introductions and family-to-family communication.',
  },
};

// Prefixes that are private even though the path is public-shaped.
// Matched on segment boundaries so /profile never catches /profiles.
const NOINDEX_PREFIXES = [
  '/auth', '/dashboard', '/messages', '/onboard', '/profile', '/settings',
  '/drafts', '/verify', '/wali', '/claim', '/admin', '/login', '/signup', '/signin',
];

// Known private routes that deserve a real title (not the 404 one).
const PRIVATE_TITLES = {
  '/auth/login': 'Log in | ShiaRishta',
  '/auth/register': 'Create Your Free Account | ShiaRishta',
  '/auth/forgot': 'Reset Your Password | ShiaRishta',
  '/auth/reset': 'Set a New Password | ShiaRishta',
  '/verify-email': 'Verify Your Email | ShiaRishta',
  '/login': 'Log in | ShiaRishta',
  '/signup': 'Create Your Free Account | ShiaRishta',
  '/signin': 'Log in | ShiaRishta',
  '/dashboard': 'Your Dashboard | ShiaRishta',
  '/messages': 'Your Messages | ShiaRishta',
  '/onboard': 'Complete Your Profile | ShiaRishta',
  '/settings': 'Settings | ShiaRishta',
};

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function upsertLinkCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function resolveMeta(pathname) {
  if (PUBLIC_META[pathname]) return { ...PUBLIC_META[pathname], index: true };
  if (pathname.startsWith('/profiles/')) {
    return {
      title: 'Shia Profile for Nikah | ShiaRishta',
      desc: 'View this verified Shia profile on ShiaRishta — the nikah-first Shia matrimony platform.',
      index: false,
    };
  }
  if (pathname.startsWith('/community/')) {
    return {
      title: 'Community Post | ShiaRishta',
      desc: 'Community guidance for Shia Muslims on ShiaRishta.',
      index: true,
    };
  }
  if (PRIVATE_TITLES[pathname]) {
    return { title: PRIVATE_TITLES[pathname], desc: '', index: false };
  }
  if (NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return { title: 'ShiaRishta', desc: '', index: false };
  }
  // Unknown route → the NotFound page.
  return { title: 'Page Not Found | ShiaRishta', desc: '', index: false };
}

export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = resolveMeta(pathname);
    const canonical = `${SITE}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;

    document.title = meta.title;
    upsertMeta('meta[name="description"]', { name: 'description', content: meta.desc || meta.title });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: meta.index ? 'index, follow' : 'noindex, nofollow',
    });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: meta.title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: meta.desc || meta.title });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: meta.title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: meta.desc || meta.title });
    upsertLinkCanonical(canonical);
  }, [pathname]);

  return null;
}

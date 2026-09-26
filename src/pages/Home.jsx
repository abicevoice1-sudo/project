import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BadgeCheck, BookOpen, CheckCircle2, Eye, EyeOff, Heart,
  Lock, Sparkles, Users,
} from 'lucide-react';
import Layout from '../layouts/LandingLayout';
import ProfileCard from '../components/ProfileCard.jsx';
import { useAuth } from '../lib/auth/AuthContext';
import { useProfiles } from '../lib/api/client';

// ── Reference-parity copy (shiarishta12.netlify.app) ────────────────────────
const HERO_CHIPS = [
  { icon: BadgeCheck, label: 'Verified women', className: 'c1' },
  { icon: Sparkles, label: 'AI agents', className: 'c2' },
  { icon: Lock, label: 'Photo privacy', className: 'c3' },
  { icon: Users, label: 'Wali workflow', className: 'c4' },
];

const QUIET_FEATURES = [
  { icon: BadgeCheck, title: 'Verified intent', desc: 'Identity and marriage-intention checks before sensitive access opens.' },
  { icon: EyeOff, title: 'Privacy-first photos', desc: 'Members can show photos publicly, after mutual interest, or only after matching.' },
  { icon: Users, title: 'Family supported', desc: 'Wali and family workflows are built into the journey from the start.' },
  { icon: Sparkles, title: 'Daily suggestions', desc: 'A limited number of higher-quality matches based on values, practice, and life stage.' },
];

const TRUST_STEPS = [
  { title: 'Intent assessment', desc: 'Marriage goals, religious practice, family background, and timeline.' },
  { title: 'Verified profile', desc: 'Identity, intention, and safety checks create a higher-trust member pool.' },
  { title: 'Private introduction', desc: 'Intro messages are limited, contact exchange requires agreement, and families can be included.' },
];

const PREMIUM_TOOLS = [
  'Verified profiles only access',
  'Contact exchange after mutual agreement',
  'Video introductions kept private',
  'Profile insights for views and saves',
  'Family-to-family communication tools',
  'Nikah planning and guidance resources',
];

const HERO_IMAGE = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80';

// Scroll reveal helper — inert when the visitor prefers reduced motion.
const reveal = (reduceMotion, delay = 0) => (reduceMotion
  ? {}
  : {
      initial: { opacity: 0, y: 22 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: '-70px' },
      transition: { delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] },
    });

export default function Home() {
  const reduceMotion = useReducedMotion();
  const { isLoggedIn, user } = useAuth();
  const { data } = useProfiles({});
  const featured = (data || []).slice(0, 6);

  return (
    <Layout>
      <div className="hp-home">
        {/* ── Elite hero ── */}
        <section className="hp-hero">
          <div className="hp-hero-inner">
            <motion.div
              className="hp-hero-copy"
              {...(reduceMotion ? {} : {
                initial: { opacity: 0, y: 26 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
              })}
            >
              <p className="hp-eyebrow"><span aria-hidden="true" /> Private Shia matchmaking</p>
              <h1>{isLoggedIn ? `Welcome back, ${user?.displayName || "friend"}` : "ShiaRishta"}</h1>
              <p className="hp-lede">
                A refined nikah-first platform where serious families can discover verified,
                privacy-protected profiles with clarity, dignity, and intention.
              </p>
              <div className="hp-cta-row">
                {isLoggedIn ? (<Link to="/dashboard" className="hp-btn-primary">Go to your dashboard <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>) : (<Link to="/profiles" className="hp-btn-primary">Browse profiles <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>)}
                {isLoggedIn ? (<Link to="/profiles" className="hp-btn-ghost">Continue browsing</Link>) : (<Link to="/auth/register" className="hp-btn-ghost">Create free account</Link>)}
              </div>
            </motion.div>

            <motion.div
              className="hp-visual"
              {...(reduceMotion ? {} : {
                initial: { opacity: 0, y: 26, scale: 0.98 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { delay: 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
              })}
            >
              <div className="hp-visual-frame">
                <img src={HERO_IMAGE} alt="Nikah celebration" loading="eager" decoding="async" />
              </div>
              {HERO_CHIPS.map(({ icon: Icon, label, className }, i) => (
                <span
                  key={label}
                  className={`hp-chip ${className}`}
                  style={reduceMotion ? undefined : { animationDelay: `${i * 0.7}s` }}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" /> {label}
                </span>
              ))}
              <div className="hp-float-card">
                <span className="hp-float-icon" aria-hidden="true"><Heart className="w-4 h-4" /></span>
                <div>
                  <strong>96% values match</strong>
                  <span>Limited daily matches</span>
                </div>
              </div>
            </motion.div>
          </div>
          <p className="hp-visual-caption">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            Photo access, guardian contact, and contact details can unlock only when both sides agree.
          </p>
        </section>

        {/* ── Quiet feature grid ── */}
        <section className="hp-features" aria-label="Platform principles">
          {QUIET_FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.article key={title} className="hp-feature" {...reveal(reduceMotion, i * 0.06)}>
              <span className="hp-feature-icon"><Icon className="w-5 h-5" aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.article>
          ))}
        </section>

        {/* ── Designed for trust (split + steps) ── */}
        <section className="hp-section">
          <div className="hp-split">
            <motion.div className="hp-split-copy" {...reveal(reduceMotion)}>
              <p className="hp-eyebrow"><span aria-hidden="true" /> Privacy by design</p>
              <h2>Designed for trust</h2>
              <p className="hp-lede">Attractive, simple, and protective by design.</p>
              <div className="hp-member-cards">
                <div className="hp-member-card">
                  <span className="hp-feature-icon"><Sparkles className="w-4 h-4" aria-hidden="true" /></span>
                  <div>
                    <strong>For female members</strong>
                    <p>Present themselves beautifully without giving up control.</p>
                  </div>
                </div>
                <div className="hp-member-card">
                  <span className="hp-feature-icon"><Eye className="w-4 h-4" aria-hidden="true" /></span>
                  <div>
                    <strong>For male members</strong>
                    <p>See enough to understand compatibility, while private details open through respectful steps.</p>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.ol className="hp-steps" {...reveal(reduceMotion, 0.1)}>
              {TRUST_STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="hp-step-num" aria-hidden="true">{i + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </div>
                </li>
              ))}
            </motion.ol>
          </div>
        </section>

        {/* ── Featured profiles ── */}
        <section className="hp-section">
          <motion.div className="hp-section-head" {...reveal(reduceMotion)}>
            <p className="hp-eyebrow"><span aria-hidden="true" /> Featured profiles</p>
            <h2>Curated profiles that feel premium at first glance</h2>
            <p className="hp-lede hp-lede-center">
              A quiet look at the member experience — privacy is the default, and members who have
              completed identity verification carry a visible badge.
            </p>
          </motion.div>
          <div className="profile-grid">
            {(featured.length ? featured : Array.from({ length: 6 })).map((p, i) => (
              <motion.div key={p?.id || i} {...reveal(reduceMotion, (i % 3) * 0.06)}>
                {p ? (
                  <ProfileCard profile={p} actions={false} />
                ) : (
                  <div className="profiles-card profiles-card-skeleton" aria-hidden="true">
                    <div className="skeleton" style={{ height: 250 }} />
                    <div className="pcard-body">
                      <div className="skeleton" style={{ height: 12, width: '55%' }} />
                      <div className="skeleton" style={{ height: 11, width: '70%' }} />
                      <div className="skeleton" style={{ height: 11, width: '45%' }} />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="hp-featured-cta">
            {isLoggedIn ? (<Link to="/dashboard" className="hp-btn-primary">Go to your dashboard <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>) : (<Link to="/profiles" className="hp-btn-primary">Browse all profiles <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>)}
            <span>{(data || []).length} curated members · {isLoggedIn ? "welcome back" : "free to join"}</span>
          </div>
        </section>

        {/* ── Premium experience ── */}
        <section className="hp-section">
          <div className="hp-premium">
            <motion.div {...reveal(reduceMotion)}>
              <p className="hp-eyebrow"><span aria-hidden="true" /> Premium experience</p>
              <h2>Serious tools for serious nikah conversations</h2>
              <p className="hp-lede">
                Everything is built to protect dignity while keeping momentum toward nikah.
              </p>
              <div className="hp-cta-row">
                <Link to={isLoggedIn ? "/dashboard" : "/auth/register"} className="hp-btn-primary">
                  {isLoggedIn ? "Go to your dashboard" : "Create free account"} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
            <motion.ul className="hp-checklist" {...reveal(reduceMotion, 0.1)}>
              {PREMIUM_TOOLS.map((tool) => (
                <li key={tool}>
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {tool}
                </li>
              ))}
            </motion.ul>
          </div>
        </section>

        {/* ── Guidance band ── */}
        <section className="hp-section">
          <motion.div className="hp-guidance" {...reveal(reduceMotion)}>
            <div>
              <p className="hp-eyebrow hp-eyebrow-light"><span aria-hidden="true" /> Guidance and community</p>
              <h2>Trust beyond the profile</h2>
              <p>Islamic guidance, events, and family testimonials build trust beyond the profile.</p>
            </div>
            <div className="hp-guidance-actions">
              <Link to="/blog" className="hp-btn-gold">
                <BookOpen className="w-4 h-4" aria-hidden="true" /> Read guidance
              </Link>
              <Link to="/community" className="hp-btn-outline-light">Visit community</Link>
            </div>
          </motion.div>
        </section>
      </div>
    </Layout>
  );
}
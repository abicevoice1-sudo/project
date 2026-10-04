import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../layouts/LandingLayout';
import { Check, Sparkles, Shield, Heart, ArrowRight, CircleOff } from 'lucide-react';

// HONESTY CONTRACT: Shia Rishta has NO payment system, NO subscriptions and NO
// billing of any kind. This page must never state or imply that money can be
// charged today. Paid tiers are roadmap items, clearly labeled as planned and
// not purchasable, and pricing will be shaped by early-member feedback.

const FREE_NOW = [
  { text: 'Create & publish your profile', included: true },
  { text: 'Browse & search profiles', included: true },
  { text: 'Express interest', included: true },
  { text: 'Compatibility score', included: true },
  { text: 'Guardian / wali tools', included: true },
  { text: 'Community access', included: true },
];

const PLANNED = [
  { text: 'Unlimited messaging', included: true },
  { text: 'Advanced search filters', included: true },
  { text: 'Incognito / discreet browsing', included: true },
  { text: 'Verified ID badge', included: true },
  { text: 'See who viewed your profile', included: true },
  { text: 'Priority support', included: true },
];

const LAUNCH_STATUS = [
  { icon: CircleOff, label: 'No payments taken', desc: 'No card is requested, stored, or charged anywhere in this build.' },
  { icon: Heart, label: 'Early access is free', desc: 'Every current feature is free for founding members.' },
  { icon: Sparkles, label: 'Pricing shaped by members', desc: 'Paid tiers arrive later; founding members help set fair prices.' },
  { icon: Shield, label: 'Roadmap, not promises', desc: 'Planned features ship only when they are real and verified.' },
];

const FAQS = [
  { q: 'Is anything charged today?', a: 'No. There is no payment system in this build. You will never be asked for a card during early access.' },
  { q: 'Will there be a paid plan later?', a: 'Planned. A paid membership tier is on the roadmap for sustainability, but it does not exist yet. When it does, early members will be told first — before anything changes.' },
  { q: 'What will stay free?', a: 'Creating a profile, browsing, expressing interest and guardian tools are intended to stay free. Paid tiers would add convenience features, not take away core access.' },
  { q: 'How do I join early access?', a: 'Create a free account. Early members keep their benefits when paid plans arrive and help decide what fair pricing looks like.' },
  { q: 'How can I share feedback on pricing?', a: 'Email support@shiarishta.com — every founding member’s view is read and weighed before pricing is set.' },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState(0);

  // FAQPage JSON-LD — answers are visible on the page, so this is eligible
  // for FAQ rich results.
  useEffect(() => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'faq-jsonld-pricing';
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
    return () => document.getElementById('faq-jsonld-pricing')?.remove();
  }, []);

  return (
    <Layout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Early access — free</span>
          <h1 className="text-3xl sm:text-5xl font-bold text-ink mt-2">Membership at launch</h1>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            Everything built today is free. No card, no trial, no billing — there is no payment system yet.
            Paid tiers are planned and will be shaped with founding members before they exist.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl border-2 border-primary/40 bg-elevated p-6 sm:p-8 flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-primary text-white px-3 py-1 rounded-full">Available now</span>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white mb-4">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-ink">Founding member</h3>
            <p className="text-sm text-muted mb-4">Everything currently built</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-ink">$0</span>
              <span className="text-sm text-muted ml-1">during early access</span>
            </div>
            <Link to="/auth/register"
              className="w-full button primary py-3 font-semibold text-center mb-6">
              Join early access <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
            <ul className="space-y-3 flex-1">
              {FREE_NOW.map(f => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                  <span className="text-ink">{f.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="relative rounded-2xl border border-line/20 bg-elevated p-6 sm:p-8 flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-ink/70 text-white px-3 py-1 rounded-full">Planned — not purchasable</span>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-ink">Paid membership</h3>
            <p className="text-sm text-muted mb-4">Roadmap — price not yet set</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-muted">TBD</span>
              <span className="text-sm text-muted ml-1">with founding-member input</span>
            </div>
            <Link to="/contact"
              className="w-full button secondary py-3 font-semibold text-center mb-6">
              Give pricing feedback <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
            <ul className="space-y-3 flex-1">
              {PLANNED.map(f => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-line/60" />
                  <span className="text-muted">{f.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Launch status — replaces the removed billing/trial/refund claims */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {LAUNCH_STATUS.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
              className="text-center p-5 rounded-2xl bg-elevated border border-line/20">
              <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <h4 className="font-bold text-ink text-sm">{item.label}</h4>
              <p className="text-xs text-muted mt-0.5">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-ink text-center mb-8">Membership FAQ</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-elevated rounded-xl border border-line/20 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-medium text-ink text-sm pr-4">{faq.q}</span>
                  <span className="text-muted flex-shrink-0">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <div className="px-5 pb-5 text-sm text-muted leading-relaxed border-t border-line/10 pt-4">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}

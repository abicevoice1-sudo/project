import { motion } from 'framer-motion';
import Layout from '../layouts/LandingLayout';
import { Shield, AlertTriangle, Eye, Lock, UserCheck, CheckCircle, Phone, Mail } from 'lucide-react';

const PRINCIPLES = [
  { icon: Shield, title: 'Identity Verification', desc: 'Every member can verify their government ID to earn a verified badge. Our team manually reviews submissions within 24 hours.' },
  { icon: Eye, title: 'Blur-on-Default Photos', desc: 'Your photos are blurred by default. Only members you explicitly match with can view them, and you can hide every photo entirely.' },
  { icon: Lock, title: 'Discreet Browsing', desc: 'Incognito mode lets you browse profiles without appearing in visitor lists or online status. Your activity stays private.' },
  { icon: UserCheck, title: 'Guardian Controls', desc: 'A family member or matchmaker can share a private introduction with you, and you decide whether to claim it. You can decline or withdraw any introduction at any time.' },
];

const GUIDELINES = [
  { ok: true, text: 'Use your real identity and recent photos' },
  { ok: true, text: 'Be honest about your faith, intentions, and background' },
  { ok: true, text: 'Communicate respectfully and with dignity' },
  { ok: true, text: 'Report suspicious or inappropriate behavior immediately' },
  { ok: true, text: 'Involve family/guardians when appropriate' },
  { ok: false, text: 'Create fake profiles or impersonate others' },
  { ok: false, text: 'Send explicit, harassing, or threatening messages' },
  { ok: false, text: 'Scrape data or use automated tools' },
  { ok: false, text: 'Share personal information of other members' },
  { ok: false, text: 'Use the platform for casual dating or non-marriage purposes' },
];

const REPORT_STEPS = [
  { num: '01', title: 'Flag the profile or message', desc: 'Click the "Report" button on any profile, message, or conversation.' },
  { num: '02', title: 'Select a reason', desc: 'Choose from harassment, fake profile, inappropriate content, or other safety concerns.' },
  { num: '03', title: 'Our team reviews within 24 hours', desc: 'Every report is reviewed by a human. We take appropriate action — up to permanent removal.' },
  { num: '04', title: 'You\'re notified of the outcome', desc: 'We follow up on every report with a resolution summary.' },
];

const RESOURCES = [
  { title: 'National Domestic Violence Hotline', desc: '24/7 support for anyone experiencing abuse.', link: 'https://www.thehotline.org', phone: '1-800-799-7233' },
  { title: 'ICNA Relief', desc: 'Social services and counseling for the Muslim community.', link: 'https://icnarelief.org', phone: '1-855-426-2737' },
  { title: 'Crisis Text Line', desc: 'Text HOME to 741741 for free, 24/7 crisis support.', link: 'https://www.crisistextline.org', phone: 'Text HOME to 741741' },
];

export default function Safety() {
  return (
    <Layout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Your safety is our priority</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink mt-2">Trust & Safety Center</h1>
          <p className="text-muted mt-2 max-w-xl mx-auto">We build tools and enforce policies to keep Shia Rishta a safe, respectful space for serious marriage seekers.</p>
        </motion.div>

        {/* Principles */}
        <div className="grid sm:grid-cols-2 gap-5 mb-14">
          {PRINCIPLES.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-start gap-4 p-6 rounded-2xl bg-elevated border border-line/20">
              <span className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><p.icon className="w-5 h-5 text-primary" /></span>
              <div>
                <h3 className="font-bold text-ink mb-1">{p.title}</h3>
                <p className="text-sm text-muted">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Community Guidelines */}
        <div className="bg-elevated rounded-2xl border border-line/20 p-6 sm:p-8 mb-14">
          <h2 className="text-xl font-bold text-ink mb-6">Community Guidelines</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-success mb-3 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Encouraged</h3>
              {GUIDELINES.filter(g => g.ok).map(g => (
                <div key={g.text} className="flex items-start gap-2.5 py-2 text-sm text-muted">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" /> {g.text}
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-bold text-danger mb-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Prohibited</h3>
              {GUIDELINES.filter(g => !g.ok).map(g => (
                <div key={g.text} className="flex items-start gap-2.5 py-2 text-sm text-muted">
                  <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" /> {g.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report process */}
        <div className="mb-14">
          <h2 className="text-xl font-bold text-ink text-center mb-8">How reporting works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {REPORT_STEPS.map((step, i) => (
              <motion.div key={step.num} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                className="text-center p-5 rounded-2xl bg-elevated border border-line/20">
                <div className="text-2xl font-bold text-primary mb-2">{step.num}</div>
                <h3 className="font-bold text-ink text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-muted">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Crisis resources */}
        <div className="bg-elevated rounded-2xl border border-line/20 p-6 sm:p-8 mb-14">
          <h2 className="text-xl font-bold text-ink mb-2">Need immediate help?</h2>
          <p className="text-sm text-muted mb-6">If you or someone you know is in danger, please reach out to these confidential resources:</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {RESOURCES.map(r => (
              <div key={r.title} className="p-4 rounded-xl bg-hover/60">
                <h3 className="font-bold text-ink text-sm mb-1">{r.title}</h3>
                <p className="text-xs text-muted mb-2">{r.desc}</p>
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <Phone className="w-3 h-3" /> {r.phone}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact safety team */}
        <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/15">
          <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold text-ink mb-2">Contact our Trust & Safety team</h2>
          <p className="text-sm text-muted mb-4">For urgent safety concerns, email us directly — we respond within 1 hour.</p>
          <a href="mailto:safety@shiarishta.com" className="button primary px-6 py-2.5 font-semibold inline-flex items-center gap-2">
            <Mail className="w-4 h-4" /> safety@shiarishta.com
          </a>
        </div>
      </main>
    </Layout>
  );
}

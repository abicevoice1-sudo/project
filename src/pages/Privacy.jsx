import { motion } from 'framer-motion';
import Layout from '../layouts/LandingLayout';
import { Lock, Eye, UserCheck, Download, FileText, Users } from 'lucide-react';

const sections = [
  {
    id: 'data-we-collect',
    title: '1. Information We Collect',
    icon: Download,
    content: [
      { heading: 'Profile Information', text: 'Display name, age, city, country, profession, education, ethnicity, languages, bio, and faith details (sect, religiosity, Marja\', modesty practice, diet). These are provided voluntarily during onboarding and can be edited at any time.' },
      { heading: 'Account Information', text: 'Email address, hashed password, display name, and authentication tokens. We never store your password in plain text — passwords are one-way hashed (bcrypt) and cannot be read back, by us or anyone else. One-time email verification and password-reset links are stored only as SHA-256 hashes, so a database leak cannot be replayed as a valid link.' },
      { heading: 'Usage & Activity', text: 'Pages viewed, profiles browsed, interests expressed, messages sent, search filters used, and device/browser information. This helps us improve the platform and recommend better matches.' },
      { heading: 'Photos & Media', text: 'You choose who can see your photos, and you can change or remove them at any time. We do not publish your photos to search engines or third parties, and we do not sell or license your images to anyone.' },
    ]
  },
  {
    id: 'how-we-use',
    title: '2. How We Use Your Information',
    icon: UserCheck,
    content: [
      { heading: 'Matching & Recommendations', text: 'Your profile details and preferences power our Compatibility Index, a transparent weighted score. We use this data solely to suggest relevant matches — never for advertising or sold to third parties.' },
      { heading: 'Communication', text: 'We facilitate messaging between matched members. Messages are encrypted in transit (TLS) and encrypted at rest (AES-256-GCM), so a stolen database or backup does not reveal message contents. Only the two participants can read a conversation. Our staff cannot read your message history.' },
      { heading: 'Safety & Verification', text: 'ID verification uploads are encrypted at rest before being written to disk and are readable only by our review team. Submission images are never shared with other members, never used for advertising, and are not retained once a review is complete. We review reported content to maintain community safety.' },
      { heading: 'Platform Improvement', text: 'Aggregated, anonymized usage data helps us improve features, fix bugs, and understand how members navigate the platform.' },
    ]
  },
  {
    id: 'privacy-controls',
    title: '3. Your Privacy Controls',
    icon: Eye,
    content: [
      { heading: 'Photo Visibility', text: 'Choose between: Visible to All, Request Only, or Blurred Until Match. You decide who can open each photo, and you can change this at any time.' },
      { heading: 'Profile Visibility', text: 'Set your profile as Discoverable (appears in search), Limited (visible only to matched members), or Incognito (hidden from search while browsing).' },
      { heading: 'Discreet Browsing', text: 'Incognito mode hides your online status and prevents you from appearing in other members\' visitor lists.' },
      { heading: 'Guardian Management', text: 'Add or remove guardians at any time. Guardians receive co-management permissions as configured — you can revoke access instantly.' },
      { heading: 'Data Export & Deletion', text: 'Export all your data at any time from Settings → Account. Delete your account permanently — all data is removed within 30 days.' },
    ]
  },
  {
    id: 'data-sharing',
    title: '4. Data Sharing & Disclosure',
    icon: Users,
    content: [
      { heading: 'We Never Sell Your Data', text: 'Your personal information is never sold, rented, or shared with third parties for marketing purposes. Period.' },
      { heading: 'Service Providers', text: 'We use trusted third-party services (cloud hosting, email delivery, payment processing) under strict data processing agreements. They access data only to provide services on our behalf.' },
      { heading: 'Legal Requirements', text: 'We may disclose information if required by law, court order, or to protect the rights, property, or safety of Shia Rishta, our users, or the public.' },
    ]
  },
  {
    id: 'security',
    title: '5. Security',
    icon: Lock,
    content: [
      { heading: 'Encryption', text: 'All data is encrypted in transit (TLS 1.3). Message contents and identity-verification uploads are additionally encrypted at rest (AES-256-GCM), so a stolen database or backup does not reveal them. Passwords are one-way hashed and cannot be recovered by anyone, including us.' },
      { heading: 'Authentication', text: 'Passwords are hashed using bcrypt. Optional two-factor authentication adds an extra layer of security.' },
      { heading: 'Monitoring', text: 'We monitor for suspicious activity and unauthorized access attempts. Accounts with unusual activity may be temporarily locked for protection.' },
    ]
  },
  {
    id: 'retention',
    title: '6. Data Retention',
    icon: FileText,
    content: [
      { heading: 'Active Accounts', text: 'Your data is retained as long as your account is active. You can export or delete it at any time.' },
      { heading: 'Deleted Accounts', text: 'Upon deletion, personal data is removed within 30 days. Anonymized analytics data may be retained indefinitely.' },
      { heading: 'Legal Holds', text: 'If required by law or legal proceedings, certain data may be retained beyond the standard period.' },
    ]
  },
];

export default function Privacy() {
  return (
    <Layout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Your privacy matters</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink mt-2">Privacy Policy</h1>
          <p className="text-muted mt-2">Last updated: August 2026</p>
          <p className="text-sm text-muted mt-4 max-w-2xl mx-auto">
            At Shia Rishta, privacy is a right — not a premium feature. This policy explains what we collect, how we use it, and the controls you have.
          </p>
        </motion.div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <motion.div key={section.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-elevated rounded-2xl border border-line/20 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><section.icon className="w-5 h-5 text-primary" /></span>
                <h2 className="text-lg font-bold text-ink">{section.title}</h2>
              </div>
              <div className="space-y-4">
                {section.content.map(item => (
                  <div key={item.heading}>
                    <h3 className="font-semibold text-ink text-sm mb-1">{item.heading}</h3>
                    <p className="text-sm text-muted leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 p-6 rounded-2xl bg-primary/5 border border-primary/15">
          <h2 className="font-bold text-ink mb-2">Questions about privacy?</h2>
          <p className="text-sm text-muted">Contact our Data Protection Officer at <a href="mailto:privacy@shiarishta.com" className="text-primary hover:underline">privacy@shiarishta.com</a>. We respond within 24 hours.</p>
        </div>
      </main>
    </Layout>
  );
}

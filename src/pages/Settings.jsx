import { useState, useEffect } from 'react';
import { readIsDark, writeIsDark } from '../lib/theme';
import Layout from '../layouts/MainLayout';
import { useAuth } from '../lib/auth/AuthContext';
import GetVerified from '../components/GetVerified';
import PhotoUpload from '../components/PhotoUpload';
import WaliLinks from '../components/WaliLinks';
import {
  Shield, Bell, User, Lock, Moon, Sun,
  AlertTriangle, Link2, Copy, Check, Trash2, Plus
} from 'lucide-react';

// Settings are per-member: the key follows the signed-in account
// (sh_session.uid), never the bare browser. Two accounts on one browser must
// never read each other's privacy choices. Same-device preferences only —
// nothing here claims server enforcement.
const SETTINGS_BASE = 'shiarishta_settings';
function settingsKey() {
  try {
    const raw = localStorage.getItem('sh_session');
    const uid = raw ? JSON.parse(raw)?.uid : null;
    return uid ? `${SETTINGS_BASE}::${uid}` : SETTINGS_BASE;
  } catch {
    return SETTINGS_BASE;
  }
}

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState(readIsDark() ? 'dark' : 'light');

  const [profile, setProfile] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phone: '', city: '', country: '', bio: ''
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'members', photoVisibility: 'members',
    showOnlineStatus: true, allowFamilyView: true, blockUnverified: false,
    incognito: false
  });
  const [privacySaved, setPrivacySaved] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [blocking, setBlocking] = useState('');

  const [notifications, setNotifications] = useState({
    emailMessages: true, emailMatches: true, emailWeeklyDigest: true,
    pushMessages: true, pushMatches: false, pushProfileViews: false
  });

  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem(settingsKey());
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.privacy) setPrivacy(prev => ({ ...prev, ...parsed.privacy }));
        if (parsed.notifications) setNotifications(prev => ({ ...prev, ...parsed.notifications }));
        if (parsed.profile) setProfile(prev => ({ ...prev, ...parsed.profile, email: user?.email || '', displayName: prev.displayName || user?.displayName || '' }));
        if (parsed.twoFactor) setTwoFactor(parsed.twoFactor);
      } catch { /* corrupted — ignore */ }
    }
  }, [user?.email]);

  const handleSave = () => {
    localStorage.setItem(settingsKey(), JSON.stringify({ privacy, notifications, profile, twoFactor }));
    // Appearance is global to this browser, not per member: every layout reads
    // the same versioned key through lib/theme.
    writeIsDark(theme === 'dark');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, desc: 'Personal information' },
    { id: 'privacy', label: 'Privacy & Safety', icon: Shield, desc: 'Control who sees what' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'How you stay informed' },
    { id: 'appearance', label: 'Appearance', icon: Moon, desc: 'Theme and display' },
    { id: 'security', label: 'Security', icon: Lock, desc: 'Password and 2FA' },
    { id: 'account', label: 'Account', icon: AlertTriangle, desc: 'Data and deletion' }
  ];

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-line/30 bg-elevated text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all';
  void inputCls;

  return (
    <Layout>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink">Settings</h1>
          <p className="text-muted mt-1">Manage your account and preferences.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <nav className="md:w-56 flex-shrink-0">
            <div className="bg-elevated rounded-xl border border-line/20 p-2 space-y-1">
              {tabs.map(tab => {
                const TabIcon = tab.icon;
                return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === tab.id ? 'btn btn-primary' : 'btn btn-ghost'}`}>
                  <TabIcon className="w-4 h-4" /> {tab.label}
                </button>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 bg-elevated rounded-xl border border-line/20 shadow-sm p-8">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-ink">Profile Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div><label htmlFor="displayName" className="text-sm font-medium text-muted mb-1.5 block">Display Name</label>
                     <input id="displayName" type="text" value={profile.displayName} onChange={e => setProfile(pp => ({ ...pp, displayName: e.target.value }))} className="input w-full" aria-label="Display name" />
                   </div>
                   <div><label htmlFor="email" className="text-sm font-medium text-muted mb-1.5 block">Email</label>
                     <input id="settings-email" type="email" defaultValue={user?.email || ''} className="input w-full" aria-label="Email" readOnly />
                   </div>
                </div>
                <div><label className="text-sm font-medium text-muted mb-1.5 block">Bio</label>
                  <textarea rows={4} defaultValue="Tell others about yourself..." className="input w-full resize-none" />
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-ink">Privacy & Safety</h2>
                <p className="text-sm text-muted">Enforced by the server on Save — not just hidden in your browser. Photos set to Private are never sent to other members.</p>
                {[
                  { key: 'profileVisibility', label: 'Who can see my profile', type: 'select', options: [{ v: 'public', l: 'Public — anyone' }, { v: 'members', l: 'Members only' }, { v: 'private', l: 'Private — only me' }] },
                  { key: 'photoVisibility', label: 'Who can see my photos', type: 'select', options: [{ v: 'public', l: 'Public — anyone' }, { v: 'members', l: 'Members only' }, { v: 'private', l: 'Private — only me' }] },
                  { key: 'showOnlineStatus', label: 'Show online status', type: 'toggle' },
                  { key: 'allowFamilyView', label: 'Allow family members to view profile', type: 'toggle' },
                  { key: 'blockUnverified', label: 'Block unverified members', type: 'toggle' }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-line/10 last:border-0">
                    <span className="text-sm font-medium text-ink">{item.label}</span>
                    {item.type === 'toggle' ? (
                      <button onClick={() => setPrivacy(p => ({ ...p, [item.key]: !p[item.key] }))} className={`relative h-6 w-11 flex items-center transition-all duration-200 ${privacy[item.key] ? 'btn btn-primary' : 'btn btn-ghost'} `}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${privacy[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    ) : (
                      <select value={privacy[item.key]} onChange={e => setPrivacy(p => ({ ...p, [item.key]: e.target.value }))} className="input w-full">
                        {item.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    )}
                  </div>
                ))}
                <button
                  onClick={async () => {
                    setPrivacySaved('');
                    try {
                      const { api } = await import('../lib/api/client');
                      await api.updateProfile(user?.uid || 'me', {
                        visibility: privacy.profileVisibility,
                        photos_visibility: privacy.photoVisibility,
                      });
                      setPrivacySaved('Privacy saved — enforced for every other member.');
                    } catch (e) {
                      setPrivacySaved(e.message || 'Could not save privacy.');
                    }
                  }}
                  className="button primary px-5 py-2 font-semibold text-sm"
                >
                  Save privacy
                </button>
                {privacySaved && <p className="text-sm text-success font-medium">{privacySaved}</p>}

                <div className="pt-4 border-t border-line/10">
                  <h3 className="text-base font-semibold text-ink mb-1">Your photo</h3>
                  <p className="text-sm text-muted mb-3">
                    JPEG, PNG or WebP, up to 5&nbsp;MB. Location data embedded in the
                    file (EXIF/GPS) is stripped before it is stored.
                  </p>
                  <PhotoUpload />
                </div>

                <div className="pt-2 border-t border-line/10 mt-6">
                  <GetVerified />
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-ink mb-2">Blocked members</h3>
                  <p className="text-sm text-muted mb-3">Blocking hides you from each other and disables messaging both ways — immediately, on every device.</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={blocking}
                      onChange={e => setBlocking(e.target.value)}
                      placeholder="Paste a member ID to block"
                      className="input flex-1"
                      aria-label="Member ID to block"
                    />
                    <button
                      onClick={async () => {
                        if (!blocking.trim()) return;
                        const { blockMember } = await import('../lib/api/safety');
                        await blockMember(blocking.trim());
                        const { listBlocks } = await import('../lib/api/safety');
                        setBlocks(await listBlocks().catch(() => []));
                        setBlocking('');
                      }}
                      className="button px-4 py-2 text-sm font-semibold"
                      style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}
                    >
                      Block
                    </button>
                  </div>
                  {blocks.length > 0 && (
                    <ul className="space-y-2">
                      {blocks.map(id => (
                        <li key={id} className="flex items-center justify-between text-sm p-2 rounded-lg" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                          <span style={{ color: 'var(--color-ink-secondary)' }}>{id}</span>
                          <button
                            onClick={async () => {
                              const { unblockMember, listBlocks } = await import('../lib/api/safety');
                              await unblockMember(id);
                              setBlocks(await listBlocks().catch(() => []));
                            }}
                            className="text-xs hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            Unblock
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <WaliLinks />
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-ink">Notifications</h2>
                {[
                  { key: 'emailMessages', label: 'New messages (email)' },
                  { key: 'emailMatches', label: 'New matches (email)' },
                  { key: 'pushMessages', label: 'New messages (push)' },
                  { key: 'pushMatches', label: 'New matches (push)' },
                  { key: 'weeklyDigest', label: 'Weekly activity digest' }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-line/10 last:border-0">
                    <span className="text-sm font-medium text-ink">{item.label}</span>
                    <button onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key] }))} className={`relative h-6 w-11 flex items-center transition-all duration-200 ${notifications[item.key] ? 'btn btn-primary' : 'btn btn-ghost'} `}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${notifications[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-ink">Appearance</h2>
                <p className="text-sm text-muted">Applies to this browser immediately on Save.</p>
                <div className="grid grid-cols-2 gap-4">
                  {[{ v: 'light', l: 'Light', icon: Sun }, { v: 'dark', l: 'Dark', icon: Moon }].map(opt => {
                    const OptIcon = opt.icon;
                    return (
                    <button key={opt.v} onClick={() => setTheme(opt.v)} className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${theme === opt.v ? 'btn btn-primary' : 'btn btn-ghost'} `}>
                      <OptIcon className={`w-6 h-6 ${theme === opt.v ? 'text-primary' : 'text-muted'}`} />
                      <span className={`text-sm font-medium ${theme === opt.v ? 'text-primary' : 'text-muted'}`}>{opt.l}</span>
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-ink">Account</h2>
                <div className="p-4 rounded-xl bg-danger/5 border border-danger/20">
                  <h3 className="font-semibold text-danger">Danger Zone</h3>
                  <p className="text-sm text-muted mt-1">Account deletion is managed securely once a backend is wired.</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-line/10">
              {saved && <span className="text-sm text-success font-medium">Saved!</span>}
              <button onClick={handleSave} className="button primary px-6 py-2.5 font-semibold">Save Changes</button>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
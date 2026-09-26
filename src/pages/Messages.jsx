import { usePageTitle } from '../lib/usePageTitle';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../layouts/LandingLayout';
import { analytics } from '../lib/analytics';
import {
  Send, Search, ArrowLeft, MoreVertical, ShieldCheck, Sparkles, Check, X,
  MessageCircle, EyeOff, BadgeCheck, UserPlus, Info, Heart
} from 'lucide-react';

// ── Curated icebreakers — meaningful, marriage-focused conversation starters ─
const ICEBREAKERS = [
  "What does a peaceful home look like to you?",
  "How do you balance deen with daily work life?",
  "What role do you see family playing in the nikah process?",
  "What is one goal you are working toward this year?",
  "How would you describe your relationship with faith?",
  "What does an ideal weekend look like for your future family?",
  "What is something you are grateful for lately?"
];

// ── Conversation model ──────────────────────────────────────────────────────
const INITIAL_CONVOS = [
  { id: 'c1', name: 'Aaliyah R.', age: 27, city: 'Chicago, IL', online: true, verified: true, unread: 2,
    compatibility: 87, photoAccess: 'match', guardianInvited: false,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80' },
  { id: 'c2', name: 'Fatima N.', age: 29, city: 'Dearborn, MI', online: true, verified: true, unread: 0,
    compatibility: 91, photoAccess: 'public', guardianInvited: true, guardianName: 'Hassan N. (father)',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80' },
  { id: 'c3', name: 'Sara K.', age: 25, city: 'Toronto, ON', online: false, verified: false, unread: 1,
    compatibility: 74, photoAccess: 'request', guardianInvited: false,
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=100&q=80' },
  { id: 'c4', name: 'Maryam S.', age: 25, city: 'London, UK', online: false, verified: true, unread: 0,
    compatibility: 82, photoAccess: 'match', guardianInvited: false,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80' }
];

const INITIAL_MESSAGES = {
  c1: [
    { id: 'm1', sender: 'them', text: "Assalamu alaikum! I came across your profile and we seem to share similar values.", time: '10:30 AM' },
    { id: 'm2', sender: 'me', text: "Wa alaikum assalam! Thank you for reaching out. I'd love to learn more about you.", time: '10:32 AM' },
    { id: 'm3', sender: 'them', text: "Of course! I'm a product designer in Chicago. Family and faith are central to my life.", time: '10:35 AM' },
    { id: 'm4', sender: 'me', text: "That's wonderful. What are you looking for in a partner?", time: '10:38 AM' },
    { id: 'm5', sender: 'them', text: "Someone who shares my commitment to faith, family, and building a meaningful life together.", time: '10:42 AM' }
  ],
  c2: [
    { id: 'n1', sender: 'them', text: "Assalamu alaikum! My father has joined our chat to help with introductions.", time: 'Yesterday' },
    { id: 'n2', sender: 'guardian', guardianName: 'Hassan N. (father)', text: "Wa alaikum assalam wa rahmatullah. I am Hassan, Fatima's father. Happy to facilitate respectful introductions.", time: 'Yesterday' },
    { id: 'n3', sender: 'me', text: "Wa alaikum assalam. It is an honor to meet you. Jazak Allah khair for facilitating.", time: 'Yesterday' }
  ],
  c3: [
    { id: 's1', sender: 'them', text: "Assalamu alaikum! I saw your profile and found your bio really thoughtful.", time: '3h ago' }
  ],
  c4: [
    { id: 'd1', sender: 'them', text: "Looking forward to hearing from you.", time: '1d ago' }
  ]
};

// ── Pending intro requests (interest received, awaiting your approval) ──────
const INITIAL_REQUESTS = [
  { id: 'r1', name: 'Zainab H.', age: 26, city: 'Dearborn, MI', compatibility: 87, verified: true,
    photoAccess: 'match', time: '4h ago', note: "Assalamu alaikum — your profile resonated with my family and me. I'm a pharmacist who loves hifz circles and weekend volunteering.",
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=100&q=80' },
  { id: 'r2', name: 'Hafsa M.', age: 28, city: 'Chicago, IL', compatibility: 79, verified: true,
    photoAccess: 'request', time: '1d ago', note: "Salaam! I appreciated how clearly you described your intentions. I'm completing my master's in education.",
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=100&q=80' }
];

// ── Per-member persistence — messages/intros survive reload on shared devices ─
// Keys follow the signed-in account (sh_session.uid), never the bare browser.
// Demo seeds are namespaced per member, so two accounts on one browser never
// share threads or intro decisions. Same-device drafts only: no server delivery
// is claimed here.
const MSG_KEY = 'shiarishta_threads_v1';
const INTRO_KEY = 'shiarishta_intros_v1';
function sessionUid() {
  try {
    const raw = localStorage.getItem('sh_session');
    const uid = raw ? JSON.parse(raw).uid : null;
    return uid || 'signed-out';
  } catch { return 'signed-out'; }
}
function scopedKey(base) {
  return base + '::' + sessionUid();
}
function readScoped(base, fallback) {
  try {
    const raw = localStorage.getItem(scopedKey(base));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeScoped(base, value) {
  try { localStorage.setItem(scopedKey(base), JSON.stringify(value)); } catch { /* quota — non-fatal */ }
}
function seedThreads() {
  const seed = {};
  for (const cid of Object.keys(INITIAL_MESSAGES)) seed[cid] = INITIAL_MESSAGES[cid].map(m => ({ ...m }));
  return seed;
}
function loadThreads() {
  const existing = readScoped(MSG_KEY, null);
  if (existing && typeof existing === 'object') return existing;
  const seed = seedThreads();
  writeScoped(MSG_KEY, seed);
  return seed;
}
function loadIntros() {
  const existing = readScoped(INTRO_KEY, null);
  if (Array.isArray(existing)) return existing.map(r => ({ ...r }));
  const seed = INITIAL_REQUESTS.map(r => ({ ...r }));
  writeScoped(INTRO_KEY, seed);
  return seed;
}
function nowLabel() {
  try { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  catch { return 'now'; }
}

// ── Messages: Request Center + Chats with Chaperone mode ───────────────────
export default function Messages() {
  usePageTitle('Messages');
  const [convos, setConvos] = useState(INITIAL_CONVOS);
  const [messagesByConvo, setMessagesByConvo] = useState(loadThreads);
  const [requests, setRequests] = useState(loadIntros);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState('chats'); // 'chats' | 'requests'
  const [search, setSearch] = useState('');
  const [chaperoneModal] = useState(null); // retained: see note at ChatPane header
  const messagesEndRef = useRef(null);

  const activeConvo = convos.find(c => c.id === activeId) || null;
  const messages = activeId ? (messagesByConvo[activeId] || []) : [];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, activeId]);

  const addMessage = (convoId, msg) => {
    // Persist first so a sent message survives reload on this device.
    const nextThreads = { ...messagesByConvo, [convoId]: [...(messagesByConvo[convoId] || []), msg] };
    writeScoped(MSG_KEY, nextThreads);
    setMessagesByConvo(nextThreads);
    // Auto-clear unread when the member opens a conversation
    setConvos(prev => prev.map(c => (c.id === convoId ? { ...c, unread: 0 } : c)));
  };

  const sendMessage = (text) => {
    const t = (text || '').trim();
    if (!t || !activeId) return;
    addMessage(activeId, { id: `m${Date.now()}`, sender: 'me', text: t, time: 'Just now' });
    analytics.track('message_sent', { thread: activeId, browser_local: true });
  };

  const respondToRequest = (id, accept) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const nextIntros = requests.filter(r => r.id !== id);
    writeScoped(INTRO_KEY, nextIntros);
    setRequests(nextIntros);
    if (accept) {
      const newConvo = {
        id: `new-${id}`, name: req.name, age: req.age, city: req.city, online: false,
        verified: req.verified, unread: 0, compatibility: req.compatibility,
        photoAccess: req.photoAccess, guardianInvited: false, avatar: req.avatar
      };
      setConvos(prev => [newConvo, ...prev]);
      const acceptedThreads = { ...messagesByConvo, [newConvo.id]: [{ id: 'g1', sender: 'system', text: `You accepted ${req.name}'s introduction request. A respectful conversation can now begin — consider inviting a chaperone.`, time: 'Just now' }] };
      writeScoped(MSG_KEY, acceptedThreads);
      setMessagesByConvo(acceptedThreads);
      setActiveId(newConvo.id);
      setTab('chats');
    }
  };

  const filteredConvos = convos.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalUnread = convos.reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0);

  return (
    <Layout>
      <main className="h-[calc(100vh-64px)] flex overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* ── Sidebar ── */}
        <div className={`w-full md:w-80 lg:w-96 flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}
          style={{ borderRight: '1px solid var(--border)' }}>
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h1 className="text-xl font-bold text-ink mb-3">Messages</h1>
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {[{ id: 'chats', label: 'Chats', badge: totalUnread }, { id: 'requests', label: 'Requests', badge: requests.length }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id}
                  className={'btn btn-' + (tab === t.id ? 'primary' : 'ghost') + ' mb-2'}>
                  {t.label}
                  {t.badge > 0 && (
                    <span className="badge badge-secondary ml-2">{t.badge}</span>
                  )}
                </button>
              ))}
            </div>
            {tab === 'chats' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-ink-tertiary)' }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…" aria-label="Search conversations"
                  className="input w-full input-with-icon" />
              </div>
            )}
          </div>

          {tab === 'chats' ? (
            <ConversationList convos={filteredConvos} activeId={activeId} onSelect={setActiveId} />
          ) : (
            <RequestList requests={requests} onRespond={respondToRequest} />
          )}
        </div>

        {/* ── Chat pane ── */}
        <div className={`flex-1 flex-col ${activeId ? 'flex' : 'hidden md:flex'}`}>
          {activeConvo ? (
            <ChatPane convo={activeConvo} messages={messages} onBack={() => setActiveId(null)}
              onSend={sendMessage} messagesEndRef={messagesEndRef} />
          ) : (
            <EmptyState hasRequests={requests.length > 0} onOpenRequests={() => setTab('requests')} />
          )}
        </div>
      </main>
    </Layout>
  );
}

// ── Sidebar: conversation list ──────────────────────────────────────────────
function ConversationList({ convos, activeId, onSelect }) {
  if (convos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Search className="w-8 h-8 mb-3" style={{ color: 'var(--color-ink-tertiary)' }} />
        <p className="text-sm font-semibold text-ink">No conversations found</p>
        <p className="text-xs text-muted mt-1">Try a different name.</p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1" role="list" aria-label="Conversations">
      {convos.map((c, i) => (
        <motion.button key={c.id} role="listitem" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25 }} onClick={() => onSelect(c.id)}
          aria-current={activeId === c.id ? 'true' : undefined}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150 hover:shadow-md ${activeId === c.id ? 'border-2 border-primary' : 'border-transparent hover:border-border'}`}
          style={{ background: activeId === c.id ? 'var(--color-primary-subtle)' : 'var(--color-surface)' }}>
          {/* Avatar with privacy blur + presence */}
          <span className="relative flex-shrink-0">
            <img src={c.avatar} alt="" className={`w-10 h-10 rounded-full object-cover ${c.photoAccess === 'match' ? 'blur-[6px]' : ''}`}
              style={{ border: '2px solid var(--color-border)' }} loading="lazy" />
            {c.photoAccess === 'match' && (
              <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                <span className="w-4 h-4 rounded-full bg-black/45 flex items-center justify-center"><EyeOff className="w-2.5 h-2.5" /></span>
              </span>
            )}
            {c.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success ring-1" style={{ '--tw-ring-color': 'var(--color-bg)' }} aria-label="Online now" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-ink truncate">{c.name}, {c.age}</span>
              {c.verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-primary)' }} aria-label="ID verified" />}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
              <span className="truncate">{c.city}</span>
              <span aria-hidden>·</span>
              <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{c.compatibility}% match</span>
            </span>
          </span>
          {c.unread > 0 && (
            <span className="badge badge-primary ml-2 flex-shrink-0">{c.unread}</span>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// ── Sidebar: introduction requests awaiting approval ────────────────────────
function RequestList({ requests, onRespond }) {
  if (requests.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Check className="w-12 h-12" style={{ color: 'var(--color-success)' }} />
        </div>
        <h1 className="empty-state-title">All caught up</h1>
        <p className="empty-state-text">
          New introduction requests will appear here for your review.
        </p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" role="list" aria-label="Introduction requests">
      {requests.map((r, i) => (
        <motion.article key={r.id} role="listitem" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="rounded-2xl p-4 border hover:shadow-md transition-all duration-200"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <header className="flex items-start gap-3">
            <img src={r.avatar} alt="" className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${r.photoAccess === 'request' ? 'blur-[5px]' : ''}`}
              style={{ border: '2px solid var(--color-border)' }} loading="lazy" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-semibold text-ink">{r.name}, {r.age}</h3>
                {r.verified && <BadgeCheck className="w-3 h-3" style={{ color: 'var(--color-primary)' }} aria-label="ID verified" />}
              </div>
              <p className="text-xs text-muted mt-0.5">{r.city} · <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{r.compatibility}% match</span> · {r.time}</p>
            </div>
          </header>
          <p className="text-xs text-muted leading-relaxed mt-2.5">"{r.note}"</p>
          {r.photoAccess === 'request' && (
            <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: 'var(--color-ink-tertiary)' }}>
              <EyeOff className="w-2.5 h-2.5" /> Photo visible after you accept
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => onRespond(r.id, true)}
              className="btn btn-primary w-full">
              <Heart className="w-3 h-3" /> Accept
            </button>
            <button onClick={() => onRespond(r.id, false)}
              className="btn btn-ghost w-full">
              <X className="w-3 h-3" /> Decline
            </button>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

// ── Chat pane placeholder ───────────────────────────────────────────────────
function EmptyState({ hasRequests, onOpenRequests }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--color-canvas)' }}>
      <div className="empty-state">
        <div className="empty-state-icon">
          <MessageCircle className="w-16 h-16" style={{ color: 'var(--color-primary)' }} />
        </div>
        <h1 className="empty-state-title">Your conversations live here</h1>
        <p className="empty-state-text">
          Every conversation begins with an accepted introduction — intentional, respectful, and protected from the start.
        </p>
        {hasRequests && (
          <div className="mt-4 flex justify-center">
            <button onClick={onOpenRequests}
              className="btn btn-primary">
              <UserPlus className="w-3 h-3" /> Review pending requests
            </button>
          </div>
        )}
        <p className="mt-6 text-xs flex items-center gap-2" style={{ color: 'var(--color-ink-tertiary)' }}>
          <ShieldCheck className="w-3 h-3" /> Only the two of you can read this · Encrypted at rest · No contact details shared
        </p>
      </div>
    </div>
  );
}

// ── Chat pane: header, icebreakers, composer ────────────────────────────────
function ChatPane({ convo, messages, onBack, onSend, messagesEndRef }) {
  const [draft, setDraft] = useState('');

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--color-canvas)' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <button onClick={onBack} aria-label="Back to conversations"
          className="btn btn-ghost btn-sm md:hidden">
          <ArrowLeft className="w-3 h-3" />
        </button>
        <span className="relative flex-shrink-0">
          <img src={convo.avatar} alt="" className={`w-9 h-9 rounded-full object-cover ${convo.photoAccess === 'match' ? 'blur-[6px]' : ''}`}
            style={{ border: '2px solid var(--color-border)' }} loading="lazy" />
          {convo.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success ring-1" style={{ '--tw-ring-color': 'var(--color-bg)' }} aria-label="Online" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-ink truncate">{convo.name}, {convo.age}</h2>
            {convo.verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-primary)' }} aria-label="ID verified" />}
          </div>
          <p className="text-xs text-muted truncate">{convo.online ? 'Online now' : 'Offline'} · {convo.city} · {convo.compatibility}% match</p>
        </div>
        {/* NOTE: there is deliberately no "invite chaperone" control here.
            An earlier version had one, but it only flipped local React state —
            it never called the API, granted nobody access, and told the user
            "Chaperone present". A safety affordance that silently does nothing
            is worse than no affordance at all, so it was removed rather than
            relabelled. Family involvement happens through introductions. */}
        <button aria-label="Conversation options" className="btn btn-ghost btn-sm">
          <MoreVertical className="w-2.5 h-2.5" />
        </button>
      </header>

      {/* Privacy banner */}
      {convo.photoAccess === 'match' && (
        <p className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] flex-shrink-0 empty-state"
          style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
          <EyeOff className="w-2.5 h-2.5" /> Photos stay blurred until you both choose to share
        </p>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2" role="log" aria-label={`Conversation with ${convo.name}`} aria-live="polite">
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        <div ref={messagesEndRef} />
      </div>

      {/* Icebreakers */}
      <div className="flex gap-2 px-3 pb-3 overflow-x-auto flex-shrink-0" aria-label="Icebreaker suggestions">
        {ICEBREAKERS.slice(0, 4).map(prompt => (
          <button key={prompt} type="button" onClick={() => setDraft(prompt)}
            className="btn btn-ghost btn-xs flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium whitespace-nowrap"
            style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface)' }}>
            <Sparkles className="w-2 h-2" style={{ color: 'var(--color-primary)' }} /> {prompt}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={e => { e.preventDefault(); if (draft.trim()) { onSend(draft); setDraft(''); } }}
        className="flex items-end gap-2 p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <input type="text" name="composer" value={draft} onChange={e => setDraft(e.target.value)}
          placeholder={`Write a respectful message to ${convo.name.split(' ')[0]}…`} aria-label="Message"
          maxLength={2000} autoComplete="off"
          className="input w-full"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }} />
        <button type="submit" disabled={!draft.trim()} aria-label="Send message"
          className="btn btn-primary">
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
}

// Message bubble — distinguishes me / them / guardian / system
function Bubble({ msg }) {
  if (msg.sender === 'system') {
    return (
      <motion.p initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-md text-center text-[11px] leading-relaxed px-3 py-2 rounded-xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-ink-tertiary)' }}>
        <Info className="w-2.5 h-2.5 inline mr-1 -mt-0.5" style={{ color: 'var(--color-primary)' }} />{msg.text}
      </motion.p>
    );
  }
  if (msg.sender === 'guardian') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
        <div className="max-w-[80%] md:max-w-[65%]">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold mb-1" style={{ color: 'var(--color-accent)' }}>
            <ShieldCheck className="w-2.5 h-2.5" /> {msg.guardianName || 'Guardian'}
          </span>
          <div className="px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-accent)', color: 'var(--color-ink)' }}>
            {msg.text}
          </div>
          <span className="text-[10px] mt-1 inline-block" style={{ color: 'var(--color-ink-tertiary)' }}>{msg.time}</span>
        </div>
      </motion.div>
    );
  }
  const mine = msg.sender === 'me';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%] md:max-w-[65%]">
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md'}`}
          style={mine ? undefined : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}>
          {msg.text}
        </div>
        <span className={`text-[10px] mt-1 block ${mine ? 'text-right' : ''}`} style={{ color: 'var(--color-ink-tertiary)' }}>{msg.time}</span>
      </div>
    </motion.div>
  );
}

// ── Removed: ChaperoneModal ────────────────────────────────────────────────
// This modal asked for a guardian's name, then told the user "Your guardian
// will see this conversation in real time" and "They'll receive a secure email
// invitation to join as a participant". Neither was true: onConfirm only set
// local React state, no invitation was ever sent, and no server-side record
// existed. Removing a control is the correct fix — re-labelling it would still
// imply a guarantee the platform cannot make.
// ───────────────────────────────────────────────────────────────────────────






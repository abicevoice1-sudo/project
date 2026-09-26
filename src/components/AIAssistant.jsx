import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Shield, Sparkles, BadgeCheck, MessageCircleHeart } from 'lucide-react';
import { SUGGESTIONS, getReply, WELCOME } from '../lib/aiAssistantBrain';

/** Broadcast name any header/menu button can use to open the assistant. */
export const AI_OPEN_EVENT = 'open-ai-assistant';

export function openAIAssistant() {
  window.dispatchEvent(new CustomEvent(AI_OPEN_EVENT));
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (e.key === '/' && !isOpen) {
        const t = document.activeElement?.tagName;
        if (t !== 'INPUT' && t !== 'TEXTAREA') { e.preventDefault(); setIsOpen(true); }
      }
    };
    const openListener = () => setIsOpen(true);
    const esc = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', h);
    window.addEventListener('keydown', esc);
    window.addEventListener(AI_OPEN_EVENT, openListener);
    return () => {
      window.removeEventListener('keydown', h);
      window.removeEventListener('keydown', esc);
      window.removeEventListener(AI_OPEN_EVENT, openListener);
    };
  }, [isOpen]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = (e, preset) => {
    e?.preventDefault();
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    setMessages(p => [...p, { role: 'user', content: text }]);
    setInput(''); setLoading(true);
    setTimeout(() => {
      setMessages(p => [...p, { role: 'assistant', content: getReply(text) }]);
      setLoading(false);
    }, 900);
  };

  const reset = () => setMessages([]);

  return (
    <>
      <button type="button" className="ai-fab" data-ai-fab onClick={() => setIsOpen(true)} aria-label="Open AI assistant">
        <MessageCircleHeart className="w-4 h-4" /><span>Ask Assistant</span>
      </button>
      {isOpen && (<>
        <div className="ai-backdrop" onClick={() => setIsOpen(false)} />
        <aside className="ai-drawer" role="dialog" aria-label="AI assistant">
          <div className="ai-drawer-header">
            <div className="flex items-center gap-2.5">
              <div className="ai-orb"><Bot className="w-4 h-4" /></div>
              <div>
                <p className="ai-drawer-title">ShiaRishta Assistant</p>
                <p className="ai-drawer-sub"><BadgeCheck className="w-3 h-3" /> Respectful, halal-aware guidance</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="ai-icon-btn" onClick={reset} title="Clear conversation" aria-label="Clear conversation">
                <Sparkles className="w-4 h-4" />
              </button>
              <button className="ai-icon-btn" onClick={() => setIsOpen(false)} title="Close" aria-label="Close assistant">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="ai-drawer-body">
            <div className="ai-msg ai-msg-bot">
              <div className="ai-msg-avatar"><Bot className="w-3.5 h-3.5" /></div>
              <div className="ai-bubble">{WELCOME}</div>
            </div>

            {messages.length === 0 && (
              <div className="ai-chips">
                {SUGGESTIONS.map(s => (
                  <button key={s} type="button" className="ai-chip" onClick={() => send(null, s)}>{s}</button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'ai-msg ai-msg-user' : 'ai-msg ai-msg-bot'}>
                {m.role === 'assistant' && <div className="ai-msg-avatar"><Bot className="w-3.5 h-3.5" /></div>}
                <div className="ai-bubble">{m.content}</div>
              </div>
            ))}

            {loading && (
              <div className="ai-msg ai-msg-bot">
                <div className="ai-msg-avatar"><Bot className="w-3.5 h-3.5" /></div>
                <div className="ai-bubble ai-typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="ai-drawer-input" onSubmit={(e) => send(e)}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about verification, wali, privacy, halal rizz…"
              aria-label="Ask the assistant"
            />
            <button type="submit" className="ai-send" disabled={!input.trim() || loading} aria-label="Send">
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="ai-guardrail">
            <Shield className="w-3 h-3" />
            <span>Guardrails on: respectful guidance only. Concerns? support@shiarishta.com</span>
          </div>
        </aside>
      </>)}
    </>
  );
}
import { useEffect, useState } from 'react';

// Reusable FAQ section. Renders a visible accordion AND injects FAQPage
// JSON-LD (the answers must be visible on the page for Google to accept it).
export default function FaqSection({ heading = 'Frequently asked questions', items = [], id = 'faq' }) {
  const [open, setOpen] = useState(0);

  useEffect(() => {
    if (!items.length) return;
    const data = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = `faq-jsonld-${id}`;
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
    return () => document.getElementById(`faq-jsonld-${id}`)?.remove();
  }, [items, id]);

  if (!items.length) return null;

  return (
    <section className="hp-section" aria-labelledby={`${id}-heading`}>
      <div className="max-w-3xl mx-auto">
        <h2 id={`${id}-heading`} className="text-2xl font-bold text-ink text-center mb-8">{heading}</h2>
        <div className="space-y-3">
          {items.map((faq, i) => (
            <div key={i} className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-elevated)', borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-sm pr-4" style={{ color: 'var(--color-ink)' }}>{faq.q}</span>
                <span className="flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm leading-relaxed pt-4" style={{ color: 'var(--color-ink-secondary)', borderTop: '1px solid var(--color-border)' }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from '../layouts/LandingLayout';
import { Clock, ArrowLeft } from 'lucide-react';
import NotFound from './NotFound';

// articles.js holds all eight full-length articles — dynamically imported so
// it ships as its own async chunk instead of bloating the shared entry chunk.
const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
function toISO(display) {
  const m = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(display || '');
  return m ? `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, '0')}` : undefined;
}

// Individual article page: /blog/:slug — crawlable URL, unique meta (via Seo),
// and Article structured data for rich results.
export default function BlogPost() {
  const { slug } = useParams();
  const [articles, setArticles] = useState(null);
  useEffect(() => {
    let on = true;
    import('../data/articles.js').then((m) => { if (on) setArticles(m.articles); });
    return () => { on = false; };
  }, []);
  const article = articles?.find((a) => a.slug === slug);

  useEffect(() => {
    if (!article) return;
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.excerpt,
      image: `https://shiarishta.com${article.image}`,
      datePublished: toISO(article.date),
      dateModified: toISO(article.date),
      author: {
        '@type': 'Organization',
        name: 'ShiaRishta',
        url: 'https://shiarishta.com/',
      },
      publisher: {
        '@type': 'Organization',
        name: 'ShiaRishta',
        logo: { '@type': 'ImageObject', url: 'https://shiarishta.com/icon-512.png' },
      },
      mainEntityOfPage: `https://shiarishta.com/blog/${article.slug}`,
      inLanguage: 'en',
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'article-jsonld';
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
    return () => document.getElementById('article-jsonld')?.remove();
  }, [article]);

  if (!articles) {
    return (
      <Layout>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="animate-pulse">
            <div className="h-8 rounded-xl mb-4" style={{ background: 'var(--color-surface)' }} />
            <div className="h-4 rounded-xl w-2/3 mb-8" style={{ background: 'var(--color-surface)' }} />
            <div className="h-64 rounded-2xl" style={{ background: 'var(--color-surface)' }} />
          </div>
        </main>
      </Layout>
    );
  }

  if (!article) return <NotFound />;

  return (
    <Layout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link to="/blog" className="button ghost btn-sm mb-6 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to articles
        </Link>
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }}>{article.category}</span>
        <h1 style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.2, margin: '0.75rem 0 1rem' }}>{article.title}</h1>
        <div className="flex items-center gap-4 mb-6" style={{ color: 'var(--color-ink-faint)', fontSize: '0.8125rem' }}>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime} read</span>
          <span>{article.date}</span>
        </div>
        <div className="rounded-2xl overflow-hidden mb-8">
          <img src={article.image} alt={article.title} className="w-full h-64 sm:h-80 object-cover" loading="eager" />
        </div>
        <div style={{ color: 'var(--color-ink-secondary)', lineHeight: 1.8, fontSize: '1rem' }}>
          {article.body.map((b, i) => b.t === 'h2' ? (
            <h2 key={i} style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink)', margin: '2rem 0 0.75rem' }}>{b.x}</h2>
          ) : (
            <p key={i} style={{ marginBottom: '1.25rem' }}>{b.x}</p>
          ))}
        </div>
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
          <Link to="/auth/register" className="button primary px-6 py-2.5 font-semibold">Start your journey — it&rsquo;s free</Link>
        </div>
      </main>
    </Layout>
  );
}

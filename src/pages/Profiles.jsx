import { usePageTitle } from '../lib/usePageTitle';
import { useSearchParams } from 'react-router-dom';
import Layout from '../layouts/LandingLayout';
import ProfileCard from '../components/ProfileCard.jsx';
import CuratedMatchFeed from '../components/CuratedMatchFeed.jsx';
import { api } from '../lib/api/client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, LayoutGrid, Heart, AlertCircle, Shield
} from 'lucide-react';

const SECT_FILTERS = ['Any sect', 'Ithna Ashari (Twelver)', 'Ismaili', 'Bohra', 'Zaydi'];
const RELIGIOSITY_FILTERS = ['Any level', 'Very practicing', 'Practicing', 'Moderately practicing', 'Reconnecting'];
const EDUCATION_FILTERS = ['Any education', "Bachelor's degree", "Master's degree", 'Doctorate', 'Some college'];
// Marja' is the single most requested Shia filter — it decides which rulings
// govern a shared household, so it belongs next to sect, not buried.
const MARJA_FILTERS = ['Any marja', 'Sistani', 'Khamenei', 'Khoei', 'Tehrani', 'Shirazi', 'Other'];
const SORTS = [
  { value: 'match', label: 'Best match' },
  { value: 'newest', label: 'Newest members' },
  { value: 'age-asc', label: 'Age: low to high' },
  { value: 'age-desc', label: 'Age: high to low' }
];

const DEFAULT_FILTERS = {
  search: '', gender: '', minAge: '', maxAge: '', country: '',
  sect: 'Any sect', religiosity: 'Any level', education: 'Any education',
  marja: 'Any marja', photo: 'any', verifiedOnly: false, sort: 'match'
};

// Placeholder sentinels must be stripped before hitting the API, otherwise the
// server would filter for the literal string "Any sect" and return nothing.
const sentinels = new Set(['Any sect', 'Any level', 'Any education', 'Any marja', 'any', '']);
const clean = (v) => (v === undefined || sentinels.has(String(v)) ? undefined : String(v));

export default function Profiles() {
  usePageTitle('Browse Profiles');
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(9);

  const view = searchParams.get('view') === 'curated' ? 'curated' : 'grid';

  const setView = (v) => setSearchParams(v === 'curated' ? { view: 'curated' } : {}, { replace: true });
  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    api.getProfiles({}).then(data => { if (!cancelled) { setProfiles(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("We couldn't load profiles right now. Check your connection and try again."); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Re-fetch when a filter that the server owns changes. Previously every filter
  // was applied client-side against fields the API never returned, so six of the
  // seven silently produced an empty list.
  const serverFilterKey = useMemo(() => JSON.stringify({
    gender: clean(filters.gender),
    minAge: clean(filters.minAge),
    maxAge: clean(filters.maxAge),
    country: clean(filters.country),
    sect: clean(filters.sect),
    religiosity: clean(filters.religiosity),
    education: clean(filters.education),
    marja: clean(filters.marja),
    // The API param is `photoAccess`; the UI state key is `photo`.
    photoAccess: clean(filters.photo),
    verifiedOnly: filters.verifiedOnly,
    search: clean(filters.search),
  }), [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    // Pass the params as an OBJECT. getProfiles() builds the query string itself
    // via Object.entries(); handing it a pre-built '?marja=Sistani' string made
    // it iterate the characters, sending ?0=%3F&1=m&2=a... and filtering nothing.
    api.getProfiles(JSON.parse(serverFilterKey))
      .then(data => { if (!cancelled) { setProfiles(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("We couldn't load profiles right now. Check your connection and try again."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [serverFilterKey]);

  useEffect(() => { setVisibleCount(9); }, [filters]);

  const filtered = useMemo(() => {
    // Filtering is server-side now. Only the sort stays local, plus a guard that
    // never lets a private row reach the grid even if the server were to change.
    let list = profiles.filter(p => {
      if (p.locked) return false;
      if (p.visibility === 'private' && !p.isOwner) return false;
      return true;
    });

    switch (filters.sort) {
      case 'newest': list = [...list].reverse(); break;
      case 'age-asc': list = [...list].sort((a, b) => (a.age ?? 99) - (b.age ?? 99)); break;
      case 'age-desc': list = [...list].sort((a, b) => (b.age ?? 0) - (a.age ?? 0)); break;
      default: list = [...list].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }
    return list;
  }, [profiles, filters]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'sort') return v !== 'match';
    if (k === 'verifiedOnly') return v === true;
    if (typeof v === 'string') return v && !['Any sect', 'Any level', 'Any education', 'any'].includes(v);
    return false;
  }).length;

  return (
    <Layout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            Browse <span className="text-gradient">profiles</span>
          </h1>
          <p className="text-body mt-2 max-w-2xl">
            Intentional matchmaking for serious, verified members. Take your time — every profile represents a real person seeking a meaningful connection.
          </p>
        </div>

        {/* View toggle + search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2 p-1 rounded-lg" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setView('grid')}
              className={'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ' + (view === 'grid' ? 'shadow-sm' : '')}
              style={view === 'grid' ? { background: 'var(--color-elevated)', color: 'var(--color-ink)' } : { color: 'var(--color-ink-secondary)' }}
            >
              <LayoutGrid className="w-4 h-4" /> Grid
            </button>
            <button
              onClick={() => setView('curated')}
              className={'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ' + (view === 'curated' ? 'shadow-sm' : '')}
              style={view === 'curated' ? { background: 'var(--color-elevated)', color: 'var(--color-ink)' } : { color: 'var(--color-ink-secondary)' }}
            >
              <Heart className="w-4 h-4" /> Curated
            </button>
          </div>

          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />
              <input
                type="text"
                placeholder="Search by name, profession, city..."
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
                className="input input-with-icon"
                style={{ background: 'var(--color-surface)' }}
                aria-label="Search profiles"
              />
            </div>
          </div>

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={'btn btn-secondary flex items-center gap-2 ' + (activeFilterCount > 0 ? 'btn-primary' : '')}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden mb-6"
            >
              <div className="card p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Sect</label>
                    <select value={filters.sect} onChange={e => setFilter('sect', e.target.value)} className="input" style={{ background: 'var(--color-surface)' }}>
                      {SECT_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Religiosity</label>
                    <select value={filters.religiosity} onChange={e => setFilter('religiosity', e.target.value)} className="input" style={{ background: 'var(--color-surface)' }}>
                      {RELIGIOSITY_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Education</label>
                    <select value={filters.education} onChange={e => setFilter('education', e.target.value)} className="input" style={{ background: 'var(--color-surface)' }}>
                      {EDUCATION_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Marja&apos;</label>
                    <select value={filters.marja} onChange={e => setFilter('marja', e.target.value)} className="input" style={{ background: 'var(--color-surface)' }}>
                      {MARJA_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Photo access</label>
                    <select value={filters.photo} onChange={e => setFilter('photo', e.target.value)} className="input" style={{ background: 'var(--color-surface)' }}>
                      <option value="any">Any</option>
                      <option value="public">Photos public</option>
                      <option value="members">Members tier</option>
                      <option value="private">Photos private</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Sort by</label>
                    <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)} className="input" style={{ background: 'var(--color-surface)' }}>
                      {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-ink-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={filters.verifiedOnly}
                      onChange={e => setFilter('verifiedOnly', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <Shield className="w-4 h-4" /> Verified only
                  </label>
                  {activeFilterCount > 0 && (
                    <button onClick={() => setFilters(DEFAULT_FILTERS)} className="btn btn-ghost btn-sm">
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
            {loading ? 'Loading profiles...' : filtered.length + ' member' + (filtered.length !== 1 ? 's' : '') + ' found'}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}>
                <div className="h-52 skeleton" />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 w-2/3 rounded skeleton" />
                  <div className="h-3 w-1/2 rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-danger)' }} />
            <h3 className="empty-state-title">Couldn&apos;t load profiles</h3>
            <p className="empty-state-text mb-4">{error}</p>
            <button onClick={load} className="btn btn-primary">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-ink-tertiary)' }} />
            <h3 className="empty-state-title">No profiles match your filters</h3>
            <p className="empty-state-text mb-4">Try adjusting your search criteria to see more members.</p>
            <button onClick={() => setFilters(DEFAULT_FILTERS)} className="btn btn-secondary">Clear filters</button>
          </div>
        ) : view === 'curated' ? (
          <CuratedMatchFeed profiles={filtered} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {visible.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProfileCard profile={p} />
                </motion.div>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setVisibleCount(c => c + 9)}
                  className="btn btn-secondary"
                >
                  Load more profiles
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}

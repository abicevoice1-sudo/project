import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Bookmark, MapPin, Briefcase, Shield, Lock, Sparkles } from 'lucide-react';
import { useAuthedImage } from '../lib/api/useAuthedImage';
import { computeCompatibility, getMyProfile } from '../lib/compatibility';

function excerptText(value, maxLength = 90) {
  const text = String(value || '').trim();
  if (!text) return 'No profile summary yet.';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '').trim() + '...';
}

export default function ProfileCard({ profile, className = '' }) {
  const [saved, setSaved] = useState(false);
  // Interest state is server truth: initialise from the profile payload when
  // the API provides it, and persist every tap via the API — the button used
  // to be a local-only toggle that silently dropped the interest on reload.
  const [interested, setInterested] = useState(() => profile.interestSent === true);
  const [interestBusy, setInterestBusy] = useState(false);
  const [interestError, setInterestError] = useState('');

  const handleInterest = async (e) => {
    e.preventDefault();
    if (interestBusy) return;
    setInterestBusy(true);
    setInterestError('');
    try {
      const { api } = await import('../lib/api/client');
      if (interested) {
        await api.withdrawInterest(profile.id);
        setInterested(false);
      } else {
        await api.expressInterest(profile.id);
        setInterested(true);
      }
    } catch (err) {
      setInterestError(err.message || (interested ? 'Could not withdraw interest.' : 'Could not send interest.'));
    } finally {
      setInterestBusy(false);
    }
  };
  // Real compatibility score — computed from the viewer's onboarding answers
  // vs this profile. Null when the viewer hasn't onboarded (no honest basis
  // for a score), so we show nothing rather than a fabricated number.
  const matchScore = useMemo(() => {
    try {
      const me = getMyProfile();
      if (!me || !me.sect) return null;
      return computeCompatibility(profile, me)?.overall ?? null;
    } catch {
      return null;
    }
  }, [profile.id]);
  // The server sends `photosVisibility` / `photosLocked`. The old `photoAccess`
  // field was never returned, so this always evaluated false and the "blurred"
  // state could never appear.
  const photoLocked = profile.photosLocked === true;
  // Photos are fetched with the bearer token: a plain <img src> cannot send the
  // Authorization header, so a members/private tier would 401 and render broken.
  const { url: photoUrl } = useAuthedImage(photoLocked ? null : profile.photo);
  const hasPhoto = Boolean(photoUrl);
  // The API returns `bio` (and `expectations` / `aboutFamily`). There is no
  // `about` field on the payload — reading it made excerptText() fall through
  // to "No profile summary yet." for EVERY member, no matter what they wrote.
  // Fall back to aboutFamily so a member who only filled that in still shows
  // something meaningful on the card.
  const about = excerptText(profile.bio || profile.aboutFamily);

  return (
    <motion.article
      className={'premium-card overflow-hidden flex flex-col group ' + className}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={'/profiles/' + profile.id} className="block flex-1">
        {/* Photo */}
        <div className="relative aspect-[4/4.6] overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          {/* Only ever render a real photo. The old `|| stock-unsplash-url`
              fallback put the same stranger's face on every card and
              misrepresented every member shown. */}
          {hasPhoto && (
            <img
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              src={photoUrl}
              alt={profile.displayName}
              loading="lazy"
              decoding="async"
              onError={e => { e.currentTarget.style.display = 'none'; }}
              style={{ objectPosition: 'center top', position: 'relative', zIndex: 1 }}
            />
          )}
          {/* Elegant fallback monogram */}
          <div
            aria-hidden={hasPhoto || undefined}
            role={hasPhoto ? undefined : 'img'}
            aria-label={
              photoLocked
                ? `Photos of ${profile.displayName} are private`
                : `${profile.displayName} has not added a photo`
            }
            className="absolute inset-0 flex items-center justify-center text-4xl font-bold select-none"
            style={{
              background: 'linear-gradient(160deg, #134e39 0%, #0c1220 70%)',
              color: 'rgba(212,175,105,0.35)',
              zIndex: 0,
            }}
          >
            {(profile.displayName || '?').trim()[0]?.toUpperCase()}
          </div>
          {/* Bottom gradient scrim */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

          {photoLocked && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(7,10,18,0.55)' }}>
              <div className="text-center text-white space-y-1 px-4">
                <div
                  className="w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-1.5"
                  style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-semibold">{profile.photoAccess === 'match' ? '💍 After match' : '👁️ After interest'}</p>
                <p className="text-[9px] opacity-60">Private until mutual step</p>
              </div>
            </div>
          )}

          {/* Match score — only when honestly computable */}
          {typeof matchScore === 'number' && !Number.isNaN(matchScore) && (
            <div
              className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-md"
              style={{ background: 'rgba(11,15,23,0.6)', border: '1px solid rgba(255,255,255,0.18)', color: 'var(--color-success)', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}
              title="Compatibility based on your onboarding answers: faith alignment, values, lifestyle, and timeline."
            >
              {matchScore}% match
            </div>
          )}

          {/* Verified */}
          {profile.is_verified && (
            <div
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg,#34d399,#10b981)',
                boxShadow: '0 4px 14px rgba(52,211,153,0.5)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
          )}

          {/* Syed / Sadat badge */}
          {(profile.syedStatus === 'sadat-both' || profile.syedStatus === 'syed-paternal') && (
            <div
              className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: 'linear-gradient(135deg,#d4af37,#b8860b)',
                color: '#1a1a1a',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              title={profile.syedStatus === 'sadat-both' ? 'Syed / Sadat — both sides' : 'Syed (paternal)'}
            >
              Syed
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-ink)' }}>
              {profile.displayName}{profile.age ? ', ' + profile.age : ''}
            </h3>
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)', opacity: 0.7 }} />
          </div>
          <p className="flex items-center gap-1 text-xs truncate" style={{ color: 'var(--color-ink-secondary)' }}>
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {/* Both fields were interpolated unconditionally, so a member with
                no city rendered a bare ", " next to the pin. */}
            {[profile.city, profile.country].filter(Boolean).join(', ') || 'Location not shared'}
          </p>
          <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            {/* "Marriage-minded" read like a location next to the MapPin line
                above and confused members. Say plainly that it is unknown. */}
            {profile.profession || 'Occupation not shared'}
          </p>
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-ink-secondary)' }}>{about}</p>
          {profile.religiosity && <span className="badge-primary text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>{profile.religiosity}</span>}
        </div>
      </Link>

      {/* Actions */}
      <div className="px-3.5 pb-3.5 flex gap-2">
        <button
          onClick={handleInterest}
          disabled={interestBusy}
          className={'flex-1 py-2.5 min-h-[38px] text-xs font-semibold flex items-center justify-center gap-1 rounded-lg transition-all disabled:opacity-60 ' + (interested ? '' : 'btn-primary')}
          style={{ minHeight: '38px', ...(interested ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-subtle)' } : undefined) }}
          title={interestError || (interested ? 'Click to withdraw interest' : undefined)}
          aria-label={interested ? `Withdraw interest in ${profile.displayName}` : `Express interest in ${profile.displayName}`}
        >
          <Heart className={'w-3.5 h-3.5 ' + (interested ? 'fill-current' : '')} />
          {interestBusy ? (interested ? 'Withdrawing…' : 'Sending…') : interested ? 'Interested' : 'Interest'}
        </button>
        <button
          onClick={e => { e.preventDefault(); setSaved(!saved); }}
          className="btn-secondary p-2.5"
          aria-label={`Save ${profile.displayName} to favorites`}
          style={{ minWidth: '38px', minHeight: '38px' }}
        >
          <Bookmark
            className="w-3.5 h-3.5"
            style={{ color: saved ? 'var(--color-primary)' : 'var(--color-ink-tertiary)', fill: saved ? 'var(--color-primary)' : 'none' }}
          />
        </button>
      </div>
    </motion.article>
  );
}

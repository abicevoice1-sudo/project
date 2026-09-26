import BrandLogo from './BrandLogo';

// ShiaRishta wordmark lockup — "top in the world" edition (2026-09-26).
//
// Title-case serif wordmark in the brand display face (Cormorant Garamond):
// "Shia" upright in ink, "Rishta" italic in sage — an editorial two-tone
// treatment that reads premium at every size. Tagline set in tracked-out
// uppercase. Inherits theme colors via CSS vars, so it works on light,
// dark, and tinted surfaces without variants.
export default function BrandLockup({
  iconSize = 36,
  tagline = true,
  className = '',
  style = {},
}) {
  const wordSize = Math.round(iconSize * 0.66);
  const tagSize = Math.max(8, Math.round(iconSize * 0.22));
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: iconSize * 0.32, ...style }}
    >
      <BrandLogo size={iconSize} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span
          style={{
            fontFamily: "'Cormorant Garamond', 'Iowan Old Style', Georgia, serif",
            fontWeight: 600,
            fontSize: wordSize,
            letterSpacing: '-0.01em',
            color: 'var(--color-ink)',
            whiteSpace: 'nowrap',
          }}
        >
          Shia<span style={{ fontStyle: 'italic', color: 'var(--color-sage)' }}>Rishta</span>
        </span>
        {tagline && (
          <span
            style={{
              fontSize: tagSize,
              fontWeight: 600,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-tertiary)',
              whiteSpace: 'nowrap',
              marginTop: 2,
            }}
          >
            Nikah Matchmaking
          </span>
        )}
      </span>
    </span>
  );
}

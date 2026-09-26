import BrandLogo from './BrandLogo';

// ShiaRishta brand mark — "The Nikah Knot" (v2, 2026-09-26).
//
// Original construction on a 512 grid: two interlocked wedding bands weave
// over–under to form an S-curve (two lives, one bond). At the crossing sits an
// 8-pointed Rub el Hizb star (۞) — a classical Islamic geometric motif —
// rendered here in our own geometry, the mark's distinctive, ownable element.
//
// Palette is drawn from the product's light-theme tokens so the mark always
// blends with the site: deep sage tile (#33604F → #1B3D31, the sage-dark
// family), warm paper rings (#FFFAF4), burnished gold star (#B98334).
//
// `detail`: full artwork (gold keyline + standard star) for app-icon sizes.
// Small-size variant (header, favicon) drops the keyline — it turns to mud
// under ~40px — and enlarges the star so the mark stays crisp.
const STAR_FULL =
  '256,220 261.7,242.1 281.5,230.5 269.9,250.3 292,256 269.9,261.7 281.5,281.5 261.7,269.9 256,292 250.3,269.9 230.5,281.5 242.1,261.7 220,256 242.1,250.3 230.5,230.5 250.3,242.1';
const STAR_SM =
  '256,216 262.5,240.3 284.3,227.7 271.7,249.5 296,256 271.7,262.5 284.3,284.3 262.5,271.7 256,296 249.5,271.7 227.7,284.3 240.3,262.5 216,256 240.3,249.5 227.7,227.7 249.5,240.3';

export default function BrandLogo({ size = 34, detail, className = '', style = {} }) {
  const full = detail !== undefined ? detail : size >= 44;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      style={{ borderRadius: size * 0.23, display: 'block', flexShrink: 0, ...style }}
      aria-label="ShiaRishta logo"
      role="img"
    >
      <defs>
        <linearGradient id="srk-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#33604F" />
          <stop offset="1" stopColor="#1B3D31" />
        </linearGradient>
        <radialGradient id="srk-star" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stopColor="#DDAE54" />
          <stop offset="1" stopColor="#B98334" />
        </radialGradient>
        <mask id="srk-under">
          <rect width="512" height="512" fill="white" />
          <circle cx="314" cy="304" r="88" fill="none" stroke="black" strokeWidth="78" />
        </mask>
      </defs>
      {/* tile */}
      <rect width="512" height="512" rx="116" fill="url(#srk-bg)" />
      {/* burnished-gold keyline (large sizes only) */}
      {full && (
        <rect x="30" y="30" width="452" height="452" rx="100" fill="none"
          stroke="#B98334" strokeOpacity="0.38" strokeWidth="4" />
      )}
      {/* back ring (passes under) */}
      <g mask="url(#srk-under)">
        <circle cx="198" cy="208" r="88" fill="none" stroke="#FFFAF4" strokeWidth="54" />
      </g>
      {/* front ring (passes over) */}
      <circle cx="314" cy="304" r="88" fill="none" stroke="#FFFAF4" strokeWidth="54" />
      {/* Rub el Hizb star at the crossing */}
      <polygon
        fill="url(#srk-star)"
        stroke="#8A5F22"
        strokeWidth="3"
        strokeLinejoin="round"
        points={full ? STAR_FULL : STAR_SM}
      />
    </svg>
  );
}

// ShiaRishta brand mark — the heart (2026-09-26).
//
// A layered heart on a near-black tile: fresh emerald at the lobes warming to
// a golden green at the point, with a deep-green inner heart. Reads cleanly
// from 16px favicon up to app-icon sizes, so no detail variants are needed.
export default function BrandLogo({ size = 34, detail: _detail, className = '', style = {} }) {
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
        <linearGradient id="srh-heart" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#5be3a0" />
          <stop offset="0.62" stopColor="#33c37f" />
          <stop offset="1" stopColor="#a4c639" />
        </linearGradient>
      </defs>
      {/* tile */}
      <rect width="512" height="512" rx="116" fill="#14181d" />
      {/* outer heart */}
      <path
        fill="url(#srh-heart)"
        d="M256 402 C170 332 92 272 92 194 C92 134 138 96 194 96 C224 96 246 112 256 136 C266 112 288 96 318 96 C374 96 420 134 420 194 C420 272 342 332 256 402 Z"
      />
      {/* inner heart */}
      <path
        fill="#1d7a4d"
        opacity="0.94"
        d="M256 302 C218 268 182 234 182 192 C182 160 206 138 234 138 C248 138 256 146 256 158 C256 146 264 138 278 138 C306 138 330 160 330 192 C330 234 294 268 256 302 Z"
      />
    </svg>
  );
}

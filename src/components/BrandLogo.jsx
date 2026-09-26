export default function BrandLogo({ size = 34, className = '', style = {} }) {
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
        <linearGradient id="srl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="srl-ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D1FAE5" />
        </linearGradient>
        <mask id="srl-under">
          <rect width="512" height="512" fill="white" />
          <circle cx="312" cy="302" r="86" fill="none" stroke="black" strokeWidth="76" />
        </mask>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#srl-bg)" />
      <g mask="url(#srl-under)">
        <circle cx="200" cy="210" r="86" fill="none" stroke="url(#srl-ring)" strokeWidth="54" />
      </g>
      <circle cx="312" cy="302" r="86" fill="none" stroke="url(#srl-ring)" strokeWidth="54" />
      <circle cx="256" cy="256" r="20" fill="#F5C86B" />
    </svg>
  );
}

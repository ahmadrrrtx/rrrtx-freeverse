/**
 * CertBadge — premium achievement medal/badge.
 * Replaces the old CertSeal. More modern, more confident.
 *
 * Composition:
 *   - Outer scalloped gold ring (16 notches — like a medal)
 *   - Inner solid gold disk with subtle gradient sheen
 *   - Star burst pattern behind
 *   - Center: bold "RRRTX" wordmark stacked over "VERIFIED"
 *   - "FREEVERSE" wraps around the bottom in curved text
 *   - Subtle 3D shadow + edge highlight (looks pressed/embossed)
 *
 * Inline SVG → scales crisp at any size, embeds in PDF flawlessly.
 */
export function CertBadge({ size = 120 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Verified by RRRTX FreeVerse — achievement badge"
    >
      <defs>
        {/* Main gold gradient — light top, deep bottom */}
        <linearGradient id="badgeGold" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"  stopColor="#F0D785" />
          <stop offset="35%" stopColor="#D4AF37" />
          <stop offset="65%" stopColor="#B8923D" />
          <stop offset="100%" stopColor="#8A6B22" />
        </linearGradient>

        {/* Inner disk gradient — slightly different angle for depth */}
        <linearGradient id="badgeInner" x1="30%" y1="20%" x2="70%" y2="80%">
          <stop offset="0%"  stopColor="#E5C97A" />
          <stop offset="50%" stopColor="#B8923D" />
          <stop offset="100%" stopColor="#7A5E1E" />
        </linearGradient>

        {/* Top-left highlight (specular shine) */}
        <radialGradient id="badgeShine" cx="30%" cy="25%" r="50%">
          <stop offset="0%"  stopColor="#FFFDF0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFFDF0" stopOpacity="0" />
        </radialGradient>

        {/* Drop shadow for 3D depth */}
        <filter id="badgeShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="3" />
          <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Curved path for "FREEVERSE" text wrapping bottom */}
        <path id="freeverseArc" d="M 60 130 A 60 60 0 0 0 180 130" fill="none" />
        {/* Curved path for top "RRRTX VERIFIED" text */}
        <path id="rrrtxArc" d="M 60 110 A 60 60 0 0 1 180 110" fill="none" />
      </defs>

      {/* ───── Scalloped outer ring (medal-like notched edge) ───── */}
      <g filter="url(#badgeShadow)">
        {/* 16-notch starburst — gives medal-edge feel */}
        <g>
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 22.5) * (Math.PI / 180);
            const x1 = 120 + Math.cos(angle) * 100;
            const y1 = 120 + Math.sin(angle) * 100;
            const x2 = 120 + Math.cos(angle) * 112;
            const y2 = 120 + Math.sin(angle) * 112;
            return (
              <circle key={i} cx={x2} cy={y2} r="8" fill="url(#badgeGold)" opacity="0.85" />
            );
          })}
        </g>

        {/* Outer gold ring */}
        <circle cx="120" cy="120" r="100" fill="url(#badgeGold)" />

        {/* Inner ring channel (slightly darker, creates "rim" effect) */}
        <circle cx="120" cy="120" r="92" fill="none" stroke="#5C4A1A" strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="120" cy="120" r="88" fill="none" stroke="#FFE9B0" strokeWidth="0.5" strokeOpacity="0.4" />

        {/* Inner solid disk — where the wordmark sits */}
        <circle cx="120" cy="120" r="78" fill="url(#badgeInner)" />

        {/* Inner ring highlight */}
        <circle cx="120" cy="120" r="78" fill="none" stroke="#FFE9B0" strokeWidth="0.5" strokeOpacity="0.5" />

        {/* Specular shine (top-left light) */}
        <circle cx="120" cy="120" r="78" fill="url(#badgeShine)" />
      </g>

      {/* ───── Center wordmark ───── */}
      {/* RRRTX (top) */}
      <text
        x="120" y="100"
        textAnchor="middle"
        fontFamily="'Satoshi', system-ui, sans-serif"
        fontSize="24"
        fontWeight="900"
        fill="#1A1610"
        letterSpacing="2"
      >
        RRRTX
      </text>

      {/* Thin divider line */}
      <line x1="92" y1="116" x2="148" y2="116" stroke="#1A1610" strokeWidth="1" strokeOpacity="0.5" />

      {/* VERIFIED (bottom) */}
      <text
        x="120" y="138"
        textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="11"
        fontWeight="700"
        fill="#1A1610"
        letterSpacing="3"
      >
        VERIFIED
      </text>

      {/* Tiny ◐ mark below */}
      <g transform="translate(120, 152)">
        <circle cx="0" cy="0" r="6" fill="#1A1610" fillOpacity="0.85" />
        <path d="M 0 -6 A 6 6 0 0 1 0 6 Z" fill="#FFE9B0" fillOpacity="0.9" />
      </g>

      {/* Curved text — top arc says "RRRTX FREEVERSE" */}
      <text
        fontFamily="'JetBrains Mono', monospace"
        fontSize="7.5"
        fontWeight="700"
        fill="#1A1610"
        fillOpacity="0.75"
        letterSpacing="2"
      >
        <textPath href="#rrrtxArc" startOffset="50%" textAnchor="middle">
          RRRTX FREEVERSE · 2026
        </textPath>
      </text>

      {/* Curved text — bottom arc says "CERTIFIED EXCELLENCE" */}
      <text
        fontFamily="'JetBrains Mono', monospace"
        fontSize="7.5"
        fontWeight="700"
        fill="#1A1610"
        fillOpacity="0.75"
        letterSpacing="2"
      >
        <textPath href="#freeverseArc" startOffset="50%" textAnchor="middle">
          CERTIFIED EXCELLENCE
        </textPath>
      </text>
    </svg>
  );
}

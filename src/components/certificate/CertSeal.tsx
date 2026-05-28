/**
 * CertSeal — the wax-seal-style emblem in the bottom-right of the cert.
 *
 * Composition:
 *   - Outer ring with curved "RRRTX · FREEVERSE · CERTIFIED · 2026" text
 *   - Inner solid disk in champagne gold gradient
 *   - Center: the ◐ wordmark in dark gold
 *   - Pressed-in shadow effect (looks like wax stamp)
 *
 * Rendered as inline SVG so it scales perfectly + prints crisp.
 */
export function CertSeal({ size = 120 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="RRRTX FreeVerse certified seal"
      role="img"
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5C97A" />
          <stop offset="50%" stopColor="#B8923D" />
          <stop offset="100%" stopColor="#8A6B22" />
        </linearGradient>
        <radialGradient id="goldShine" cx="35%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#FFE9B0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#B8923D" stopOpacity="0" />
        </radialGradient>
        <filter id="sealShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="0" dy="2" result="offset" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Curved path for outer ring text */}
        <path
          id="ringPath"
          d="M 100 100 m -76 0 a 76 76 0 1 1 152 0 a 76 76 0 1 1 -152 0"
        />
      </defs>

      {/* Outer ring — thin gold circle */}
      <circle
        cx="100" cy="100" r="90"
        fill="none"
        stroke="#B8923D"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
      <circle
        cx="100" cy="100" r="83"
        fill="none"
        stroke="#B8923D"
        strokeWidth="0.5"
        strokeOpacity="0.6"
      />

      {/* Curved ring text */}
      <text
        fontFamily="'JetBrains Mono', monospace"
        fontSize="9"
        fontWeight="600"
        fill="#8A6B22"
        letterSpacing="3"
      >
        <textPath href="#ringPath" startOffset="0%">
          RRRTX · FREEVERSE · CERTIFIED · 2026 · RRRTX · FREEVERSE ·
        </textPath>
      </text>

      {/* Inner gold disk */}
      <circle
        cx="100" cy="100" r="56"
        fill="url(#goldGradient)"
        filter="url(#sealShadow)"
      />
      {/* Shine highlight */}
      <circle cx="100" cy="100" r="56" fill="url(#goldShine)" />

      {/* The ◐ mark — split semicircle */}
      <g transform="translate(100, 100)">
        {/* Left half — dark */}
        <path
          d="M 0 -28 A 28 28 0 0 0 0 28 Z"
          fill="#1A1610"
        />
        {/* Right half — light cream */}
        <path
          d="M 0 -28 A 28 28 0 0 1 0 28 Z"
          fill="#FBF8F3"
          fillOpacity="0.9"
        />
        {/* Center thin line */}
        <line x1="0" y1="-28" x2="0" y2="28" stroke="#8A6B22" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

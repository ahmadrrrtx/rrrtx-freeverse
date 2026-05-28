/**
 * CertCorners — subtle dot-matrix corner ornaments.
 * Inline SVG, soft gold dots at 4 corners of the certificate.
 * Adds "expensive paper" texture without being decorative bloat.
 */
export function CertCorners() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full"
      viewBox="0 0 297 210"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="dotGrid" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.35" fill="#B8923D" opacity="0.35" />
        </pattern>
        <radialGradient id="cornerFade" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="tlMask"><rect x="0" y="0" width="50" height="50" fill="url(#cornerFade)" /></mask>
        <mask id="trMask"><rect x="247" y="0" width="50" height="50" fill="url(#cornerFade)" transform="translate(297, 0) scale(-1, 1)" /></mask>
        <mask id="blMask"><rect x="0" y="160" width="50" height="50" fill="url(#cornerFade)" transform="translate(0, 210) scale(1, -1)" /></mask>
        <mask id="brMask"><rect x="247" y="160" width="50" height="50" fill="url(#cornerFade)" transform="translate(297, 210) scale(-1, -1)" /></mask>
      </defs>

      <rect x="0"   y="0"   width="50" height="50" fill="url(#dotGrid)" mask="url(#tlMask)" />
      <rect x="247" y="0"   width="50" height="50" fill="url(#dotGrid)" mask="url(#trMask)" />
      <rect x="0"   y="160" width="50" height="50" fill="url(#dotGrid)" mask="url(#blMask)" />
      <rect x="247" y="160" width="50" height="50" fill="url(#dotGrid)" mask="url(#brMask)" />
    </svg>
  );
}

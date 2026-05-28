import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CertBadge } from './CertBadge';
import { CertCorners } from './CertCorners';

export interface CertificateData {
  recipientName: string;
  quizTitle: string;
  quizCategory: string;
  score: number;
  certId: string;
  dateISO: string;
  verifyUrl: string;
}

interface CertificateProps {
  data: CertificateData;
  forPdf?: boolean;
  animated?: boolean;
}

/**
 * RRRTX FreeVerse Certificate — clean rebuild (v3).
 *
 * Layout (A4 landscape, container-query responsive):
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ ~rrrtx_freeverse                  // certificate of  │  ← HEADER
 *   │                                      completion      │
 *   │                                                      │
 *   │                                                      │
 *   │ Certificate of Excellence            ┌──────────┐    │
 *   │                                      │  BADGE   │    │  ← TWO-COLUMN MAIN
 *   │ Prompt Engineering                   │  ◯ 130px │    │     (text left,
 *   │ Fundamentals.                        └──────────┘    │      badge right)
 *   │ ──                                                   │
 *   │                                      verified by     │
 *   │ AWARDED TO                           rrrtx freeverse │
 *   │                                                      │
 *   │ Muhammad Ahmad                                       │
 *   │                                                      │
 *   │ Score 92 / 100 — for passing the ai certification.   │
 *   │                                                      │
 *   ├──────────────────────────────────────────────────────┤
 *   │ ┌──┐  CERT ID                Ahmad sig    ISSUED     │  ← FOOTER
 *   │ │QR│  RFV-2026-...           ─────────    13 Mar     │     (3 evenly
 *   │ └──┘  VERIFY AT              Muhammad     2026       │      spaced cols)
 *   │       rrrtx-...              Ahmad                   │
 *   └──────────────────────────────────────────────────────┘
 *
 * Key fixes vs v2:
 *   1. Badge moved to top-right of the main block — sits clean beside the title
 *   2. "Verified by" label sits DIRECTLY under the badge, no floating
 *   3. Footer is a proper 3-col grid, no nesting badge/date together
 *   4. Score line is its own row — no awkward inline wrap with description
 *   5. Signature filter cleaned: grayscale + brightness for proper pen-on-paper look
 *   6. Removed WONK font variation (was glitchy in some browsers)
 *   7. Consistent padding across header/main/footer (uses ~5% throughout)
 */
export function Certificate({ data, forPdf = false, animated = true }: CertificateProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(data.verifyUrl, {
      margin: 0,
      width: 240,
      color: { dark: '#1A1610', light: '#FBF8F3' },
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [data.verifyUrl]);

  const date = new Date(data.dateISO);
  const formattedDate = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const wrapperClass = forPdf
    ? 'relative w-[297mm] h-[210mm]'
    : 'relative w-full aspect-[297/210]';

  // ── Animation helper ──
  // IMPORTANT: do not build Tailwind arbitrary animation classes dynamically here.
  // Tailwind cannot see runtime-generated classes like
  // `[animation:..._${delayMs}ms_forwards]`, so production builds kept these
  // elements at `opacity-0`. That is why only the inline-animated name/badge
  // appeared in the generated certificate. Keep static visibility here; the
  // name + badge still use safe inline animations below.
  const animClass = (_delayMs: number) => '';

  return (
    <div className={wrapperClass} style={{ containerType: 'inline-size' }}>
      {/* ─── Animation keyframes ─── */}
      <style>{`
        @keyframes cert-fade-in {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cert-name-stamp {
          0%   { opacity: 0; transform: translateY(8px) scale(0.97); }
          70%  { opacity: 1; transform: translateY(0) scale(1.015); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cert-badge-pop {
          0%   { opacity: 0; transform: scale(0.7) rotate(-4deg); }
          70%  { opacity: 1; transform: scale(1.04) rotate(1deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
      `}</style>

      {/* ─── PAPER ─── */}
      <div
        id="cert-paper"
        className="absolute inset-0 overflow-hidden shadow-cert"
        style={{ backgroundImage: 'linear-gradient(135deg, #FBF8F3 0%, #F4EFE5 100%)' }}
      >
        {/* Subtle dot-matrix corners */}
        <CertCorners />

        {/* Inner gold hairline frame */}
        <div
          className="absolute pointer-events-none"
          style={{
            top:    '3%',
            left:   '2.2%',
            right:  '2.2%',
            bottom: '3%',
            border: '0.5px solid #D9CFBC',
          }}
        />

        {/* ─── CONTENT — single column with sections ─── */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{ padding: '4.5% 5.5%' }}
        >

          {/* ───── HEADER ───── */}
          <header className={`flex justify-between items-baseline ${animClass(0)}`}>
            <div
              className="font-mono font-semibold text-[#1A1610]"
              style={{ fontSize: 'clamp(11px, 1.2cqi, 18px)' }}
            >
              <span style={{ color: '#00964A' }}>~</span>rrrtx_freeverse
            </div>
            <div
              className="font-mono uppercase tracking-[0.18em] text-[#8A6B22]"
              style={{ fontSize: 'clamp(8px, 0.85cqi, 12px)' }}
            >
              <span className="opacity-50">// </span>certificate of completion
            </div>
          </header>

          {/* ───── MAIN BLOCK — two columns, text left + badge right ───── */}
          <div
            className="flex-1 grid items-center"
            style={{
              gridTemplateColumns: '1fr auto',
              gap: '5%',
              paddingTop:    '3%',
              paddingBottom: '3%',
            }}
          >

            {/* ── LEFT: title + name + score ── */}
            <div className="flex flex-col min-w-0">

              {/* Eyebrow: "Certificate of Excellence" */}
              <div
                className={`${animClass(150)}`}
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontVariationSettings: '"opsz" 144, "SOFT" 50',
                  color: '#8A6B22',
                  letterSpacing: '-0.01em',
                  fontSize: 'clamp(13px, 2cqi, 28px)',
                  lineHeight: 1,
                  marginBottom: 'clamp(8px, 1.4cqi, 18px)',
                }}
              >
                Certificate of Excellence
              </div>

              {/* COURSE TITLE — Satoshi Black */}
              <h1
                className={`font-display font-black text-[#1A1610] ${animClass(300)}`}
                style={{
                  fontSize: 'clamp(26px, 5.2cqi, 80px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.035em',
                  maxWidth: '16ch',
                }}
              >
                {data.quizTitle}.
              </h1>

              {/* Gold rule */}
              <div
                className={animClass(500)}
                style={{
                  width: '11%',
                  height: '1.5px',
                  background: '#B8923D',
                  marginTop:    'clamp(14px, 2cqi, 24px)',
                  marginBottom: 'clamp(14px, 2cqi, 24px)',
                }}
              />

              {/* "AWARDED TO" eyebrow */}
              <div
                className={`font-mono uppercase tracking-[0.22em] text-[#8A6B22] ${animClass(600)}`}
                style={{
                  fontSize: 'clamp(8px, 0.85cqi, 11px)',
                  marginBottom: 'clamp(6px, 1cqi, 12px)',
                }}
              >
                awarded to
              </div>

              {/* RECIPIENT NAME — the hero */}
              <div
                className="text-[#1A1610]"
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontVariationSettings: '"opsz" 144, "SOFT" 50',
                  fontSize: 'clamp(34px, 7cqi, 100px)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  opacity: animated ? 0 : 1,
                  animation: animated
                    ? 'cert-name-stamp 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 800ms forwards'
                    : undefined,
                }}
              >
                {data.recipientName}
              </div>

              {/* SCORE line — one clean horizontal row */}
              <div
                className={`flex items-baseline gap-[10px] flex-wrap ${animClass(1100)}`}
                style={{ marginTop: 'clamp(14px, 2.4cqi, 28px)' }}
              >
                <span
                  className="font-mono uppercase tracking-[0.18em] text-[#8A6B22]"
                  style={{ fontSize: 'clamp(8px, 0.85cqi, 11px)' }}
                >
                  score
                </span>
                <span className="flex items-baseline gap-[2px]">
                  <span
                    className="font-display font-black"
                    style={{
                      color: '#00964A',
                      fontSize: 'clamp(20px, 3.2cqi, 44px)',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {data.score}
                  </span>
                  <span
                    className="font-mono text-[#8A6B22]"
                    style={{ fontSize: 'clamp(10px, 1.2cqi, 16px)' }}
                  >
                    /100
                  </span>
                </span>
                <span
                  className="font-mono text-[#5C5044]"
                  style={{ fontSize: 'clamp(9px, 1cqi, 13px)' }}
                >
                  · for passing the {data.quizCategory.toLowerCase()} certification.
                </span>
              </div>
            </div>

            {/* ── RIGHT: Badge + "verified by" label ── */}
            <div className="flex flex-col items-center gap-[8px] shrink-0">
              <div
                style={{
                  width:  'clamp(72px, 11cqi, 150px)',
                  height: 'clamp(72px, 11cqi, 150px)',
                  opacity: animated ? 0 : 1,
                  animation: animated
                    ? 'cert-badge-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 1200ms forwards'
                    : undefined,
                }}
              >
                <CertBadge size="100%" />
              </div>
              <div
                className={`font-mono uppercase tracking-[0.2em] text-[#8A6B22] text-center ${animClass(1400)}`}
                style={{
                  fontSize: 'clamp(7px, 0.7cqi, 9px)',
                  maxWidth: '14ch',
                  lineHeight: 1.4,
                }}
              >
                verified by<br />rrrtx freeverse
              </div>
            </div>
          </div>

          {/* ───── FOOTER — 3 equal columns ───── */}
          <footer
            className={`grid items-end ${animClass(1500)}`}
            style={{
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '5%',
              paddingTop: 'clamp(12px, 1.8cqi, 22px)',
              borderTop: '0.5px solid #D9CFBC',
            }}
          >
            {/* LEFT COL — QR + cert ID */}
            <div className="flex items-end gap-[12px]">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Verify QR"
                  className="shrink-0"
                  style={{
                    width:  'clamp(44px, 6.5cqi, 86px)',
                    height: 'clamp(44px, 6.5cqi, 86px)',
                  }}
                />
              ) : (
                <div
                  className="shrink-0 bg-[#FBF8F3] border border-[#D9CFBC]"
                  style={{
                    width:  'clamp(44px, 6.5cqi, 86px)',
                    height: 'clamp(44px, 6.5cqi, 86px)',
                  }}
                />
              )}
              <div className="flex flex-col" style={{ gap: '3px' }}>
                <div
                  className="font-mono uppercase tracking-[0.18em] text-[#A89B85]"
                  style={{ fontSize: 'clamp(7px, 0.7cqi, 9px)' }}
                >
                  cert id
                </div>
                <div
                  className="font-mono font-semibold text-[#1A1610]"
                  style={{
                    fontSize: 'clamp(9px, 1.05cqi, 13px)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {data.certId}
                </div>
                <div
                  className="font-mono uppercase tracking-[0.18em] text-[#A89B85]"
                  style={{
                    fontSize: 'clamp(7px, 0.7cqi, 9px)',
                    marginTop: '6px',
                  }}
                >
                  verify at
                </div>
                <div
                  className="font-mono text-[#5C5044]"
                  style={{ fontSize: 'clamp(8px, 0.85cqi, 11px)' }}
                >
                  rrrtx-freeverse.app/verify
                </div>
              </div>
            </div>

            {/* CENTER COL — Signature */}
            <div className="flex flex-col items-center justify-end">
              <img
                src="/assets/signature-ahmad.png"
                alt="Muhammad Ahmad signature"
                className="object-contain object-bottom"
                style={{
                  width:  'clamp(110px, 15cqi, 200px)',
                  height: 'clamp(36px, 5.5cqi, 76px)',
                  // Convert dark-on-light PNG to clean black ink for paper
                  filter: 'grayscale(1) brightness(0.4) contrast(2)',
                  mixBlendMode: 'multiply',
                }}
                draggable={false}
              />
              <div
                className="font-mono font-semibold text-[#1A1610] text-center"
                style={{
                  fontSize: 'clamp(9px, 1cqi, 13px)',
                  letterSpacing: '-0.01em',
                  borderTop: '0.5px solid #D9CFBC',
                  paddingTop: '5px',
                  marginTop: '3px',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                }}
              >
                Muhammad Ahmad
              </div>
              <div
                className="font-mono uppercase tracking-[0.18em] text-[#8A6B22] text-center"
                style={{
                  fontSize: 'clamp(7px, 0.7cqi, 9px)',
                  marginTop: '3px',
                }}
              >
                founder · rrrtx freeverse
              </div>
            </div>

            {/* RIGHT COL — Issued date */}
            <div className="flex flex-col items-end justify-end" style={{ gap: '3px' }}>
              <div
                className="font-mono uppercase tracking-[0.18em] text-[#A89B85]"
                style={{ fontSize: 'clamp(7px, 0.7cqi, 9px)' }}
              >
                issued on
              </div>
              <div
                className="font-display font-black text-[#1A1610]"
                style={{
                  fontSize: 'clamp(16px, 2.4cqi, 32px)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1,
                }}
              >
                {formattedDate}
              </div>
              <div
                className="font-mono uppercase tracking-[0.18em] text-[#8A6B22]"
                style={{
                  fontSize: 'clamp(7px, 0.7cqi, 9px)',
                  marginTop: '4px',
                }}
              >
                valid forever
              </div>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}

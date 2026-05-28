/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Terminal OS palette ─────────────────────────────
        // Pure dev-tool aesthetic. Deep blacks, no warm undertones.
        // The green is "terminal cursor green" — fluorescent, alive.
        bg: {
          0:   '#0A0A0A',  // page background
          1:   '#0F0F0F',  // hovered card / elevated
          2:   '#141414',  // borders default
          3:   '#1F1F1F',  // borders strong / divider
          4:   '#2A2A2A',  // input bg / disabled
        },
        fg: {
          0:   '#FFFFFF',  // headlines, highest emphasis
          1:   '#E5E5E5',  // body
          2:   '#B0B0B0',  // secondary body
          3:   '#888888',  // tertiary / muted
          4:   '#666666',  // metadata, labels
          5:   '#444444',  // very low emphasis
        },
        // ── Terminal Green (the single accent) ───────────────
        // Bright, alive, "cursor green" — not corporate emerald.
        // Used for: actions, status, "verified", success.
        term: {
          glow: '#00E676',  // primary — buttons, status, verified ✓
          deep: '#00B050',  // brutalist offset shadow color
          dim:  '#00964A',  // hovered/pressed state
          soft: 'rgba(0, 230, 118, 0.12)',  // subtle backgrounds
          ring: 'rgba(0, 230, 118, 0.4)',   // focus rings
        },
        // ── Semantic (sparingly) ────────────────────────────
        err: { 500: '#FF4D4D' },   // errors, failed, danger
        warn:{ 500: '#FFB020' },   // warnings (violation in secure mode)
      },
      fontFamily: {
        // Three fonts total. Each one with a distinct role.
        // MONO is the workhorse (most text). SANS for headlines.
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans:    ['Satoshi', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        // ALIAS: 'display' uses Satoshi at black weight for headlines
        display: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Display scale — Satoshi black at huge sizes
        'd-2xl': ['8rem',   { lineHeight: '0.9',  letterSpacing: '-0.05em' }],   // 128px
        'd-xl':  ['6rem',   { lineHeight: '0.92', letterSpacing: '-0.045em' }],  // 96px
        'd-lg':  ['4.5rem', { lineHeight: '0.95', letterSpacing: '-0.04em' }],   // 72px
        'd-md':  ['3.5rem', { lineHeight: '1',    letterSpacing: '-0.035em' }],  // 56px
        'd-sm':  ['2.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],   // 40px
        // Body scale
        'lead':  ['1.0625rem',{ lineHeight: '1.7' }],   // 17px - hero subtitles
        // (rest uses Tailwind defaults — base/sm/xs all good in mono)
      },
      letterSpacing: {
        wider: '0.05em',
        widest: '0.15em',
        terminal: '0.2em',  // for UPPERCASE STATUS LINES
      },
      maxWidth: {
        prose:      '42rem',  // 672px — reading content
        app:        '64rem',  // 1024px — quiz player, dashboard
        marketing:  '75rem',  // 1200px — landing sections (wider feel)
      },
      boxShadow: {
        // Brutalist offset shadows (the signature button look)
        'brutal-sm': '3px 3px 0 var(--tw-shadow-color)',
        'brutal':    '4px 4px 0 var(--tw-shadow-color)',
        'brutal-lg': '6px 6px 0 var(--tw-shadow-color)',
        // Subtle UI shadows
        'soft': '0 1px 2px rgba(0, 0, 0, 0.4)',
        // Glow for status indicators
        'glow-term': '0 0 8px rgba(0, 230, 118, 0.6)',
      },
      transitionTimingFunction: {
        'out-expo':  'cubic-bezier(0.16, 1, 0.3, 1)',
        'crisp':     'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        snap: '120ms',
        fast: '180ms',
      },
      keyframes: {
        // Terminal cursor blink
        blink: {
          '0%, 50%':   { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        // Status dot pulse
        'pulse-term': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(0.85)' },
        },
        // Subtle scan-line for "active" feel (rarely used)
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        // Card entry
        'fade-in':    { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        blink:        'blink 1.2s steps(2) infinite',
        'pulse-term': 'pulse-term 2s ease-in-out infinite',
        scanline:     'scanline 8s linear infinite',
        'fade-in':    'fade-in 300ms ease-out both',
        'fade-in-up': 'fade-in-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};

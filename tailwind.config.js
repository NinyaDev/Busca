/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  // Preflight is disabled on purpose: it targets html/body (which don't exist
  // inside the overlay's shadow root) and would also stomp host-page styles.
  // We ship our own scoped reset in `src/core/palette.css` under `.cp-root`.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Surface palette is driven by CSS variables in palette.css so we can
        // theme (and eventually offer light/dark) without recompiling Tailwind.
        cp: {
          bg: 'var(--cp-bg)',
          panel: 'var(--cp-panel)',
          border: 'var(--cp-border)',
          text: 'var(--cp-text)',
          muted: 'var(--cp-muted)',
          accent: 'var(--cp-accent)',
          sel: 'var(--cp-sel)',
        },
      },
    },
  },
  plugins: [],
}

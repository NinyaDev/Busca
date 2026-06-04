import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

// @crxjs handles the MV3 plumbing that normally makes Vite + extensions painful:
// it bundles the service worker as an ES module, compiles content scripts into
// self-contained scripts, wires up HMR, and rewrites the manifest paths on build.
export default defineConfig({
  plugins: [preact(), crx({ manifest })],
  // A fixed port keeps the content-script HMR client stable during `npm run dev`.
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
  build: {
    target: 'esnext',
    // Source maps make debugging the service worker + content script far easier.
    sourcemap: true,
  },
})

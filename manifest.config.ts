import { defineManifest } from '@crxjs/vite-plugin'

// The full permission set the planned feature surface needs. Each is justified
// inline so we can defend it during Chrome Web Store review (broad permissions
// like `history` and `<all_urls>` draw extra scrutiny).
export default defineManifest({
  manifest_version: 3,
  name: 'Command Palette',
  description:
    'A fast, keyboard-first command palette for Chrome. Cmd+T for a new-tab palette, Cmd/Ctrl+K for an overlay on any page.',
  version: '0.1.0',

  // --- Trigger surfaces (the hybrid strategy) ---
  // 1) Cmd+T: we own the New Tab Page, so a new tab *is* the palette.
  chrome_url_overrides: {
    newtab: 'src/newtab/index.html',
  },
  // 2) Cmd/Ctrl+K: a non-reserved shortcut that toggles the in-page overlay.
  //    (Cmd+T itself can NOT be bound here - Chrome reserves it; see README.)
  commands: {
    'toggle-overlay': {
      suggested_key: { default: 'Ctrl+K', mac: 'Command+K' },
      description: 'Toggle the command palette overlay on the current page',
    },
  },

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  // The overlay is injected everywhere; it stays dormant (pre-mounted, hidden)
  // until toggled, so the cost on normal browsing is just one idle listener.
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],

  action: {
    default_title: 'Open Command Palette',
  },

  permissions: [
    'tabs', //          read/switch/duplicate/move open tabs
    'history', //       search visited pages (sensitive - justify in review)
    'bookmarks', //     search bookmarks
    'tabGroups', //     show/respect tab groups in results
    'sessions', //      reopen recently closed tabs
    'storage', //       user settings, custom bangs, the learned-pick log
    'scripting', //     inject the overlay on demand where needed
    'activeTab', //     act on the current tab from the overlay
    'browsingData', //  scoped cache/cookie clears (defaults to last 24h)
    'management', //    toggle other extensions as a quick action
    'favicon', //       render favicons in results via the _favicon endpoint
    'clipboardRead', // clipboard-aware "smart paste" (P1)
    'clipboardWrite', //copy-url / copy-as-markdown / copy-as-curl actions
    'alarms', //        periodic index reconciliation (P1)
  ],

  // Needed to inject the overlay into arbitrary sites and to clear cache/cookies
  // scoped to a given origin. Narrow this later if the feature set allows.
  host_permissions: ['<all_urls>'],
})

// Quick-action metadata. The UI uses this to build searchable items; the service
// worker maps each `id` to an implementation in src/background/exec.ts. Keeping
// the two in sync is just "add an entry here + a case there".

export interface QuickAction {
  id: string
  title: string
  subtitle?: string
  glyph?: string
  /** Extra words to match against (so "delete" finds "Clear cache"). */
  keywords?: string
  /** Destructive actions get a confirm step in the UI. */
  danger?: boolean
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'duplicate-tab', title: 'Duplicate tab', glyph: '⧉', keywords: 'copy clone' },
  {
    id: 'clear-cache-24h',
    title: 'Clear cache (last 24h)',
    subtitle: 'Cached files only - last 24 hours, all sites',
    glyph: '🧹',
    keywords: 'delete browsing data purge',
    danger: true,
  },
  {
    id: 'clear-site-data',
    title: 'Clear cache + cookies for this site',
    subtitle: 'Scoped to the current origin',
    glyph: '🧽',
    keywords: 'cookies storage delete reset login',
    danger: true,
  },
  { id: 'reopen-closed', title: 'Reopen last closed tab', glyph: '↩️', keywords: 'restore undo' },
  { id: 'toggle-mute', title: 'Mute / unmute this tab', glyph: '🔇', keywords: 'audio sound silence' },
  { id: 'open-extensions', title: 'Open chrome://extensions', glyph: '🧩', keywords: 'manage addons' },
  { id: 'open-settings', title: 'Open Chrome settings', glyph: '⚙️', keywords: 'preferences config' },
  { id: 'open-history', title: 'Open history page', glyph: '🕘', keywords: 'visited' },
  { id: 'open-downloads', title: 'Open downloads', glyph: '⬇️', keywords: 'files' },
  { id: 'new-incognito', title: 'New incognito window', glyph: '🕵️', keywords: 'private window' },
]

// Quick-action metadata. The UI uses this to build searchable items; the service
// worker maps each `id` to an implementation in src/background/exec.ts. Keeping
// the two in sync is just "add an entry here + a case there".

export interface QuickAction {
  id: string
  title: string
  subtitle?: string
  /** Line-icon name from src/core/icons.tsx. */
  icon?: string
  /** Extra words to match against (so "delete" finds "Clear cache"). */
  keywords?: string
  /** Destructive actions get a confirm step in the UI. */
  danger?: boolean
}

// Order doubles as the empty-state menu (most useful tools first).
export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'open-history', title: 'Open history', icon: 'clock', keywords: 'visited history pages' },
  { id: 'reopen-closed', title: 'Reopen last closed tab', icon: 'undo', keywords: 'restore undo last page' },
  {
    id: 'clear-site-data',
    title: 'Clear cache + cookies for this site',
    subtitle: 'Scoped to the current origin',
    icon: 'cookie',
    keywords: 'cookies storage delete reset login',
    danger: true,
  },
  {
    id: 'clear-cache-24h',
    title: 'Clear cache (last 24h)',
    subtitle: 'Cached files only - last 24 hours, all sites',
    icon: 'trash',
    keywords: 'delete browsing data purge',
    danger: true,
  },
  { id: 'duplicate-tab', title: 'Duplicate tab', icon: 'copy', keywords: 'copy clone' },
  { id: 'toggle-mute', title: 'Mute / unmute this tab', icon: 'mute', keywords: 'audio sound silence' },
  { id: 'open-downloads', title: 'Open downloads', icon: 'download', keywords: 'files' },
  { id: 'new-incognito', title: 'New incognito window', icon: 'incognito', keywords: 'private window' },
  { id: 'open-extensions', title: 'Open chrome://extensions', icon: 'grid', keywords: 'manage addons' },
  { id: 'open-settings', title: 'Open Chrome settings', icon: 'sliders', keywords: 'preferences config' },
]

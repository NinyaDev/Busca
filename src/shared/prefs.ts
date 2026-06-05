import type { Bang } from './bangs'

// User preferences, persisted in chrome.storage.sync (so they follow the user
// across machines signed into the same Chrome profile). Every surface loads these
// at startup and reacts to changes via onPrefsChanged.
export interface Prefs {
  /** Accent preset id (see ACCENTS). */
  accent: string
  /** Show the Google apps launcher on the new tab. */
  showGoogleApps: boolean
  /** How many most-used sites to show in the empty palette. */
  recentsCount: number
  /** Quick-action ids shown in the empty palette ("the bar"). All stay searchable. */
  emptyTools: string[]
  /** User-defined bangs, merged after the defaults. */
  customBangs: Bang[]
}

export const DEFAULT_PREFS: Prefs = {
  accent: 'lavender',
  showGoogleApps: true,
  recentsCount: 6,
  emptyTools: ['open-history', 'reopen-closed', 'clear-site-data', 'clear-cache-24h'],
  customBangs: [],
}

export interface Accent {
  label: string
  accent: string
  ink: string
  sel: string
}

// Muted, tonal accents (no neon). Each sets the three accent CSS variables.
export const ACCENTS: Record<string, Accent> = {
  lavender: { label: 'Lavender', accent: '#aba0c8', ink: '#c2b9da', sel: 'rgba(171, 160, 200, 0.1)' },
  slate: { label: 'Slate', accent: '#9aa8c4', ink: '#bcc6dc', sel: 'rgba(154, 168, 196, 0.1)' },
  sage: { label: 'Sage', accent: '#9fbca6', ink: '#bcd2c2', sel: 'rgba(159, 188, 166, 0.1)' },
  rose: { label: 'Rose', accent: '#c79fb0', ink: '#dabac6', sel: 'rgba(199, 159, 176, 0.1)' },
  sand: { label: 'Sand', accent: '#c4b59a', ink: '#d8cdb8', sel: 'rgba(196, 181, 154, 0.1)' },
}

/** The accent CSS variables for a preset, as an inline-style string. */
export function accentStyle(id: string): string {
  const a = ACCENTS[id] ?? ACCENTS.lavender
  return `--cp-accent:${a.accent};--cp-accent-ink:${a.ink};--cp-sel:${a.sel}`
}

export async function loadPrefs(): Promise<Prefs> {
  try {
    const got = await chrome.storage.sync.get('prefs')
    return { ...DEFAULT_PREFS, ...((got.prefs as Partial<Prefs>) ?? {}) }
  } catch {
    return DEFAULT_PREFS
  }
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await chrome.storage.sync.set({ prefs })
}

export function onPrefsChanged(cb: (p: Prefs) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.prefs) {
      cb({ ...DEFAULT_PREFS, ...((changes.prefs.newValue as Partial<Prefs>) ?? {}) })
    }
  })
}

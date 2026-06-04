// The single shape every result in the palette takes - a tab, a history entry,
// a bookmark, a bang, or a quick action. The palette fuzzy-matches over a pile
// of these and runs `action` on Enter. It never cares what `kind` something is.

export type ItemKind = 'tab' | 'history' | 'bookmark' | 'bang' | 'action' | 'search'

// Actions are *serializable descriptors* (not functions) because items cross the
// messaging boundary between the service worker and the UI. A single executor in
// the service worker interprets them - see src/background/exec.ts.
export type ActionDescriptor =
  | { type: 'open-url'; url: string; where?: 'current' | 'newtab' }
  | { type: 'switch-tab'; tabId: number; windowId: number }
  | { type: 'quick-action'; actionId: string; args?: Record<string, unknown> }

export interface CommandItem {
  id: string
  kind: ItemKind
  title: string
  subtitle?: string
  /** Favicon / image URL. Falls back to the `iconName` line icon if it fails to load. */
  iconUrl?: string
  /** Name of a line icon from src/core/icons.tsx, shown when there's no favicon. */
  iconName?: string
  badges?: string[]
  /** The text fuzzy search runs against (usually title + url). */
  matchText: string
  /** Provider-supplied base score (source weight × recency). Blended with match quality. */
  baseScore: number
  action: ActionDescriptor
}

// How much each source is trusted before match quality is factored in. Switching
// to an already-open tab is usually what the user wants, so tabs rank highest.
export const SOURCE_WEIGHT: Record<ItemKind, number> = {
  tab: 1.4,
  bookmark: 1.15,
  history: 1.0,
  bang: 1.2,
  action: 1.1,
  search: 0.5,
}

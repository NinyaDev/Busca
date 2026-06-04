import type { CommandItem } from '../shared/types'
import { DEFAULT_BANGS, parseBang, fillBang } from '../shared/bangs'
import { QUICK_ACTIONS } from '../shared/actions'

// Quick actions are static, query-independent items that flow through the normal
// fuzzy pool (type "cache" to find "Clear cache"). Built once.
export function buildActionItems(): CommandItem[] {
  return QUICK_ACTIONS.map((a) => ({
    id: `action:${a.id}`,
    kind: 'action' as const,
    title: a.title,
    subtitle: a.subtitle,
    iconName: a.icon,
    badges: a.danger ? ['danger'] : undefined,
    matchText: `${a.title} ${a.subtitle ?? ''} ${a.keywords ?? ''}`,
    baseScore: 1.1,
    action: { type: 'quick-action', actionId: a.id },
  }))
}

// An explicit bang row, shown at the very top - only when the user deliberately
// starts the query with "/" (e.g. "/y cats"). Bare words never trigger it, so
// typing "youtube" still ranks the real youtube.com match first.
function bangItem(query: string): CommandItem | null {
  if (!query.startsWith('/')) return null
  const parsed = parseBang(query, DEFAULT_BANGS)
  if (!parsed) return null
  return {
    id: `bang:${parsed.bang.token}`,
    kind: 'bang',
    title: `${parsed.bang.label}: ${parsed.query}`,
    subtitle: `Search ${parsed.bang.label}`,
    iconName: 'search',
    matchText: query,
    baseScore: 5,
    action: { type: 'open-url', url: fillBang(parsed.bang, parsed.query), where: 'current' },
  }
}

// The web-search fallback. It lives at the BOTTOM of the list so it's always
// available but never steals the default selection from a real result.
function webSearchItem(query: string): CommandItem {
  return {
    id: 'search:web',
    kind: 'search',
    title: `Search the web for "${query}"`,
    iconName: 'search',
    matchText: query,
    baseScore: 0.05,
    action: {
      type: 'open-url',
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      where: 'current',
    },
  }
}

/**
 * Compose the final result list:
 *   - empty query  -> the quick-action tools (not the whole history)
 *   - with a query -> [explicit bang] [top match] [web search] [rest of matches]
 * The top match is auto-selected, so Enter goes straight to it (omnibox feel).
 */
export function buildResults(
  query: string,
  baseItems: CommandItem[],
  actionItems: CommandItem[],
  searchFn: (items: CommandItem[], q: string) => CommandItem[],
): CommandItem[] {
  const q = query.trim()

  // Empty state: show the tools/quick-actions, not the whole history.
  if (!q) return actionItems

  const matched = searchFn([...baseItems, ...actionItems], q)
  const ordered: CommandItem[] = []

  const bang = bangItem(q)
  if (bang) ordered.push(bang)

  // Top real match first, then web-search as the SECOND option, then the rest.
  if (matched.length > 0) {
    ordered.push(matched[0], webSearchItem(q), ...matched.slice(1))
  } else {
    ordered.push(webSearchItem(q))
  }

  const seen = new Set<string>()
  const out: CommandItem[] = []
  for (const it of ordered) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    out.push(it)
  }
  return out.slice(0, 50)
}

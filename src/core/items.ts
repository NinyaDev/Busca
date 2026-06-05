import type { CommandItem } from '../shared/types'
import type { Prefs } from '../shared/prefs'
import { DEFAULT_BANGS, parseBang, fillBang, type Bang } from '../shared/bangs'
import { QUICK_ACTIONS } from '../shared/actions'

// All quick actions as searchable items. Always available via search; the empty
// state shows only a chosen subset (prefs.emptyTools).
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

// Favicon URL for a site via Chrome's cached _favicon endpoint (works in both the
// new-tab page and the overlay - see the web_accessible_resources entry).
function faviconFor(siteUrl: string): string | undefined {
  try {
    const u = new URL(chrome.runtime.getURL('/_favicon/'))
    u.searchParams.set('pageUrl', new URL(siteUrl).origin)
    u.searchParams.set('size', '32')
    return u.toString()
  } catch {
    return undefined
  }
}

// An explicit bang row, shown at the top - only when the query starts with "/".
function bangItem(query: string, bangs: Bang[]): CommandItem | null {
  if (!query.startsWith('/')) return null
  const parsed = parseBang(query, bangs)
  if (!parsed) return null
  return {
    id: `bang:${parsed.bang.token}`,
    kind: 'bang',
    title: `${parsed.bang.label}: ${parsed.query}`,
    subtitle: `Search ${parsed.bang.label}`,
    iconUrl: faviconFor(parsed.bang.url),
    iconName: 'search',
    matchText: query,
    baseScore: 5,
    action: { type: 'open-url', url: fillBang(parsed.bang, parsed.query), where: 'current' },
  }
}

// The web-search fallback - second when there are real matches, otherwise top.
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

// A direct-navigation row when the query looks like a URL or domain - paste a
// link and hit Enter to go there, like the address bar (no detour via search).
function parseUrl(raw: string): string | null {
  const q = raw.trim()
  if (!q || /\s/.test(q)) return null
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(q)) return q // explicit scheme (http://, etc.)
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(q)) return 'http://' + q
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(q) && /\.[a-z]{2,}([:/]|$)/i.test(q)) {
    return 'https://' + q
  }
  return null
}

function goToItem(url: string): CommandItem {
  let label = url
  try {
    const u = new URL(url)
    label = u.host + (u.pathname === '/' ? '' : u.pathname)
  } catch {
    /* keep the raw string */
  }
  return {
    id: 'go:url',
    kind: 'url',
    title: `Go to ${label}`,
    subtitle: url,
    iconUrl: faviconFor(url),
    iconName: 'globe',
    matchText: url,
    baseScore: 6,
    action: { type: 'open-url', url, where: 'current' },
  }
}

// Bang-picker rows shown while typing the token (before a query). Selecting one
// fills "/token " into the input so you can then type the search.
function bangPickerItems(prefix: string, bangs: Bang[]): CommandItem[] {
  const typed = prefix.slice(1).toLowerCase()
  return bangs
    .filter((b) => typed === '' || b.token.startsWith(typed))
    .map((b) => ({
      id: `pick:${b.token}`,
      kind: 'bang' as const,
      title: `/${b.token}`,
      subtitle: `Search ${b.label}`,
      iconUrl: faviconFor(b.url),
      iconName: 'search',
      matchText: `/${b.token} ${b.label}`,
      baseScore: 1,
      action: { type: 'fill', text: `/${b.token} ` },
    }))
}

/**
 * Compose the final result list:
 *   - empty query      -> most-used sites (prefs.recentsCount) + chosen tools
 *   - "/" prefix       -> a picker of the available bangs (/g /y /w /gh ...)
 *   - looks like a URL -> a "Go to <url>" row at the top (paste a link, hit Enter)
 *   - otherwise        -> [bang] [top match] [web search] [rest of matches]
 * The top row is auto-selected, so Enter goes straight to it (omnibox feel).
 */
export function buildResults(
  query: string,
  baseItems: CommandItem[],
  actionItems: CommandItem[],
  searchFn: (items: CommandItem[], q: string) => CommandItem[],
  prefs: Prefs,
): CommandItem[] {
  const q = query.trim()
  const bangs = [...DEFAULT_BANGS, ...prefs.customBangs]

  // Empty state: most-used sites first, then the chosen tools.
  if (!q) {
    const topSites = baseItems
      .slice()
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, prefs.recentsCount)
    const tools = prefs.emptyTools
      .map((id) => actionItems.find((a) => a.id === `action:${id}`))
      .filter((x): x is CommandItem => Boolean(x))
    const seen = new Set<string>()
    const out: CommandItem[] = []
    for (const it of [...topSites, ...tools]) {
      if (seen.has(it.id)) continue
      seen.add(it.id)
      out.push(it)
    }
    return out
  }

  // Bang picker: while typing the token (a leading "/" with no query yet).
  if (q.startsWith('/')) {
    const token = q.slice(1).split(' ')[0]
    const afterSpace = q.includes(' ') ? q.slice(q.indexOf(' ') + 1).trim() : ''
    if (!q.includes(' ') || afterSpace === '') {
      const picks = bangPickerItems('/' + token, bangs)
      if (picks.length) return picks
    }
  }

  const matched = searchFn([...baseItems, ...actionItems], q)
  const ordered: CommandItem[] = []

  const url = parseUrl(q)
  const bang = bangItem(q, bangs)
  if (url) ordered.push(goToItem(url))
  else if (bang) ordered.push(bang)

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

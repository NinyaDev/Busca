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
function bangPickerItems(prefix: string): CommandItem[] {
  const typed = prefix.slice(1).toLowerCase()
  return DEFAULT_BANGS.filter((b) => typed === '' || b.token.startsWith(typed)).map((b) => ({
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
 *   - empty query      -> most-used sites/tabs first, then a few key tools
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
): CommandItem[] {
  const q = query.trim()

  // Empty state: lead with the most-used sites/tabs, then a few key tools. The
  // full tool list and full history surface as soon as you start typing.
  if (!q) {
    const topSites = baseItems
      .slice()
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, 6)
    const tools = actionItems.slice(0, 4)
    const seen = new Set<string>()
    const out: CommandItem[] = []
    for (const it of [...topSites, ...tools]) {
      if (seen.has(it.id)) continue
      seen.add(it.id)
      out.push(it)
    }
    return out
  }

  // Bang picker: while typing the token (a leading "/" with no query yet), list
  // the available bangs. Picking one fills "/token " into the input.
  if (q.startsWith('/')) {
    const token = q.slice(1).split(' ')[0]
    const afterSpace = q.includes(' ') ? q.slice(q.indexOf(' ') + 1).trim() : ''
    if (!q.includes(' ') || afterSpace === '') {
      const picks = bangPickerItems('/' + token)
      if (picks.length) return picks
    }
  }

  const matched = searchFn([...baseItems, ...actionItems], q)
  const ordered: CommandItem[] = []

  // Direct navigation when the query looks like a URL/domain (paste a link).
  const url = parseUrl(q)
  const bang = bangItem(q)
  if (url) ordered.push(goToItem(url))
  else if (bang) ordered.push(bang)

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

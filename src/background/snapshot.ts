import type { CommandItem } from '../shared/types'
import { SOURCE_WEIGHT } from '../shared/types'

// Builds the base item pool (open tabs + recent history + bookmarks) from the
// Chrome APIs. P0 rebuilds this on each palette open — history.search over a few
// thousand entries is a few tens of ms and runs off the critical path (the
// palette shows its pre-mounted shell instantly, then fills when this arrives).
// P1: cache in the service worker + persist to IndexedDB, refresh incrementally
// via tabs/history/bookmarks events. See README "Roadmap".

const HISTORY_MAX = 2000
const HISTORY_WINDOW_MS = 1000 * 60 * 60 * 24 * 60 // 60 days

function faviconUrl(pageUrl: string): string {
  const u = new URL(chrome.runtime.getURL('/_favicon/'))
  u.searchParams.set('pageUrl', pageUrl)
  u.searchParams.set('size', '32')
  return u.toString()
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url)
    return (u.hostname + u.pathname).replace(/\/$/, '')
  } catch {
    return url
  }
}

// Exponential recency decay (~7-day half-life-ish) used to boost recent history.
function recency(lastVisitTime?: number): number {
  if (!lastVisitTime) return 0
  const ageDays = (Date.now() - lastVisitTime) / 86_400_000
  return Math.exp(-ageDays / 7)
}

function walkBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[], out: CommandItem[], path: string[] = []) {
  for (const node of nodes) {
    if (node.url) {
      out.push({
        id: `bookmark:${node.id}`,
        kind: 'bookmark',
        title: node.title || node.url,
        subtitle: [path.join(' / '), prettyUrl(node.url)].filter(Boolean).join('  ·  '),
        iconUrl: faviconUrl(node.url),
        iconGlyph: '⭐',
        badges: ['Bookmarked'],
        matchText: `${node.title ?? ''} ${node.url} ${path.join(' ')}`,
        baseScore: SOURCE_WEIGHT.bookmark,
        action: { type: 'open-url', url: node.url, where: 'current' },
      })
    }
    if (node.children) walkBookmarks(node.children, out, node.title ? [...path, node.title] : path)
  }
}

// Dedupe by URL, preferring tab > bookmark > history; merge badges so a URL that
// is both open and bookmarked shows both.
function dedupe(items: CommandItem[]): CommandItem[] {
  const priority: Record<string, number> = { tab: 3, bookmark: 2, history: 1 }
  const byUrl = new Map<string, CommandItem>()
  for (const it of items) {
    const url = it.action.type === 'open-url' ? it.action.url : it.action.type === 'switch-tab' ? it.id : it.id
    const existing = byUrl.get(url)
    if (!existing) {
      byUrl.set(url, it)
      continue
    }
    const keep = (priority[it.kind] ?? 0) >= (priority[existing.kind] ?? 0) ? it : existing
    const drop = keep === it ? existing : it
    keep.badges = Array.from(new Set([...(keep.badges ?? []), ...(drop.badges ?? [])]))
    byUrl.set(url, keep)
  }
  return [...byUrl.values()]
}

export async function buildSnapshot(): Promise<CommandItem[]> {
  const items: CommandItem[] = []

  const [tabs, history, tree] = await Promise.all([
    chrome.tabs.query({}),
    chrome.history.search({ text: '', maxResults: HISTORY_MAX, startTime: Date.now() - HISTORY_WINDOW_MS }),
    chrome.bookmarks.getTree(),
  ])

  for (const t of tabs) {
    if (!t.id || !t.url || t.url.startsWith('chrome://newtab')) continue
    items.push({
      id: `tab:${t.id}`,
      kind: 'tab',
      title: t.title || t.url,
      subtitle: prettyUrl(t.url),
      iconUrl: t.favIconUrl || faviconUrl(t.url),
      iconGlyph: '🗂',
      badges: ['Open'],
      matchText: `${t.title ?? ''} ${t.url}`,
      baseScore: SOURCE_WEIGHT.tab + (t.active ? 0.1 : 0),
      action: { type: 'switch-tab', tabId: t.id, windowId: t.windowId },
    })
  }

  for (const h of history) {
    if (!h.url) continue
    items.push({
      id: `history:${h.id ?? h.url}`,
      kind: 'history',
      title: h.title || h.url,
      subtitle: prettyUrl(h.url),
      iconUrl: faviconUrl(h.url),
      iconGlyph: '🕘',
      matchText: `${h.title ?? ''} ${h.url}`,
      baseScore: SOURCE_WEIGHT.history * (0.5 + recency(h.lastVisitTime)),
      action: { type: 'open-url', url: h.url, where: 'current' },
    })
  }

  walkBookmarks(tree, items)

  return dedupe(items)
}

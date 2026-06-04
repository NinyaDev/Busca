// Bangs are just URL templates with a `%s` placeholder. No API, no keys - every
// bang is a plain navigation to a public search page. Users will be able to add
// their own later (same shape, stored in chrome.storage).

export interface Bang {
  token: string
  label: string
  url: string
  glyph?: string
}

export const DEFAULT_BANGS: Bang[] = [
  { token: 'g', label: 'Google', url: 'https://www.google.com/search?q=%s', glyph: '🔍' },
  { token: 'y', label: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s', glyph: '▶️' },
  { token: 'w', label: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s', glyph: '📖' },
  { token: 'gh', label: 'GitHub', url: 'https://github.com/search?q=%s', glyph: '🐙' },
  { token: 'so', label: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=%s', glyph: '💬' },
  { token: 'npm', label: 'npm', url: 'https://www.npmjs.com/search?q=%s', glyph: '📦' },
  { token: 'mdn', label: 'MDN', url: 'https://developer.mozilla.org/en-US/search?q=%s', glyph: '📘' },
  { token: 'ddg', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', glyph: '🦆' },
]

// Supports both "/y query" (explicit) and "y query" (bare) syntaxes. Returns null
// when the leading token isn't a known bang - callers then treat it as plain text.
const BANG_RE = /^\/?([a-z0-9]+)\s+(.+)$/i

export function parseBang(input: string, bangs: Bang[]): { bang: Bang; query: string } | null {
  const m = input.match(BANG_RE)
  if (!m) return null
  const token = m[1].toLowerCase()
  const bang = bangs.find((b) => b.token === token)
  if (!bang) return null
  return { bang, query: m[2].trim() }
}

export function fillBang(bang: Bang, query: string): string {
  return bang.url.replace('%s', encodeURIComponent(query))
}

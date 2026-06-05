// Bangs are just URL templates with a `%s` placeholder. No API, no keys - every
// bang is a plain navigation to a public search page. Users will be able to add
// their own later (same shape, stored in chrome.storage).

export interface Bang {
  token: string
  label: string
  url: string
}

export const DEFAULT_BANGS: Bang[] = [
  { token: 'g', label: 'Google', url: 'https://www.google.com/search?q=%s' },
  { token: 'y', label: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s' },
  { token: 'w', label: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s' },
  { token: 'gh', label: 'GitHub', url: 'https://github.com/search?q=%s' },
  { token: 'so', label: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=%s' },
  { token: 'npm', label: 'npm', url: 'https://www.npmjs.com/search?q=%s' },
  { token: 'mdn', label: 'MDN', url: 'https://developer.mozilla.org/en-US/search?q=%s' },
  { token: 'ddg', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
]

// Matches "<token> <query>"; an optional leading "/" is allowed. Returns null when
// the leading token isn't a known bang, so callers can treat it as plain text.
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

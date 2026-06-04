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
    iconGlyph: a.glyph ?? '⚡',
    badges: a.danger ? ['danger'] : undefined,
    matchText: `${a.title} ${a.subtitle ?? ''} ${a.keywords ?? ''}`,
    baseScore: 1.1,
    action: { type: 'quick-action', actionId: a.id },
  }))
}

// Dynamic items depend on the live query: the matched bang (if any) plus a
// web-search fallback. These are PREPENDED (not fuzzy-filtered) so a bang you
// explicitly typed always sits at the top — bangs never trap the user, they
// just add a row.
export function buildDynamicItems(rawQuery: string): CommandItem[] {
  const q = rawQuery.trim()
  if (!q) return []
  const out: CommandItem[] = []

  const parsed = parseBang(q, DEFAULT_BANGS)
  if (parsed) {
    out.push({
      id: `bang:${parsed.bang.token}`,
      kind: 'bang',
      title: `${parsed.bang.label}: ${parsed.query}`,
      subtitle: `Search ${parsed.bang.label}`,
      iconGlyph: parsed.bang.glyph ?? '⚡',
      matchText: q,
      baseScore: 5,
      action: { type: 'open-url', url: fillBang(parsed.bang, parsed.query), where: 'current' },
    })
  }

  out.push({
    id: 'search:web',
    kind: 'search',
    title: `Search the web for “${q}”`,
    iconGlyph: '🔍',
    matchText: q,
    baseScore: 0.1,
    action: {
      type: 'open-url',
      url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      where: 'current',
    },
  })

  return out
}

/** Compose the final, deduped, ranked result list shown in the palette. */
export function buildResults(
  query: string,
  baseItems: CommandItem[],
  actionItems: CommandItem[],
  searchFn: (items: CommandItem[], q: string) => CommandItem[],
): CommandItem[] {
  const dynamic = buildDynamicItems(query)
  const matched = searchFn([...baseItems, ...actionItems], query)
  const seen = new Set<string>()
  const out: CommandItem[] = []
  for (const it of [...dynamic, ...matched]) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    out.push(it)
  }
  return out.slice(0, 50)
}

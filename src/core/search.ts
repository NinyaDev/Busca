import uFuzzy from '@leeoniya/ufuzzy'
import type { CommandItem } from '../shared/types'

// uFuzzy does the raw matching; we layer our own scoring on top (match quality
// blended with the provider's baseScore). It's tiny, fast, and needs no index
// build, which is what keeps keystroke filtering well under our perf budget.
const uf = new uFuzzy({ intraMode: 1, intraIns: 1, intraSub: 1, intraTrn: 1, intraDel: 1 })

const MAX_RESULTS = 50

/** Fuzzy-filter + rank a pool of items for a query. Empty query => top by baseScore. */
export function searchItems(items: CommandItem[], rawQuery: string): CommandItem[] {
  const query = rawQuery.trim()

  if (!query) {
    return items
      .slice()
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, MAX_RESULTS)
  }

  const haystack = items.map((i) => i.matchText)
  const idxs = uf.filter(haystack, query)
  if (!idxs || idxs.length === 0) return []

  const info = uf.info(idxs, haystack, query)
  const order = uf.sort(info, haystack, query)

  const n = order.length
  const ranked: { item: CommandItem; score: number }[] = new Array(n)
  for (let rank = 0; rank < n; rank++) {
    const infoIdx = order[rank]
    const item = items[info.idx[infoIdx]]
    // uFuzzy `order` is best-first; turn rank into a [0,1] quality (higher = better).
    const matchQuality = 1 - rank / n
    // Soft-normalize baseScore (~0..3) so it nudges rather than dominates.
    const baseBoost = Math.min(item.baseScore, 3) / 3
    ranked[rank] = { item, score: matchQuality * 0.75 + baseBoost * 0.25 }
  }
  ranked.sort((a, b) => b.score - a.score)
  return ranked.slice(0, MAX_RESULTS).map((r) => r.item)
}

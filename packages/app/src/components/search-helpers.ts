import type { FindTextResponses } from "@opencode-ai/sdk/v2/client"

type SearchMatch = FindTextResponses[200][number]

export type GroupedResult = {
  file: string
  matches: SearchMatch[]
}

export type HistoryEntry = {
  query: string
  regex: boolean
  caseSensitive: boolean
}

export function group(matches: SearchMatch[]): GroupedResult[] {
  const map = new Map<string, SearchMatch[]>()
  for (const m of matches) {
    const key = m.path.text
    const arr = map.get(key)
    if (arr) arr.push(m)
    else map.set(key, [m])
  }
  return Array.from(map, ([file, matches]) => ({ file, matches }))
}

export function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function pattern(query: string, regex: boolean): string {
  if (regex) return query
  return escape(query)
}

export function truncate(groups: GroupedResult[], limit: number): { groups: GroupedResult[]; truncated: boolean; total: number } {
  const total = groups.reduce((sum, g) => sum + g.matches.length, 0)
  if (total <= limit) return { groups, truncated: false, total }
  const result: GroupedResult[] = []
  let count = 0
  for (const g of groups) {
    if (count >= limit) break
    const remaining = limit - count
    if (g.matches.length <= remaining) {
      result.push(g)
      count += g.matches.length
    } else {
      result.push({ file: g.file, matches: g.matches.slice(0, remaining) })
      count += remaining
    }
  }
  return { groups: result, truncated: true, total }
}

export function summary(groups: GroupedResult[]): { files: number; matches: number } {
  return {
    files: groups.length,
    matches: groups.reduce((sum, g) => sum + g.matches.length, 0),
  }
}

export function addHistory(history: HistoryEntry[], entry: HistoryEntry, max: number): HistoryEntry[] {
  const filtered = history.filter((h) => h.query !== entry.query)
  return [entry, ...filtered].slice(0, max)
}

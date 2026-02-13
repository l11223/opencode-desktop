import type { ITerminalAddon, ITerminalCore } from "ghostty-web"

export type SearchOptions = {
  caseSensitive: boolean
  regex: boolean
  wholeWord: boolean
}

export type SearchMatch = {
  row: number
  col: number
  length: number
}

export type SearchState = {
  query: string
  options: SearchOptions
  matches: SearchMatch[]
  current: number
}

export function searchLines(lines: string[], query: string, options: SearchOptions): SearchMatch[] {
  if (!query) return []
  if (options.regex) {
    try {
      const flags = options.caseSensitive ? "g" : "gi"
      const pattern = options.wholeWord ? `\\b${query}\\b` : query
      const re = new RegExp(pattern, flags)
      return lines.flatMap((line, row) => {
        const matches: SearchMatch[] = []
        let m: RegExpExecArray | null
        while ((m = re.exec(line)) !== null) {
          matches.push({ row, col: m.index, length: m[0].length })
          if (!m[0].length) re.lastIndex++
        }
        return matches
      })
    } catch {
      return []
    }
  }

  const needle = options.caseSensitive ? query : query.toLowerCase()
  return lines.flatMap((line, row) => {
    const hay = options.caseSensitive ? line : line.toLowerCase()
    const matches: SearchMatch[] = []
    let idx = 0
    while (true) {
      const found = hay.indexOf(needle, idx)
      if (found === -1) break
      if (options.wholeWord) {
        const before = found > 0 ? hay[found - 1] : " "
        const after = found + needle.length < hay.length ? hay[found + needle.length] : " "
        if (/\w/.test(before) || /\w/.test(after)) {
          idx = found + 1
          continue
        }
      }
      matches.push({ row, col: found, length: query.length })
      idx = found + 1
    }
    return matches
  })
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null

function lines(terminal: ITerminalCore): string[] {
  if (!isRecord(terminal)) return []
  const buf = terminal.buffer
  if (!isRecord(buf)) return []
  const active = buf.active
  if (!isRecord(active) || typeof active.length !== "number" || typeof active.getLine !== "function") return []
  const result: string[] = []
  for (let i = 0; i < (active.length as number); i++) {
    const line = (active.getLine as (y: number) => { translateToString(trim?: boolean): string } | undefined)(i)
    result.push(line?.translateToString(false) ?? "")
  }
  return result
}

function scroll(terminal: ITerminalCore, row: number) {
  if (!isRecord(terminal)) return
  const t = terminal as unknown as { scrollToLine?: (line: number) => void }
  t.scrollToLine?.(row)
}

export class SearchAddon implements ITerminalAddon {
  private terminal?: ITerminalCore
  private state: SearchState = { query: "", options: { caseSensitive: false, regex: false, wholeWord: false }, matches: [], current: -1 }

  activate(terminal: ITerminalCore) {
    this.terminal = terminal
  }

  dispose() {
    this.clear()
    this.terminal = undefined
  }

  search(query: string, options: SearchOptions): SearchState {
    if (!query || !this.terminal) {
      this.clear()
      return this.state
    }
    const matches = searchLines(lines(this.terminal), query, options)
    this.state = { query, options, matches, current: matches.length > 0 ? 0 : -1 }
    if (matches.length > 0) scroll(this.terminal, matches[0].row)
    return this.state
  }

  next(): SearchMatch | undefined {
    if (this.state.matches.length === 0) return undefined
    this.state = { ...this.state, current: (this.state.current + 1) % this.state.matches.length }
    const match = this.state.matches[this.state.current]
    if (this.terminal) scroll(this.terminal, match.row)
    return match
  }

  previous(): SearchMatch | undefined {
    const n = this.state.matches.length
    if (n === 0) return undefined
    this.state = { ...this.state, current: (this.state.current - 1 + n) % n }
    const match = this.state.matches[this.state.current]
    if (this.terminal) scroll(this.terminal, match.row)
    return match
  }

  clear() {
    this.state = { query: "", options: { caseSensitive: false, regex: false, wholeWord: false }, matches: [], current: -1 }
  }

  get current(): SearchState {
    return this.state
  }
}

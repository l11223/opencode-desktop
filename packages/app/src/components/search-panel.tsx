import { createSignal, createEffect, onCleanup, Show, For, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { Icon } from "@opencode-ai/ui/icon"
import { Spinner } from "@opencode-ai/ui/spinner"
import { Collapsible } from "@opencode-ai/ui/collapsible"
import { useSDK } from "@/context/sdk"
import { useLanguage } from "@/context/language"
import { Persist, persisted } from "@/utils/persist"
import { group, pattern, truncate, summary, addHistory, type GroupedResult, type HistoryEntry } from "./search-helpers"

const DEBOUNCE = 300
const LIMIT = 1000
const MAX_HISTORY = 20

export function SearchPanel(props: { onOpenFile: (path: string, line: number) => void; onClose?: () => void; ref?: (api: { focus: () => void }) => void }) {
  let input!: HTMLInputElement
  props.ref?.({ focus: () => input?.focus() })
  const sdk = useSDK()
  const language = useLanguage()

  const [query, setQuery] = createSignal("")
  const [regex, setRegex] = createSignal(false)
  const [caseSensitive, setCaseSensitive] = createSignal(false)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string>()
  const [results, setResults] = createSignal<GroupedResult[]>([])
  const [isTruncated, setIsTruncated] = createSignal(false)
  const [collapsed, setCollapsed] = createStore<Record<string, boolean>>({})
  const [historyIdx, setHistoryIdx] = createSignal(-1)

  const [historyStore, setHistoryStore] = persisted(
    Persist.global("search.history.v1"),
    createStore({ entries: [] as HistoryEntry[] }),
  )

  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined


  const search = async (q: string, r: boolean, cs: boolean) => {
    controller?.abort()
    if (!q.trim()) {
      setResults([])
      setIsTruncated(false)
      setError(undefined)
      setLoading(false)
      return
    }

    controller = new AbortController()
    setLoading(true)
    setError(undefined)

    const res = await sdk.client.find.text(
      { pattern: cs ? pattern(q, r) : `(?i)${pattern(q, r)}` },
      { signal: controller.signal },
    ).catch((e: Error) => {
      if (e.name === "AbortError") return undefined
      return e
    })

    if (res === undefined) return
    if (res instanceof Error) {
      setError(res.message)
      setLoading(false)
      return
    }

    const grouped = group(res.data ?? [])
    const cut = truncate(grouped, LIMIT)
    setResults(cut.groups)
    setIsTruncated(cut.truncated)
    setLoading(false)

    setHistoryStore("entries", addHistory(historyStore.entries, { query: q, regex: r, caseSensitive: cs }, MAX_HISTORY))
    setHistoryIdx(-1)
  }

  const debounced = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => search(query(), regex(), caseSensitive()), DEBOUNCE)
  }

  onCleanup(() => {
    if (timer) clearTimeout(timer)
    controller?.abort()
  })

  createEffect(() => {
    regex()
    caseSensitive()
    if (!query().trim()) return
    if (timer) clearTimeout(timer)
    search(query(), regex(), caseSensitive())
  })

  const toggle = (file: string) => {
    setCollapsed(file, !collapsed[file])
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      input.blur()
      return
    }
    const entries = historyStore.entries
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const next = Math.min(historyIdx() + 1, entries.length - 1)
      setHistoryIdx(next)
      if (entries[next]) {
        setQuery(entries[next].query)
        setRegex(entries[next].regex)
        setCaseSensitive(entries[next].caseSensitive)
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = historyIdx() - 1
      if (next < 0) {
        setHistoryIdx(-1)
        setQuery("")
        return
      }
      setHistoryIdx(next)
      if (entries[next]) {
        setQuery(entries[next].query)
        setRegex(entries[next].regex)
        setCaseSensitive(entries[next].caseSensitive)
      }
    }
  }

  const info = () => summary(results())

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center gap-1 px-3 py-2 border-b border-border-base">
        <div class="relative flex-1 flex items-center">
          <Icon name="magnifying-glass" size="small" class="absolute left-1.5 text-text-weak pointer-events-none" />
          <input
            ref={input}
            type="text"
            value={query()}
            onInput={(e) => {
              setQuery(e.currentTarget.value)
              setHistoryIdx(-1)
              debounced()
            }}
            onKeyDown={onKey}
            class="w-full h-7 pl-6 pr-1 rounded-md border border-border-base bg-surface-base text-12-regular text-text-base outline-none placeholder:text-text-weak focus:border-border-active"
            placeholder={language.t("search.placeholder")}
            spellcheck={false}
          />
        </div>
        <button
          type="button"
          class="px-1 h-5 rounded text-11-mono text-text-weak hover:bg-surface-raised-base-hover transition-colors"
          classList={{ "!text-text-base !bg-surface-raised-base-active": regex() }}
          onClick={() => setRegex((v) => !v)}
          aria-label="Regex"
          title="Regular Expression"
        >
          .*
        </button>
        <button
          type="button"
          class="px-1 h-5 rounded text-11-mono text-text-weak hover:bg-surface-raised-base-hover transition-colors"
          classList={{ "!text-text-base !bg-surface-raised-base-active": caseSensitive() }}
          onClick={() => setCaseSensitive((v) => !v)}
          aria-label="Case sensitive"
          title="Case Sensitive"
        >
          Aa
        </button>
        <Show when={props.onClose}>
          <button
            type="button"
            class="px-0.5 h-5 rounded text-text-weak hover:bg-surface-raised-base-hover transition-colors"
            onClick={() => props.onClose?.()}
            aria-label="Close"
            title="Close"
          >
            <Icon name="close" size="small" />
          </button>
        </Show>
      </div>

      <div class="flex-1 overflow-y-auto no-scrollbar">
        <Show when={loading()}>
          <div class="flex items-center justify-center py-4">
            <Spinner />
          </div>
        </Show>

        <Show when={error()}>
          {(err) => (
            <div class="px-3 py-2 text-12-regular text-text-danger">
              {language.t("search.error")}: {err()}
            </div>
          )}
        </Show>

        <Show when={!loading() && !error() && query().trim() && results().length === 0}>
          <div class="flex flex-col items-center justify-center gap-2 py-8">
            <Icon name="magnifying-glass" class="size-8 text-icon-weaker" />
            <span class="text-14-regular text-text-weaker">{language.t("search.noResults")}</span>
          </div>
        </Show>

        <Show when={results().length > 0}>
          <div class="px-3 py-1.5 text-11-regular text-text-weak border-b border-border-base">
            {language.t("search.summary", { files: String(info().files), matches: String(info().matches) })}
          </div>

          <Show when={isTruncated()}>
            <div class="px-3 py-1.5 text-11-regular text-text-warning border-b border-border-base">
              {language.t("search.truncated")}
            </div>
          </Show>

          <For each={results()}>
            {(g) => (
              <Collapsible open={!collapsed[g.file]} onOpenChange={() => toggle(g.file)} variant="ghost" class="w-full">
                <Collapsible.Trigger>
                  <div class="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-raised-base-hover">
                    <span class="text-12-medium text-text-strong truncate">{g.file.split("/").pop()}</span>
                    <span class="text-11-regular text-text-weaker truncate">{g.file}</span>
                    <span class="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-surface-raised-base-hover text-11-medium text-text-strong shrink-0">
                      {g.matches.length}
                    </span>
                  </div>
                </Collapsible.Trigger>
                <Collapsible.Content>
                  <For each={g.matches}>
                    {(m) => (
                      <button
                        type="button"
                        class="w-full text-left px-3 py-0.5 hover:bg-surface-raised-base-hover transition-colors cursor-pointer flex items-baseline gap-2 min-h-[24px]"
                        onClick={() => props.onOpenFile(m.path.text, m.line_number)}
                      >
                        <span class="shrink-0 text-11-mono text-text-weaker w-8 text-right tabular-nums">{m.line_number}</span>
                        <span class="text-12-regular text-text-base truncate">
                          <HighlightLine text={m.lines.text.trimEnd()} submatches={m.submatches} />
                        </span>
                      </button>
                    )}
                  </For>
                </Collapsible.Content>
              </Collapsible>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}

function HighlightLine(props: {
  text: string
  submatches: Array<{ match: { text: string }; start: number; end: number }>
}): JSX.Element {
  const parts = () => {
    const result: Array<{ text: string; highlight: boolean }> = []
    let last = 0
    for (const sub of props.submatches) {
      if (sub.start > last) result.push({ text: props.text.slice(last, sub.start), highlight: false })
      result.push({ text: props.text.slice(sub.start, sub.end), highlight: true })
      last = sub.end
    }
    if (last < props.text.length) result.push({ text: props.text.slice(last), highlight: false })
    return result
  }

  return (
    <For each={parts()}>
      {(p) => (
        <Show when={p.highlight} fallback={<>{p.text}</>}>
          <span class="bg-surface-warning-base text-text-strong">{p.text}</span>
        </Show>
      )}
    </For>
  ) as JSX.Element
}

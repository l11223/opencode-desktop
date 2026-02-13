import { createEffect, createSignal, onCleanup, onMount } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import type { SearchAddon } from "@/addons/search"
import type { SearchOptions, SearchState } from "@/addons/search"

export type TerminalSearchProps = {
  addon: SearchAddon
  onClose: () => void
  selection?: string
}

export function TerminalSearch(props: TerminalSearchProps) {
  let input!: HTMLInputElement
  const [query, setQuery] = createSignal(props.selection ?? "")
  const [options, setOptions] = createSignal<SearchOptions>({
    caseSensitive: false,
    regex: false,
    wholeWord: false,
  })
  const [state, setState] = createSignal<SearchState>({
    query: "",
    options: { caseSensitive: false, regex: false, wholeWord: false },
    matches: [],
    current: -1,
  })
  let timer: ReturnType<typeof setTimeout> | undefined

  const run = () => {
    const q = query()
    const result = q ? props.addon.search(q, options()) : (props.addon.clear(), props.addon.current)
    setState(result)
  }

  const debounced = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, 150)
  }

  onCleanup(() => {
    if (timer) clearTimeout(timer)
  })

  createEffect(() => {
    options()
    run()
  })

  onMount(() => {
    input.focus()
    if (props.selection) {
      input.select()
      run()
    }
  })

  const next = () => {
    if (state().matches.length === 0) return
    props.addon.next()
    setState({ ...props.addon.current })
  }

  const previous = () => {
    if (state().matches.length === 0) return
    props.addon.previous()
    setState({ ...props.addon.current })
  }

  const toggle = (key: keyof SearchOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const count = () => {
    const s = state()
    if (s.matches.length === 0) return "0/0"
    return `${s.current + 1}/${s.matches.length}`
  }

  const disabled = () => state().matches.length === 0

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      props.onClose()
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      if (e.shiftKey) previous()
      else next()
    }
  }

  return (
    <div
      class="absolute top-2 right-4 z-20 flex items-center gap-1 px-2 py-1 rounded-md border border-border-base bg-surface-panel shadow-md"
      onKeyDown={onKeyDown}
    >
      <div class="relative flex items-center">
        <Icon name="magnifying-glass" size="small" class="absolute left-1.5 text-text-weak pointer-events-none" />
        <input
          ref={input}
          type="text"
          value={query()}
          onInput={(e) => {
            setQuery(e.currentTarget.value)
            debounced()
          }}
          class="w-40 h-6 pl-6 pr-1 text-12-regular bg-transparent text-text-base outline-none placeholder:text-text-weak"
          placeholder="Search..."
          spellcheck={false}
        />
      </div>
      <span class="text-11-regular text-text-weak min-w-[36px] text-center select-none tabular-nums">
        {count()}
      </span>
      <IconButton
        icon="chevron-down"
        size="small"
        variant="ghost"
        onClick={previous}
        disabled={disabled()}
        aria-label="Previous match"
        class="rotate-180"
      />
      <IconButton
        icon="chevron-down"
        size="small"
        variant="ghost"
        onClick={next}
        disabled={disabled()}
        aria-label="Next match"
      />
      <div class="w-px h-4 bg-border-base" />
      <button
        type="button"
        class="px-1 h-5 rounded text-11-mono text-text-weak hover:bg-surface-raised-base-hover transition-colors"
        classList={{ "!text-text-base !bg-surface-raised-base-active": options().caseSensitive }}
        onClick={() => toggle("caseSensitive")}
        aria-label="Case sensitive"
        title="Case Sensitive"
      >
        Aa
      </button>
      <button
        type="button"
        class="px-1 h-5 rounded text-11-mono text-text-weak hover:bg-surface-raised-base-hover transition-colors"
        classList={{ "!text-text-base !bg-surface-raised-base-active": options().regex }}
        onClick={() => toggle("regex")}
        aria-label="Regex"
        title="Regular Expression"
      >
        .*
      </button>
      <button
        type="button"
        class="px-1 h-5 rounded text-11-mono text-text-weak hover:bg-surface-raised-base-hover transition-colors"
        classList={{ "!text-text-base !bg-surface-raised-base-active": options().wholeWord }}
        onClick={() => toggle("wholeWord")}
        aria-label="Whole word"
        title="Whole Word"
      >
        ab
      </button>
      <div class="w-px h-4 bg-border-base" />
      <IconButton
        icon="close-small"
        size="small"
        variant="ghost"
        onClick={props.onClose}
        aria-label="Close search"
      />
    </div>
  )
}

import type { Ghostty, Terminal as Term, FitAddon } from "ghostty-web"
import { ComponentProps, createEffect, createSignal, onCleanup, onMount, Show, splitProps } from "solid-js"
import { usePlatform } from "@/context/platform"
import { useSDK } from "@/context/sdk"
import { monoFontFamily, useSettings } from "@/context/settings"
import { parseKeybind, matchKeybind } from "@/context/command"
import { SerializeAddon } from "@/addons/serialize"
import { SearchAddon } from "@/addons/search"
import { LocalPTY } from "@/context/terminal"
import { TerminalSearch } from "@/components/terminal-search"
import { resolveThemeVariant, useTheme, withAlpha, type HexColor, type ThemeVariant } from "@opencode-ai/ui/theme"
import { useLanguage } from "@/context/language"
import { showToast } from "@opencode-ai/ui/toast"
import { disposeIfDisposable, getHoveredLinkText, setOptionIfSupported } from "@/utils/runtime-adapters"

const TOGGLE_TERMINAL_ID = "terminal.toggle"
const DEFAULT_TOGGLE_TERMINAL_KEYBIND = "ctrl+`"
const RECONNECT_INITIAL_DELAY = 1000
const RECONNECT_MAX_DELAY = 16000
const RECONNECT_MAX_RETRIES = 5

const sockets = new Map<string, WebSocket>()

export function sendToTerminal(id: string, data: string) {
  const ws = sockets.get(id)
  if (ws?.readyState === WebSocket.OPEN) ws.send(data)
}

export const backoff = (attempt: number) =>
  Math.min(RECONNECT_INITIAL_DELAY * 2 ** (attempt - 1), RECONNECT_MAX_DELAY)
export interface TerminalProps extends ComponentProps<"div"> {
  pty: LocalPTY
  onSubmit?: () => void
  onCleanup?: (pty: LocalPTY) => void
  onConnect?: () => void
  onConnectError?: (error: unknown) => void
}

let shared: Promise<{ mod: typeof import("ghostty-web"); ghostty: Ghostty }> | undefined

const loadGhostty = () => {
  if (shared) return shared
  shared = import("ghostty-web")
    .then(async (mod) => ({ mod, ghostty: await mod.Ghostty.load() }))
    .catch((err) => {
      shared = undefined
      throw err
    })
  return shared
}

type TerminalColors = {
  background: string
  foreground: string
  cursor: string
  selectionBackground: string
}

export const DEFAULT_TERMINAL_COLORS: Record<"light" | "dark", TerminalColors> = {
  light: {
    background: "#fcfcfc",
    foreground: "#211e1e",
    cursor: "#211e1e",
    selectionBackground: withAlpha("#211e1e", 0.2),
  },
  dark: {
    background: "#191515",
    foreground: "#d4d4d4",
    cursor: "#d4d4d4",
    selectionBackground: withAlpha("#d4d4d4", 0.25),
  },
}

export const deriveTerminalColors = (mode: "light" | "dark", theme?: { light: unknown; dark: unknown }): TerminalColors => {
  const fallback = DEFAULT_TERMINAL_COLORS[mode]
  if (!theme) return fallback
  const variant = mode === "dark" ? theme.dark : theme.light
  if (!variant || typeof variant !== "object" || !("seeds" in variant)) return fallback
  const resolved = resolveThemeVariant(variant as ThemeVariant, mode === "dark")
  const text = resolved["text-strong"] ?? fallback.foreground
  const background = resolved["background-stronger"] ?? fallback.background
  const alpha = mode === "dark" ? 0.25 : 0.2
  const base = text.startsWith("#") ? (text as HexColor) : (fallback.foreground as HexColor)
  return {
    background,
    foreground: text,
    cursor: text,
    selectionBackground: withAlpha(base, alpha),
  }
}

export const Terminal = (props: TerminalProps) => {
  const platform = usePlatform()
  const sdk = useSDK()
  const settings = useSettings()
  const theme = useTheme()
  const language = useLanguage()
  let container!: HTMLDivElement
  const [local, others] = splitProps(props, ["pty", "class", "classList", "onConnect", "onConnectError"])
  let ws: WebSocket | undefined
  let term: Term | undefined
  let ghostty: Ghostty
  let serializeAddon: SerializeAddon
  let searchAddon: SearchAddon
  let fitAddon: FitAddon
  let handleResize: () => void
  let handleTextareaFocus: () => void
  let handleTextareaBlur: () => void
  let disposed = false
  const cleanups: VoidFunction[] = []
  const wsCleanups: VoidFunction[] = []
  const start =
    typeof local.pty.cursor === "number" && Number.isSafeInteger(local.pty.cursor) ? local.pty.cursor : undefined
  let cursor = start ?? 0
  let retries = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  const [error, setError] = createSignal<string | null>(null)
  const [searching, setSearching] = createSignal(false)

  const cleanup = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }
    wsCleanup()
    if (!cleanups.length) return
    const fns = cleanups.splice(0).reverse()
    for (const fn of fns) {
      try {
        fn()
      } catch {
        // ignore
      }
    }
  }

  const wsCleanup = () => {
    if (!wsCleanups.length) return
    const fns = wsCleanups.splice(0).reverse()
    for (const fn of fns) {
      try {
        fn()
      } catch {
        // ignore
      }
    }
  }

  const getTerminalColors = (): TerminalColors => {
    const mode = theme.mode() === "dark" ? "dark" : "light"
    return deriveTerminalColors(mode, theme.themes()[theme.themeId()])
  }

  const [terminalColors, setTerminalColors] = createSignal<TerminalColors>(getTerminalColors())

  createEffect(() => {
    const colors = getTerminalColors()
    setTerminalColors(colors)
    if (!term) return
    setOptionIfSupported(term, "theme", colors)
  })

  createEffect(() => {
    const font = monoFontFamily(settings.appearance.font())
    if (!term) return
    setOptionIfSupported(term, "fontFamily", font)
  })

  const focusTerminal = () => {
    const t = term
    if (!t) return
    t.focus()
    t.textarea?.focus()
    setTimeout(() => t.textarea?.focus(), 0)
  }
  const handlePointerDown = () => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && activeElement !== container && !container.contains(activeElement)) {
      activeElement.blur()
    }
    focusTerminal()
  }

  const handleLinkClick = (event: MouseEvent) => {
    if (!event.shiftKey && !event.ctrlKey && !event.metaKey) return
    if (event.altKey) return
    if (event.button !== 0) return

    const t = term
    if (!t) return

    const text = getHoveredLinkText(t)
    if (!text) return

    event.preventDefault()
    event.stopImmediatePropagation()
    platform.openLink(text)
  }

  const connect = (t: Term) => {
    wsCleanup()
    const once = { value: false }

    const url = new URL(sdk.url + `/pty/${local.pty.id}/connect`)
    url.searchParams.set("directory", sdk.directory)
    url.searchParams.set("cursor", String(start !== undefined ? start : local.pty.buffer ? -1 : 0))
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    if (window.__OPENCODE__?.serverPassword) {
      url.username = "opencode"
      url.password = window.__OPENCODE__?.serverPassword
    }
    const socket = new WebSocket(url)
    socket.binaryType = "arraybuffer"
    wsCleanups.push(() => {
      if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) socket.close()
      sockets.delete(local.pty.id)
    })
    ws = socket
    sockets.set(local.pty.id, socket)

    const handleOpen = () => {
      retries = 0
      setError(null)
      local.onConnect?.()
      sdk.client.pty
        .update({
          ptyID: local.pty.id,
          size: {
            cols: t.cols,
            rows: t.rows,
          },
        })
        .catch(() => {})
    }
    socket.addEventListener("open", handleOpen)
    wsCleanups.push(() => socket.removeEventListener("open", handleOpen))

    const decoder = new TextDecoder()

    const handleMessage = (event: MessageEvent) => {
      if (disposed) return
      if (event.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(event.data)
        if (bytes[0] !== 0) return
        const json = decoder.decode(bytes.subarray(1))
        try {
          const meta = JSON.parse(json) as { cursor?: unknown }
          const next = meta?.cursor
          if (typeof next === "number" && Number.isSafeInteger(next) && next >= 0) {
            cursor = next
          }
        } catch {
          // ignore
        }
        return
      }

      const data = typeof event.data === "string" ? event.data : ""
      if (!data) return
      t.write(data)
      cursor += data.length
    }
    socket.addEventListener("message", handleMessage)
    wsCleanups.push(() => socket.removeEventListener("message", handleMessage))

    const onData = t.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data)
      }
    })
    wsCleanups.push(() => disposeIfDisposable(onData))

    const onResize = t.onResize(async (size) => {
      if (socket.readyState === WebSocket.OPEN) {
        await sdk.client.pty
          .update({
            ptyID: local.pty.id,
            size: {
              cols: size.cols,
              rows: size.rows,
            },
          })
          .catch(() => {})
      }
    })
    wsCleanups.push(() => disposeIfDisposable(onResize))

    const reconnect = () => {
      if (disposed) return
      if (retries >= RECONNECT_MAX_RETRIES) {
        setError(language.t("terminal.reconnectFailed", { max: RECONNECT_MAX_RETRIES }))
        local.onConnectError?.(new Error(`WebSocket reconnect failed after ${RECONNECT_MAX_RETRIES} attempts`))
        return
      }
      retries++
      const delay = backoff(retries)
      setError(language.t("terminal.reconnecting", { attempt: retries, max: RECONNECT_MAX_RETRIES }))
      reconnectTimer = setTimeout(() => {
        if (disposed) return
        connect(t)
      }, delay)
    }

    const handleError = (err: Event) => {
      if (disposed) return
      if (once.value) return
      once.value = true
      console.error("WebSocket error:", err)
    }
    socket.addEventListener("error", handleError)
    wsCleanups.push(() => socket.removeEventListener("error", handleError))

    const handleClose = (event: CloseEvent) => {
      if (disposed) return
      // Normal closure (code 1000) means PTY process exited - server event handles cleanup
      if (event.code === 1000) return
      reconnect()
    }
    socket.addEventListener("close", handleClose)
    wsCleanups.push(() => socket.removeEventListener("close", handleClose))
  }

  const retry = () => {
    retries = 0
    setError(null)
    if (term) connect(term)
  }

  onMount(() => {
    const run = async () => {
      const loaded = await loadGhostty()
      if (disposed) return

      const mod = loaded.mod
      const g = loaded.ghostty

      const restore = typeof local.pty.buffer === "string" ? local.pty.buffer : ""
      const restoreSize =
        restore &&
        typeof local.pty.cols === "number" &&
        Number.isSafeInteger(local.pty.cols) &&
        local.pty.cols > 0 &&
        typeof local.pty.rows === "number" &&
        Number.isSafeInteger(local.pty.rows) &&
        local.pty.rows > 0
          ? { cols: local.pty.cols, rows: local.pty.rows }
          : undefined

      const t = new mod.Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        cols: restoreSize?.cols,
        rows: restoreSize?.rows,
        fontSize: 14,
        fontFamily: monoFontFamily(settings.appearance.font()),
        allowTransparency: false,
        convertEol: true,
        theme: terminalColors(),
        scrollback: 10_000,
        ghostty: g,
      })
      cleanups.push(() => t.dispose())
      if (disposed) {
        cleanup()
        return
      }
      ghostty = g
      term = t

      const handleCopy = (event: ClipboardEvent) => {
        const selection = t.getSelection()
        if (!selection) return

        const clipboard = event.clipboardData
        if (!clipboard) return

        event.preventDefault()
        clipboard.setData("text/plain", selection)
      }

      const handlePaste = (event: ClipboardEvent) => {
        const clipboard = event.clipboardData
        const text = clipboard?.getData("text/plain") ?? clipboard?.getData("text") ?? ""
        if (!text) return

        event.preventDefault()
        event.stopPropagation()
        t.paste(text)
      }

      t.attachCustomKeyEventHandler((event) => {
        const key = event.key.toLowerCase()

        // intercept Cmd+F / Ctrl+F to open search bar
        if (key === "f" && (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.type === "keydown") {
          setSearching(true)
          return false
        }

        if (event.ctrlKey && event.shiftKey && !event.metaKey && key === "c") {
          document.execCommand("copy")
          return true
        }

        // let Ctrl+Tab / Ctrl+Shift+Tab bubble to the global command handler
        if (event.ctrlKey && key === "tab") return false

        // allow for toggle terminal keybinds in parent
        const config = settings.keybinds.get(TOGGLE_TERMINAL_ID) ?? DEFAULT_TOGGLE_TERMINAL_KEYBIND
        const keybinds = parseKeybind(config)

        return matchKeybind(keybinds, event)
      })

      container.addEventListener("copy", handleCopy, true)
      cleanups.push(() => container.removeEventListener("copy", handleCopy, true))

      container.addEventListener("paste", handlePaste, true)
      cleanups.push(() => container.removeEventListener("paste", handlePaste, true))

      const fit = new mod.FitAddon()
      const serializer = new SerializeAddon()
      const search = new SearchAddon()
      cleanups.push(() => disposeIfDisposable(fit))
      t.loadAddon(serializer)
      t.loadAddon(fit)
      t.loadAddon(search)
      fitAddon = fit
      serializeAddon = serializer
      searchAddon = search

      t.open(container)

      container.addEventListener("pointerdown", handlePointerDown)
      cleanups.push(() => container.removeEventListener("pointerdown", handlePointerDown))

      container.addEventListener("click", handleLinkClick, { capture: true })
      cleanups.push(() => container.removeEventListener("click", handleLinkClick, { capture: true }))

      handleTextareaFocus = () => {
        t.options.cursorBlink = true
      }
      handleTextareaBlur = () => {
        t.options.cursorBlink = false
      }

      t.textarea?.addEventListener("focus", handleTextareaFocus)
      t.textarea?.addEventListener("blur", handleTextareaBlur)
      cleanups.push(() => t.textarea?.removeEventListener("focus", handleTextareaFocus))
      cleanups.push(() => t.textarea?.removeEventListener("blur", handleTextareaBlur))

      focusTerminal()

      const startResize = () => {
        fit.observeResize()
        handleResize = () => fit.fit()
        window.addEventListener("resize", handleResize)
        cleanups.push(() => window.removeEventListener("resize", handleResize))
      }

      if (restore && restoreSize) {
        t.write(restore, () => {
          fit.fit()
          if (typeof local.pty.scrollY === "number") t.scrollToLine(local.pty.scrollY)
          startResize()
        })
      } else {
        fit.fit()
        if (restore) {
          t.write(restore, () => {
            if (typeof local.pty.scrollY === "number") t.scrollToLine(local.pty.scrollY)
          })
        }
        startResize()
      }

      const onKey = t.onKey((key) => {
        if (key.key == "Enter") {
          props.onSubmit?.()
        }
      })
      cleanups.push(() => disposeIfDisposable(onKey))

      connect(t)
    }

    void run().catch((err) => {
      if (disposed) return
      setError(err instanceof Error ? err.message : language.t("terminal.connectionLost.description"))
      local.onConnectError?.(err)
    })
  })

  onCleanup(() => {
    disposed = true
    const t = term
    if (serializeAddon && props.onCleanup && t) {
      const buffer = (() => {
        try {
          return serializeAddon.serialize()
        } catch {
          return ""
        }
      })()
      props.onCleanup({
        ...local.pty,
        buffer,
        cursor,
        rows: t.rows,
        cols: t.cols,
        scrollY: t.getViewportY(),
      })
    }

    cleanup()
  })

  const closeSearch = () => {
    setSearching(false)
    searchAddon?.clear()
    focusTerminal()
  }

  return (
    <div class="relative size-full" style={{ "background-color": terminalColors().background }}>
      <Show when={searching()}>
        <TerminalSearch
          addon={searchAddon}
          onClose={closeSearch}
          selection={term?.getSelection() || undefined}
        />
      </Show>
      <div
        ref={container}
        data-component="terminal"
        data-prevent-autofocus
        tabIndex={-1}
        classList={{
          ...(local.classList ?? {}),
          "select-text": true,
          "size-full px-6 py-3 font-mono": true,
          [local.class ?? ""]: !!local.class,
        }}
        {...others}
      />
      <Show when={error()}>
        {(msg) => (
          <div class="absolute inset-0 flex items-center justify-center bg-background-base/80 z-10 animate-fade-in">
            <div class="flex flex-col items-center gap-3 px-6 py-5 rounded-card bg-surface-raised-base shadow-panel">
              <p class="text-14-regular text-text-weak text-center">{msg()}</p>
              <Show when={retries >= RECONNECT_MAX_RETRIES}>
                <button
                  class="px-3 py-1.5 rounded-interactive bg-button-secondary-base text-14-regular text-text-base shadow-interactive hover:bg-button-secondary-hover cursor-pointer"
                  onClick={retry}
                >
                  {language.t("terminal.retry")}
                </button>
              </Show>
            </div>
          </div>
        )}
      </Show>
    </div>
  )
}

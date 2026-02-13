import { createStore, produce } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { batch, createEffect, createMemo, createRoot, onCleanup } from "solid-js"
import { useParams } from "@solidjs/router"
import { useSDK } from "./sdk"
import type { Platform } from "./platform"
import { Persist, persisted, removePersisted } from "@/utils/persist"
import { type LayoutNode, type SplitDirection, split as splitLayout, remove as removeLayout, resize as resizeLayout, focus as focusLayout, panes as layoutPanes } from "@/components/terminal-layout"

export type LocalPTY = {
  id: string
  title: string
  titleNumber: number
  rows?: number
  cols?: number
  buffer?: string
  scrollY?: number
  cursor?: number
}

const WORKSPACE_KEY = "__workspace__"
const MAX_TERMINAL_SESSIONS = 20

export function getWorkspaceTerminalCacheKey(dir: string) {
  return `${dir}:${WORKSPACE_KEY}`
}

export function getLegacyTerminalStorageKeys(dir: string, legacySessionID?: string) {
  if (!legacySessionID) return [`${dir}/terminal.v1`]
  return [`${dir}/terminal/${legacySessionID}.v1`, `${dir}/terminal.v1`]
}

type TerminalSession = ReturnType<typeof createWorkspaceTerminalSession>

type TerminalCacheEntry = {
  value: TerminalSession
  dispose: VoidFunction
}

const caches = new Set<Map<string, TerminalCacheEntry>>()

export function clearWorkspaceTerminals(dir: string, sessionIDs?: string[], platform?: Platform) {
  const key = getWorkspaceTerminalCacheKey(dir)
  for (const cache of caches) {
    const entry = cache.get(key)
    entry?.value.clear()
  }

  removePersisted(Persist.workspace(dir, "terminal"), platform)

  const legacy = new Set(getLegacyTerminalStorageKeys(dir))
  for (const id of sessionIDs ?? []) {
    for (const key of getLegacyTerminalStorageKeys(dir, id)) {
      legacy.add(key)
    }
  }
  for (const key of legacy) {
    removePersisted({ key }, platform)
  }
}

function createWorkspaceTerminalSession(sdk: ReturnType<typeof useSDK>, dir: string, legacySessionID?: string) {
  const legacy = getLegacyTerminalStorageKeys(dir, legacySessionID)

  const numberFromTitle = (title: string) => {
    const match = title.match(/^Terminal (\d+)$/)
    if (!match) return
    const value = Number(match[1])
    if (!Number.isFinite(value) || value <= 0) return
    return value
  }

  const [store, setStore, _, ready] = persisted(
    Persist.workspace(dir, "terminal", legacy),
    createStore<{
      active?: string
      all: LocalPTY[]
      layouts: Record<string, { layout?: LayoutNode; focused?: string }>
    }>({
      all: [],
      layouts: {},
    }),
  )

  const unsub = sdk.event.on("pty.exited", (event: { properties: { id: string } }) => {
    const id = event.properties.id
    if (!store.all.some((x) => x.id === id)) return
    batch(() => {
      setStore(
        "all",
        store.all.filter((x) => x.id !== id),
      )
      if (store.active === id) {
        const remaining = store.all.filter((x) => x.id !== id)
        setStore("active", remaining[0]?.id)
      }
    })
  })
  onCleanup(unsub)

  const meta = { migrated: false }

  createEffect(() => {
    if (!ready()) return
    if (meta.migrated) return
    meta.migrated = true

    setStore("all", (all) => {
      const next = all.map((pty) => {
        const direct = Number.isFinite(pty.titleNumber) && pty.titleNumber > 0 ? pty.titleNumber : undefined
        if (direct !== undefined) return pty
        const parsed = numberFromTitle(pty.title)
        if (parsed === undefined) return pty
        return { ...pty, titleNumber: parsed }
      })
      if (next.every((pty, index) => pty === all[index])) return all
      return next
    })
  })

  return {
    ready,
    all: createMemo(() => Object.values(store.all)),
    active: createMemo(() => store.active),
    clear() {
      batch(() => {
        setStore("active", undefined)
        setStore("all", [])
      })
    },
    new(opts?: { cwd?: string }) {
      const existingTitleNumbers = new Set(
        store.all.flatMap((pty) => {
          const direct = Number.isFinite(pty.titleNumber) && pty.titleNumber > 0 ? pty.titleNumber : undefined
          if (direct !== undefined) return [direct]
          const parsed = numberFromTitle(pty.title)
          if (parsed === undefined) return []
          return [parsed]
        }),
      )

      const nextNumber =
        Array.from({ length: existingTitleNumbers.size + 1 }, (_, index) => index + 1).find(
          (number) => !existingTitleNumbers.has(number),
        ) ?? 1

      sdk.client.pty
        .create({ title: `Terminal ${nextNumber}`, cwd: opts?.cwd })
        .then((pty: { data?: { id?: string; title?: string } }) => {
          const id = pty.data?.id
          if (!id) return
          const newTerminal = {
            id,
            title: pty.data?.title ?? "Terminal",
            titleNumber: nextNumber,
          }
          setStore("all", (all) => {
            const newAll = [...all, newTerminal]
            return newAll
          })
          setStore("active", id)
        })
        .catch((error: unknown) => {
          console.error("Failed to create terminal", error)
        })
    },
    update(pty: Partial<LocalPTY> & { id: string }) {
      const index = store.all.findIndex((x) => x.id === pty.id)
      if (index !== -1) {
        setStore("all", index, (existing) => ({ ...existing, ...pty }))
      }
      sdk.client.pty
        .update({
          ptyID: pty.id,
          title: pty.title,
          size: pty.cols && pty.rows ? { rows: pty.rows, cols: pty.cols } : undefined,
        })
        .catch((error: unknown) => {
          console.error("Failed to update terminal", error)
        })
    },
    async clone(id: string) {
      const index = store.all.findIndex((x) => x.id === id)
      const pty = store.all[index]
      if (!pty) return
      const clone = await sdk.client.pty
        .create({
          title: pty.title,
        })
        .catch((error: unknown) => {
          console.error("Failed to clone terminal", error)
          return undefined
        })
      if (!clone?.data) return

      const active = store.active === pty.id

      batch(() => {
        setStore("all", index, {
          id: clone.data.id,
          title: clone.data.title ?? pty.title,
          titleNumber: pty.titleNumber,
          // New PTY process, so start clean.
          buffer: undefined,
          cursor: undefined,
          scrollY: undefined,
          rows: undefined,
          cols: undefined,
        })
        if (active) {
          setStore("active", clone.data.id)
        }
      })
    },
    open(id: string) {
      setStore("active", id)
    },
    next() {
      const index = store.all.findIndex((x) => x.id === store.active)
      if (index === -1) return
      const nextIndex = (index + 1) % store.all.length
      setStore("active", store.all[nextIndex]?.id)
    },
    previous() {
      const index = store.all.findIndex((x) => x.id === store.active)
      if (index === -1) return
      const prevIndex = index === 0 ? store.all.length - 1 : index - 1
      setStore("active", store.all[prevIndex]?.id)
    },
    async close(id: string) {
      batch(() => {
        const filtered = store.all.filter((x) => x.id !== id)
        if (store.active === id) {
          const index = store.all.findIndex((f) => f.id === id)
          const next = index > 0 ? index - 1 : 0
          setStore("active", filtered[next]?.id)
        }
        setStore("all", filtered)
      })

      await sdk.client.pty.remove({ ptyID: id }).catch((error: unknown) => {
        console.error("Failed to close terminal", error)
      })
    },
    move(id: string, to: number) {
      const index = store.all.findIndex((f) => f.id === id)
      if (index === -1) return
      setStore(
        "all",
        produce((all) => {
          all.splice(to, 0, all.splice(index, 1)[0])
        }),
      )
    },
    getLayout() {
      const id = store.active
      if (!id) return undefined
      return store.layouts[id]
    },
    async split(id: string, direction: SplitDirection) {
      const active = store.active
      if (!active) return

      const existing = store.layouts[active]
      const layout = existing?.layout ?? { type: "pane" as const, id, focused: true }

      const existingNumbers = new Set(
        store.all.flatMap((pty) => {
          const direct = Number.isFinite(pty.titleNumber) && pty.titleNumber > 0 ? pty.titleNumber : undefined
          if (direct !== undefined) return [direct]
          const parsed = numberFromTitle(pty.title)
          if (parsed === undefined) return []
          return [parsed]
        }),
      )
      const next = Array.from({ length: existingNumbers.size + 1 }, (_, i) => i + 1).find(
        (n) => !existingNumbers.has(n),
      ) ?? 1

      const pty = await sdk.client.pty
        .create({ title: `Terminal ${next}` })
        .catch((error: unknown) => {
          console.error("Failed to create terminal for split", error)
          return undefined
        })
      if (!pty?.data?.id) return

      const newId = pty.data.id
      batch(() => {
        setStore("all", (all) => [...all, { id: newId, title: pty.data?.title ?? "Terminal", titleNumber: next }])
        setStore("layouts", active, {
          layout: splitLayout(layout, id, direction, newId),
          focused: newId,
        })
      })
    },
    async removeSplit(id: string) {
      const active = store.active
      if (!active) return

      const existing = store.layouts[active]
      if (!existing?.layout) return

      const result = removeLayout(existing.layout, id)
      if (!result) {
        // Last pane removed — close the tab
        batch(() => {
          const filtered = store.all.filter((x) => x.id !== id)
          if (store.active === active) {
            const index = store.all.findIndex((f) => f.id === active)
            const n = index > 0 ? index - 1 : 0
            setStore("active", filtered[n]?.id)
          }
          setStore("all", filtered)
          setStore("layouts", active, undefined!)
        })
        await sdk.client.pty.remove({ ptyID: id }).catch((error: unknown) => {
          console.error("Failed to close terminal", error)
        })
        return
      }

      const remaining = layoutPanes(result)
      const focused = remaining.includes(existing.focused ?? "") ? existing.focused : remaining[0]

      batch(() => {
        setStore("layouts", active, { layout: result, focused })
        setStore("all", store.all.filter((x) => x.id !== id))
      })

      await sdk.client.pty.remove({ ptyID: id }).catch((error: unknown) => {
        console.error("Failed to close terminal", error)
      })
    },
    focusPane(id: string) {
      const active = store.active
      if (!active) return
      setStore("layouts", active, "focused", id)
    },
    focusDirection(direction: "left" | "right" | "up" | "down") {
      const active = store.active
      if (!active) return
      const existing = store.layouts[active]
      if (!existing?.layout || !existing.focused) return
      const target = focusLayout(existing.layout, direction, existing.focused)
      if (target) setStore("layouts", active, "focused", target)
    },
    resizePane(path: number[], ratio: number) {
      const active = store.active
      if (!active) return
      const existing = store.layouts[active]
      if (!existing?.layout) return
      setStore("layouts", active, "layout", resizeLayout(existing.layout, path, ratio))
    },
  }
}

export const { use: useTerminal, provider: TerminalProvider } = createSimpleContext({
  name: "Terminal",
  gate: false,
  init: () => {
    const sdk = useSDK()
    const params = useParams()
    const cache = new Map<string, TerminalCacheEntry>()

    caches.add(cache)
    onCleanup(() => caches.delete(cache))

    const disposeAll = () => {
      for (const entry of cache.values()) {
        entry.dispose()
      }
      cache.clear()
    }

    onCleanup(disposeAll)

    const prune = () => {
      while (cache.size > MAX_TERMINAL_SESSIONS) {
        const first = cache.keys().next().value
        if (!first) return
        const entry = cache.get(first)
        entry?.dispose()
        cache.delete(first)
      }
    }

    const loadWorkspace = (dir: string, legacySessionID?: string) => {
      // Terminals are workspace-scoped so tabs persist while switching sessions in the same directory.
      const key = getWorkspaceTerminalCacheKey(dir)
      const existing = cache.get(key)
      if (existing) {
        cache.delete(key)
        cache.set(key, existing)
        return existing.value
      }

      const entry = createRoot((dispose) => ({
        value: createWorkspaceTerminalSession(sdk, dir, legacySessionID),
        dispose,
      }))

      cache.set(key, entry)
      prune()
      return entry.value
    }

    const workspace = createMemo(() => loadWorkspace(params.dir!, params.id))

    return {
      ready: () => workspace().ready(),
      all: () => workspace().all(),
      active: () => workspace().active(),
      new: (opts?: { cwd?: string }) => workspace().new(opts),
      update: (pty: Partial<LocalPTY> & { id: string }) => workspace().update(pty),
      clone: (id: string) => workspace().clone(id),
      open: (id: string) => workspace().open(id),
      close: (id: string) => workspace().close(id),
      move: (id: string, to: number) => workspace().move(id, to),
      next: () => workspace().next(),
      previous: () => workspace().previous(),
      getLayout: () => workspace().getLayout(),
      split: (id: string, direction: SplitDirection) => workspace().split(id, direction),
      removeSplit: (id: string) => workspace().removeSplit(id),
      focusPane: (id: string) => workspace().focusPane(id),
      focusDirection: (direction: "left" | "right" | "up" | "down") => workspace().focusDirection(direction),
      resizePane: (path: number[], ratio: number) => workspace().resizePane(path, ratio),
    }
  },
})

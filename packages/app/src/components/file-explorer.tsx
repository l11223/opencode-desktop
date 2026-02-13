import { createSignal, createMemo, Show } from "solid-js"
import { Code } from "@opencode-ai/ui/code"
import { ContextMenu } from "@opencode-ai/ui/context-menu"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { Icon } from "@opencode-ai/ui/icon"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { Spinner } from "@opencode-ai/ui/spinner"
import { showToast } from "@opencode-ai/ui/toast"
import { checksum } from "@opencode-ai/util/encode"
import { getDirectory, getFilename } from "@opencode-ai/util/path"
import { selectionFromLines, useFile, type FileSelection, type SelectedLineRange } from "@/context/file"
import { useSDK } from "@/context/sdk"
import FileTree from "./file-tree"
import { filterNodes, targetDir, validateName } from "./file-tree-helpers"
import { createFileOperations } from "./file-operations"
import type { FileNode } from "@opencode-ai/sdk/v2"

type Kind = "add" | "del" | "mix"

export function FileExplorer(props: {
  onFileSelect?: (path: string) => void
  onContextMenu?: (path: string, event: MouseEvent) => void
  onDragStart?: (path: string) => void
  onAddToContext?: (path: string, selection?: FileSelection) => void
  onOpenInTerminal?: (dir: string) => void
  kinds?: Map<string, Kind>
}) {
  const file = useFile()
  const sdk = useSDK()
  const [width, setWidth] = createSignal(256)
  const [selected, setSelected] = createSignal<string | null>(null)
  const [lines, setLines] = createSignal<SelectedLineRange | null>(null)
  const [contextNode, setContextNode] = createSignal<FileNode | null>(null)

  // Task 2.1: Search state
  const [query, setQuery] = createSignal("")
  const [debounced, setDebounced] = createSignal("")
  let timer: ReturnType<typeof setTimeout> | undefined

  const onSearch = (val: string) => {
    setQuery(val)
    clearTimeout(timer)
    timer = setTimeout(() => setDebounced(val.trim()), 150)
  }

  const allowed = createMemo(() => {
    const q = debounced()
    if (!q) return undefined
    const nodes = file.tree.children(sdk.directory)
    const collect = (dir: string): FileNode[] => {
      const children = file.tree.children(dir)
      return [
        ...children,
        ...children
          .filter((n): n is FileNode & { type: "directory" } => n.type === "directory")
          .flatMap((n) => collect(n.path)),
      ]
    }
    const all = [...nodes, ...nodes
      .filter((n): n is FileNode & { type: "directory" } => n.type === "directory")
      .flatMap((n) => collect(n.path))]
    const map: Record<string, FileNode> = {}
    for (const n of all) map[n.path] = n
    const filtered = filterNodes({ nodes: all, allNodes: map, query: q })
    return filtered.map((n) => n.path)
  })

  // Task 5.2: File operation state
  const [creating, setCreating] = createSignal<{ dir: string; type: "file" | "directory" } | null>(null)
  const [renaming, setRenaming] = createSignal<string | null>(null)

  const ops = createFileOperations((cmd, cwd) =>
    sdk.client.pty
      .create({ command: cmd[0], args: cmd.slice(1), cwd, title: "file-op" })
      .then((r) => {
        const id = r.data?.id
        if (id) sdk.client.pty.remove({ ptyID: id }).catch(() => {})
      }),
  )

  const state = createMemo(() => {
    const path = selected()
    if (!path) return
    return file.get(path)
  })

  const contents = createMemo(() => state()?.content?.content ?? "")
  const cache = createMemo(() => checksum(contents()))
  const name = createMemo(() => {
    const path = selected()
    if (!path) return ""
    return getFilename(path)
  })

  const loading = createMemo(() => state()?.loading ?? false)
  const error = createMemo(() => state()?.error)
  const loaded = createMemo(() => state()?.loaded ?? false)
  const binary = createMemo(() => state()?.content?.type === "binary")

  const label = createMemo(() => {
    const range = lines()
    if (!range) return ""
    const start = Math.min(range.start, range.end)
    const end = Math.max(range.start, range.end)
    if (start === end) return `line ${start}`
    return `lines ${start}-${end}`
  })

  const select = (path: string) => {
    setSelected(path)
    setLines(null)
    file.load(path)
    props.onFileSelect?.(path)
  }

  const add = () => {
    const path = selected()
    const range = lines()
    if (!path || !range) return
    props.onAddToContext?.(path, selectionFromLines(range))
    setLines(null)
  }

  const refresh = (dir: string) => void file.tree.refresh(dir)

  const onCreate = (dir: string, name: string, type: "file" | "directory") => {
    const siblings = file.tree.children(dir).map((n) => n.name)
    const err = validateName(name, siblings)
    if (err) {
      showToast({ variant: "error", title: "Create failed", description: err })
      return
    }
    ops.create({ dir, name, type }).then(
      () => {
        setCreating(null)
        refresh(dir)
      },
      (e: Error) => showToast({ variant: "error", title: "Create failed", description: e.message }),
    )
  }

  const onRename = (path: string, newName: string) => {
    const dir = getDirectory(path) || "."
    const siblings = file.tree.children(dir).filter((n) => n.path !== path).map((n) => n.name)
    const err = validateName(newName, siblings)
    if (err) {
      showToast({ variant: "error", title: "Rename failed", description: err })
      return
    }
    ops.rename({ oldPath: path, newName }).then(
      () => {
        setRenaming(null)
        refresh(dir)
      },
      (e: Error) => showToast({ variant: "error", title: "Rename failed", description: e.message }),
    )
  }

  const onDelete = (node: FileNode) => {
    if (!window.confirm(`Delete "${node.path}"?`)) return
    ops.remove({ path: node.path }).then(
      () => refresh(getDirectory(node.path) || sdk.directory),
      (e: Error) => showToast({ variant: "error", title: "Delete failed", description: e.message }),
    )
  }

  return (
    <div class="flex h-full overflow-hidden">
      <div style={{ width: `${width()}px` }} class="shrink-0 border-r border-border-base overflow-y-auto thin-scrollbar flex flex-col">
        <div class="shrink-0 px-2 py-1.5">
          <div class="flex items-center gap-1.5 px-1.5 h-7 rounded-md border border-border-base bg-surface-base">
            <Icon name="magnifying-glass" size="small" class="text-icon-weak shrink-0" />
            <input
              type="text"
              placeholder="Filter files..."
              value={query()}
              onInput={(e) => onSearch(e.currentTarget.value)}
              class="flex-1 min-w-0 bg-transparent text-12-regular text-text-strong placeholder:text-text-weaker outline-none"
            />
            <Show when={query()}>
              <button type="button" class="text-icon-weak hover:text-icon-base" onClick={() => { setQuery(""); setDebounced("") }}>
                <Icon name="close-small" size="small" />
              </button>
            </Show>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto thin-scrollbar">
          <Show when={debounced() && allowed()?.length === 0}>
            <div class="px-4 py-8 text-center text-12-regular text-text-weaker">No matching results</div>
          </Show>
          <Show when={!debounced() || (allowed()?.length ?? 0) > 0}>
            <ContextMenu>
              <ContextMenu.Trigger as="div" class="w-full">
                <FileTree
                  path={sdk.directory}
                  active={selected() ?? undefined}
                  kinds={props.kinds}
                  tooltip={false}
                  allowed={allowed()}
                  onFileClick={(node) => select(node.path)}
                  onNodeContextMenu={(node) => setContextNode(node)}
                  creating={creating()}
                  renaming={renaming()}
                  onCreateSubmit={onCreate}
                  onCreateCancel={() => setCreating(null)}
                  onRenameSubmit={onRename}
                  onRenameCancel={() => setRenaming(null)}
                />
              </ContextMenu.Trigger>
              <ContextMenu.Portal>
                <ContextMenu.Content>
                  <ContextMenu.Item
                    onSelect={() => {
                      const node = contextNode()
                      if (!node) return
                      const dir = targetDir(node)
                      file.tree.expand(dir)
                      setCreating({ dir, type: "file" })
                    }}
                  >
                    <ContextMenu.ItemLabel>New File</ContextMenu.ItemLabel>
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    onSelect={() => {
                      const node = contextNode()
                      if (!node) return
                      const dir = targetDir(node)
                      file.tree.expand(dir)
                      setCreating({ dir, type: "directory" })
                    }}
                  >
                    <ContextMenu.ItemLabel>New Folder</ContextMenu.ItemLabel>
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    onSelect={() => {
                      const node = contextNode()
                      if (!node) return
                      setRenaming(node.path)
                    }}
                  >
                    <ContextMenu.ItemLabel>Rename</ContextMenu.ItemLabel>
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    onSelect={() => {
                      const node = contextNode()
                      if (!node) return
                      onDelete(node)
                    }}
                  >
                    <ContextMenu.ItemLabel>Delete</ContextMenu.ItemLabel>
                  </ContextMenu.Item>
                  <ContextMenu.Separator />
                  <ContextMenu.Item
                    onSelect={() => {
                      const node = contextNode()
                      if (!node) return
                      const dir = node.type === "directory" ? node.path : getDirectory(node.path)
                      props.onOpenInTerminal?.(dir)
                    }}
                  >
                    <ContextMenu.ItemLabel>Open in Terminal</ContextMenu.ItemLabel>
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    onSelect={() => {
                      const node = contextNode()
                      if (!node || node.type !== "file") return
                      props.onAddToContext?.(node.path)
                    }}
                    disabled={contextNode()?.type !== "file"}
                  >
                    <ContextMenu.ItemLabel>Add to Chat</ContextMenu.ItemLabel>
                  </ContextMenu.Item>
                  <ContextMenu.Separator />
                  <ContextMenu.Item
                    onSelect={() => {
                      const node = contextNode()
                      if (!node) return
                      navigator.clipboard.writeText(node.path)
                    }}
                  >
                    <ContextMenu.ItemLabel>Copy Path</ContextMenu.ItemLabel>
                  </ContextMenu.Item>
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu>
          </Show>
        </div>
      </div>
      <ResizeHandle direction="horizontal" edge="end" size={width()} min={180} max={400} onResize={setWidth} />
      <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Show
          when={selected()}
          fallback={
            <div class="flex-1 flex flex-col items-center justify-center gap-2">
              <Icon name="folder" class="size-8 text-icon-weaker" />
              <span class="text-14-regular text-text-weaker">Select a file to preview</span>
            </div>
          }
        >
          {(path: () => string) => (
            <>
              <div class="shrink-0 h-10 flex items-center gap-2 px-4 border-b border-border-base bg-surface-base">
                <FileIcon
                  node={{ path: path(), type: "file" }}
                  class="text-icon-weak size-4"
                />
                <span class="text-12-medium text-text-strong truncate">{name()}</span>
                <Show when={lines()}>
                  <div class="ml-auto flex items-center gap-2">
                    <span class="text-12-regular text-text-weak">{label()}</span>
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded-md text-12-medium bg-button-primary-base text-text-on-primary hover:bg-button-primary-hover"
                      onClick={add}
                    >
                      Add to chat
                    </button>
                  </div>
                </Show>
              </div>
              <div class="flex-1 overflow-auto thin-scrollbar">
                <Show when={loading()}>
                  <div class="p-4 flex items-center justify-center">
                    <Spinner />
                  </div>
                </Show>
                <Show when={error()}>
                  {(err: () => string) => (
                    <div class="p-4 flex flex-col gap-2">
                      <div class="text-14-regular text-text-weak">{err()}</div>
                      <button
                        type="button"
                        class="w-fit px-3 py-1 rounded-md text-12-medium bg-surface-raised-base-hover hover:bg-surface-base-active text-text-strong shadow-interactive rounded-interactive"
                        onClick={() => file.load(path(), { force: true })}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </Show>
                <Show when={loaded() && binary()}>
                  <div class="p-4 text-text-weak text-14-regular">Binary file cannot be previewed</div>
                </Show>
                <Show when={loaded() && !binary() && !error()}>
                  <Code
                    file={{
                      name: path(),
                      contents: contents(),
                      cacheKey: cache(),
                    }}
                    enableLineSelection
                    selectedLines={lines()}
                    onLineSelectionEnd={(range: SelectedLineRange | null) => setLines(range)}
                    overflow="scroll"
                    class="select-text"
                  />
                </Show>
              </div>
            </>
          )}
        </Show>
      </div>
    </div>
  )
}

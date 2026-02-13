import { useFile } from "@/context/file"
import { encodeFilePath } from "@/context/file/path"
import { Collapsible } from "@opencode-ai/ui/collapsible"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { Icon } from "@opencode-ai/ui/icon"
import { Spinner } from "@opencode-ai/ui/spinner"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import {
  createEffect,
  createMemo,
  For,
  Match,
  on,
  Show,
  splitProps,
  Switch,
  untrack,
  type ComponentProps,
  type ParentProps,
} from "solid-js"
import { Dynamic } from "solid-js/web"
import type { FileNode } from "@opencode-ai/sdk/v2"
import { shouldListRoot, shouldListExpanded, dirsToExpand, flattenTree, shouldVirtualize, type FlatNode } from "./file-tree-helpers"
import VirtualScroller from "./virtual-scroller"

export { shouldListRoot, shouldListExpanded, dirsToExpand }

export function InlineInput(props: {
  level: number
  initial?: string
  icon: "file" | "folder"
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  let ref: HTMLInputElement | undefined
  let submitted = false

  const blur = () => {
    if (submitted) return
    const val = ref?.value.trim() ?? ""
    if (!val || val === (props.initial ?? "")) {
      props.onCancel()
      return
    }
    submitted = true
    props.onSubmit(val)
  }

  const keydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const val = ref?.value.trim() ?? ""
      if (!val) return props.onCancel()
      submitted = true
      props.onSubmit(val)
      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      props.onCancel()
    }
  }

  createEffect(() => {
    ref?.focus()
    if (props.initial) {
      const dot = props.initial.lastIndexOf(".")
      ref?.setSelectionRange(0, dot > 0 ? dot : props.initial.length)
    }
  })

  return (
    <div
      class="w-full min-w-0 h-6 flex items-center gap-x-1.5 px-1.5"
      style={`padding-left: ${Math.max(0, 8 + props.level * 12 - (props.icon === "file" ? 24 : 4))}px`}
    >
      <Show when={props.icon === "folder"}>
        <div class="size-4 flex items-center justify-center text-icon-weak">
          <Icon name="chevron-right" size="small" />
        </div>
      </Show>
      <Show when={props.icon === "file"}>
        <div class="w-4 shrink-0" />
        <FileIcon node={{ path: "new", type: "file" }} class="text-icon-weak size-4" />
      </Show>
      <input
        ref={ref}
        value={props.initial ?? ""}
        onKeyDown={keydown}
        onBlur={blur}
        class="flex-1 min-w-0 bg-transparent text-12-medium text-text-strong outline-none border border-border-base rounded px-1"
      />
    </div>
  )
}

function pathToFileUrl(filepath: string): string {
  return `file://${encodeFilePath(filepath)}`
}

type Kind = "add" | "del" | "mix"

type Filter = {
  files: Set<string>
  dirs: Set<string>
}

export default function FileTree(props: {
  path: string
  class?: string
  nodeClass?: string
  active?: string
  level?: number
  allowed?: readonly string[]
  modified?: readonly string[]
  kinds?: ReadonlyMap<string, Kind>
  draggable?: boolean
  tooltip?: boolean
  onFileClick?: (file: FileNode) => void
  onNodeContextMenu?: (node: FileNode, event: MouseEvent) => void
  creating?: { dir: string; type: "file" | "directory" } | null
  renaming?: string | null
  onCreateSubmit?: (dir: string, name: string, type: "file" | "directory") => void
  onCreateCancel?: () => void
  onRenameSubmit?: (path: string, newName: string) => void
  onRenameCancel?: () => void

  _filter?: Filter
  _marks?: Set<string>
  _deeps?: Map<string, number>
  _kinds?: ReadonlyMap<string, Kind>
}) {
  const file = useFile()
  const level = props.level ?? 0
  const draggable = () => props.draggable ?? true
  const tooltip = () => props.tooltip ?? true

  const filter = createMemo(() => {
    if (props._filter) return props._filter

    const allowed = props.allowed
    if (!allowed) return

    const files = new Set(allowed)
    const dirs = new Set<string>()

    for (const item of allowed) {
      const parts = item.split("/")
      const parents = parts.slice(0, -1)
      for (const [idx] of parents.entries()) {
        const dir = parents.slice(0, idx + 1).join("/")
        if (dir) dirs.add(dir)
      }
    }

    return { files, dirs }
  })

  const marks = createMemo(() => {
    if (props._marks) return props._marks

    const out = new Set<string>()
    for (const item of props.modified ?? []) out.add(item)
    for (const item of props.kinds?.keys() ?? []) out.add(item)
    if (out.size === 0) return
    return out
  })

  const kinds = createMemo(() => {
    if (props._kinds) return props._kinds
    return props.kinds
  })

  const deeps = createMemo(() => {
    if (props._deeps) return props._deeps

    const out = new Map<string, number>()

    const visit = (dir: string, lvl: number): number => {
      const expanded = file.tree.state(dir)?.expanded ?? false
      if (!expanded) return -1

      const nodes = file.tree.children(dir)
      const max = nodes.reduce((max, node) => {
        if (node.type !== "directory") return max
        const open = file.tree.state(node.path)?.expanded ?? false
        if (!open) return max
        return Math.max(max, visit(node.path, lvl + 1))
      }, lvl)

      out.set(dir, max)
      return max
    }

    visit(props.path, level - 1)
    return out
  })

  createEffect(() => {
    const current = filter()
    const dirs = dirsToExpand({
      level,
      filter: current,
      expanded: (dir) => untrack(() => file.tree.state(dir)?.expanded) ?? false,
    })
    for (const dir of dirs) file.tree.expand(dir)
  })

  createEffect(
    on(
      () => props.path,
      (path) => {
        const dir = untrack(() => file.tree.state(path))
        if (!shouldListRoot({ level, dir })) return
        void file.tree.list(path)
      },
      { defer: false },
    ),
  )

  createEffect(() => {
    const dir = file.tree.state(props.path)
    if (!shouldListExpanded({ level, dir })) return
    void file.tree.list(props.path)
  })

  const nodes = createMemo(() => {
    const nodes = file.tree.children(props.path)
    const current = filter()
    if (!current) return nodes

    const parent = (path: string) => {
      const idx = path.lastIndexOf("/")
      if (idx === -1) return ""
      return path.slice(0, idx)
    }

    const leaf = (path: string) => {
      const idx = path.lastIndexOf("/")
      return idx === -1 ? path : path.slice(idx + 1)
    }

    const out = nodes.filter((node) => {
      if (node.type === "file") return current.files.has(node.path)
      return current.dirs.has(node.path)
    })

    const seen = new Set(out.map((node) => node.path))

    for (const dir of current.dirs) {
      if (parent(dir) !== props.path) continue
      if (seen.has(dir)) continue
      out.push({
        name: leaf(dir),
        path: dir,
        absolute: dir,
        type: "directory",
        ignored: false,
      })
      seen.add(dir)
    }

    for (const item of current.files) {
      if (parent(item) !== props.path) continue
      if (seen.has(item)) continue
      out.push({
        name: leaf(item),
        path: item,
        absolute: item,
        type: "file",
        ignored: false,
      })
      seen.add(item)
    }

    out.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return out
  })

  const flat = createMemo(() => {
    if (level !== 0) return []
    const current = filter()
    return flattenTree({
      root: props.path,
      children: (path) => file.tree.children(path),
      expanded: (path) => file.tree.state(path)?.expanded ?? false,
      filter: current
        ? (n) => (n.type === "file" ? current.files.has(n.path) : current.dirs.has(n.path))
        : undefined,
    })
  })

  const virtual = createMemo(() => level === 0 && shouldVirtualize(flat().length))

  const Node = (
    p: ParentProps &
      ComponentProps<"div"> &
      ComponentProps<"button"> & {
        node: FileNode
        as?: "div" | "button"
        nodeLevel?: number
      },
  ) => {
    const [local, rest] = splitProps(p, ["node", "as", "children", "class", "classList", "nodeLevel"])
    const lvl = local.nodeLevel ?? level
    return (
      <Dynamic
        component={local.as ?? "div"}
        classList={{
          "w-full min-w-0 h-6 flex items-center justify-start gap-x-1.5 rounded-md px-1.5 py-0 text-left hover:bg-surface-raised-base-hover active:bg-surface-base-active transition-colors cursor-pointer": true,
          "bg-surface-base-active": local.node.path === props.active,
          ...(local.classList ?? {}),
          [local.class ?? ""]: !!local.class,
          [props.nodeClass ?? ""]: !!props.nodeClass,
        }}
        style={`padding-left: ${Math.max(0, 8 + lvl * 12 - (local.node.type === "file" ? 24 : 4))}px`}
        draggable={draggable()}
        onContextMenu={(e: MouseEvent) => props.onNodeContextMenu?.(local.node, e)}
        onDragStart={(e: DragEvent) => {
          if (!draggable()) return
          e.dataTransfer?.setData("text/plain", `file:${local.node.path}`)
          e.dataTransfer?.setData("text/uri-list", pathToFileUrl(local.node.path))
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy"

          const dragImage = document.createElement("div")
          dragImage.className =
            "flex items-center gap-x-2 px-2 py-1 bg-surface-raised-base rounded-md border border-border-base text-12-regular text-text-strong"
          dragImage.style.position = "absolute"
          dragImage.style.top = "-1000px"

          const icon =
            (e.currentTarget as HTMLElement).querySelector('[data-component="file-icon"]') ??
            (e.currentTarget as HTMLElement).querySelector("svg")
          const text = (e.currentTarget as HTMLElement).querySelector("span")
          if (icon && text) {
            dragImage.innerHTML = (icon as SVGElement).outerHTML + (text as HTMLSpanElement).outerHTML
          }

          document.body.appendChild(dragImage)
          e.dataTransfer?.setDragImage(dragImage, 0, 12)
          setTimeout(() => document.body.removeChild(dragImage), 0)
        }}
        {...rest}
      >
        {local.children}
        {(() => {
          const kind = kinds()?.get(local.node.path)
          const marked = marks()?.has(local.node.path) ?? false
          const active = !!kind && marked && !local.node.ignored
          const color =
            kind === "add"
              ? "color: var(--icon-diff-add-base)"
              : kind === "del"
                ? "color: var(--icon-diff-delete-base)"
                : kind === "mix"
                  ? "color: var(--icon-warning-active)"
                  : undefined
          return (
            <span
              classList={{
                "flex-1 min-w-0 text-12-medium whitespace-nowrap truncate": true,
                "text-text-weaker": local.node.ignored,
                "text-text-weak": !local.node.ignored && !active,
              }}
              style={active ? color : undefined}
            >
              {local.node.name}
            </span>
          )
        })()}
        {(() => {
          const kind = kinds()?.get(local.node.path)
          if (!kind) return null
          if (!marks()?.has(local.node.path)) return null

          if (local.node.type === "file") {
            const text = kind === "add" ? "A" : kind === "del" ? "D" : "M"
            const color =
              kind === "add"
                ? "color: var(--icon-diff-add-base)"
                : kind === "del"
                  ? "color: var(--icon-diff-delete-base)"
                  : "color: var(--icon-warning-active)"

            return (
              <span class="shrink-0 w-4 text-center text-12-medium" style={color}>
                {text}
              </span>
            )
          }

          if (local.node.type === "directory") {
            const color =
              kind === "add"
                ? "background-color: var(--icon-diff-add-base)"
                : kind === "del"
                  ? "background-color: var(--icon-diff-delete-base)"
                  : "background-color: var(--icon-warning-active)"

            return <div class="shrink-0 size-1.5 mr-1.5 rounded-full" style={color} />
          }

          return null
        })()}
      </Dynamic>
    )
  }

  const FlatRow = (p: { item: FlatNode }) => {
    const node = p.item.node
    const lvl = p.item.level

    if (props.renaming === node.path) {
      return (
        <InlineInput
          level={lvl}
          initial={node.name}
          icon={node.type === "directory" ? "folder" : "file"}
          onSubmit={(name) => props.onRenameSubmit?.(node.path, name)}
          onCancel={() => props.onRenameCancel?.()}
        />
      )
    }

    if (node.type === "directory") {
      const loading = () => file.tree.state(node.path)?.loading ?? false
      return (
        <Node
          node={node}
          nodeLevel={lvl}
          onClick={() => (p.item.expanded ? file.tree.collapse(node.path) : file.tree.expand(node.path))}
        >
          <div class="size-4 flex items-center justify-center text-icon-weak">
            <Show when={!loading()} fallback={<Spinner class="size-3" />}>
              <Icon name={p.item.expanded ? "chevron-down" : "chevron-right"} size="small" />
            </Show>
          </div>
        </Node>
      )
    }

    return (
      <Node node={node} nodeLevel={lvl} as="button" type="button" onClick={() => props.onFileClick?.(node)}>
        <div class="w-4 shrink-0" />
        <FileIcon node={node} class="text-icon-weak size-4" />
      </Node>
    )
  }

  return (
    <div class={`flex flex-col gap-0.5 ${props.class ?? ""}`}>
      <Show when={props.creating && props.creating.dir === props.path}>
        {(c) => (
          <InlineInput
            level={level + 1}
            icon={c().type === "directory" ? "folder" : "file"}
            onSubmit={(name) => props.onCreateSubmit?.(c().dir, name, c().type)}
            onCancel={() => props.onCreateCancel?.()}
          />
        )}
      </Show>
      <Show
        when={virtual()}
        fallback={
          <For each={nodes()}>
            {(node) => {
              const renamed = () => props.renaming === node.path
              const expanded = () => file.tree.state(node.path)?.expanded ?? false
              const loading = () => file.tree.state(node.path)?.loading ?? false
              const deep = () => deeps().get(node.path) ?? -1
              const Wrapper = (p: ParentProps) => {
                if (!tooltip()) return p.children

                const parts = node.path.split("/")
                const leaf = parts[parts.length - 1] ?? node.path
                const head = parts.slice(0, -1).join("/")
                const prefix = head ? `${head}/` : ""

                const kind = () => kinds()?.get(node.path)
                const label = () => {
                  const k = kind()
                  if (!k) return
                  if (k === "add") return "Additions"
                  if (k === "del") return "Deletions"
                  return "Modifications"
                }

                const ignored = () => node.type === "directory" && node.ignored

                return (
                  <Tooltip
                    openDelay={2000}
                    placement="bottom-start"
                    class="w-full"
                    contentStyle={{ "max-width": "480px", width: "fit-content" }}
                    value={
                      <div class="flex items-center min-w-0 whitespace-nowrap text-12-regular">
                        <span
                          class="min-w-0 truncate text-text-invert-base"
                          style={{ direction: "rtl", "unicode-bidi": "plaintext" }}
                        >
                          {prefix}
                        </span>
                        <span class="shrink-0 text-text-invert-strong">{leaf}</span>
                        <Show when={label()}>
                          {(t: () => string) => (
                            <>
                              <span class="mx-1 font-bold text-text-invert-strong">•</span>
                              <span class="shrink-0 text-text-invert-strong">{t()}</span>
                            </>
                          )}
                        </Show>
                        <Show when={ignored()}>
                          <>
                            <span class="mx-1 font-bold text-text-invert-strong">•</span>
                            <span class="shrink-0 text-text-invert-strong">Ignored</span>
                          </>
                        </Show>
                      </div>
                    }
                  >
                    {p.children}
                  </Tooltip>
                )
              }

              if (renamed()) {
                return (
                  <InlineInput
                    level={level + 1}
                    initial={node.name}
                    icon={node.type === "directory" ? "folder" : "file"}
                    onSubmit={(name) => props.onRenameSubmit?.(node.path, name)}
                    onCancel={() => props.onRenameCancel?.()}
                  />
                )
              }

              return (
                <Switch>
                  <Match when={node.type === "directory"}>
                    <Collapsible
                      variant="ghost"
                      class="w-full"
                      data-scope="filetree"
                      forceMount={false}
                      open={expanded()}
                      onOpenChange={(open) => (open ? file.tree.expand(node.path) : file.tree.collapse(node.path))}
                    >
                      <Collapsible.Trigger>
                        <Wrapper>
                          <Node node={node}>
                            <div class="size-4 flex items-center justify-center text-icon-weak">
                              <Show
                                when={!loading()}
                                fallback={<Spinner class="size-3" />}
                              >
                                <Icon name={expanded() ? "chevron-down" : "chevron-right"} size="small" />
                              </Show>
                            </div>
                          </Node>
                        </Wrapper>
                      </Collapsible.Trigger>
                      <Collapsible.Content class="relative pt-0.5">
                        <div
                          classList={{
                            "absolute top-0 bottom-0 w-px pointer-events-none bg-border-weak-base opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none": true,
                            "group-hover/filetree:opacity-100": expanded() && deep() === level,
                            "group-hover/filetree:opacity-50": !(expanded() && deep() === level),
                          }}
                          style={`left: ${Math.max(0, 8 + level * 12 - 4) + 8}px`}
                        />
                        <FileTree
                          path={node.path}
                          level={level + 1}
                          allowed={props.allowed}
                          modified={props.modified}
                          kinds={props.kinds}
                          active={props.active}
                          draggable={props.draggable}
                          tooltip={props.tooltip}
                          onFileClick={props.onFileClick}
                          onNodeContextMenu={props.onNodeContextMenu}
                          creating={props.creating}
                          renaming={props.renaming}
                          onCreateSubmit={props.onCreateSubmit}
                          onCreateCancel={props.onCreateCancel}
                          onRenameSubmit={props.onRenameSubmit}
                          onRenameCancel={props.onRenameCancel}
                          _filter={filter()}
                          _marks={marks()}
                          _deeps={deeps()}
                          _kinds={kinds()}
                        />
                      </Collapsible.Content>
                    </Collapsible>
                  </Match>
                  <Match when={node.type === "file"}>
                    <Wrapper>
                      <Node node={node} as="button" type="button" onClick={() => props.onFileClick?.(node)}>
                        <div class="w-4 shrink-0" />
                        <FileIcon node={node} class="text-icon-weak size-4" />
                      </Node>
                    </Wrapper>
                  </Match>
                </Switch>
              )
            }}
          </For>
        }
      >
        <VirtualScroller items={flat()} height={600} rowHeight={24} overscan={5}>
          {(item) => <FlatRow item={item} />}
        </VirtualScroller>
      </Show>
    </div>
  )
}

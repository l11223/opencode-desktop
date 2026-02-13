import { type JSX, Match, Switch, createSignal } from "solid-js"
import type { LayoutNode, PaneNode, SplitNode } from "./terminal-layout"

type SplitContainerProps = {
  layout: LayoutNode
  focused?: string
  onFocus?: (id: string) => void
  onResize?: (path: number[], ratio: number) => void
  onClose?: (id: string) => void
  renderPane: (id: string) => JSX.Element
}

function Pane(props: {
  node: PaneNode
  focused?: string
  onFocus?: (id: string) => void
  renderPane: (id: string) => JSX.Element
}) {
  return (
    <div
      class="relative size-full min-w-0 min-h-0"
      classList={{
        "ring-1 ring-inset ring-border-active": props.focused === props.node.id,
      }}
      onPointerDown={() => props.onFocus?.(props.node.id)}
    >
      {props.renderPane(props.node.id)}
    </div>
  )
}

function Divider(props: {
  direction: "horizontal" | "vertical"
  onDrag: (delta: number) => void
}) {
  const [dragging, setDragging] = createSignal(false)

  const down = (e: MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    const start = props.direction === "horizontal" ? e.clientX : e.clientY

    const move = (me: MouseEvent) => {
      const pos = props.direction === "horizontal" ? me.clientX : me.clientY
      props.onDrag(pos - start)
    }

    const up = () => {
      setDragging(false)
      document.removeEventListener("mousemove", move)
      document.removeEventListener("mouseup", up)
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }

    document.body.style.userSelect = "none"
    document.body.style.cursor = props.direction === "horizontal" ? "col-resize" : "row-resize"
    document.addEventListener("mousemove", move)
    document.addEventListener("mouseup", up)
  }

  return (
    <div
      class="shrink-0 bg-border-weak-base hover:bg-border-active transition-colors"
      classList={{
        "w-1 cursor-col-resize": props.direction === "horizontal",
        "h-1 cursor-row-resize": props.direction === "vertical",
        "bg-border-active": dragging(),
      }}
      onMouseDown={down}
    />
  )
}

function Split(props: {
  node: SplitNode
  path: number[]
  focused?: string
  onFocus?: (id: string) => void
  onResize?: (path: number[], ratio: number) => void
  onClose?: (id: string) => void
  renderPane: (id: string) => JSX.Element
}) {
  let ref!: HTMLDivElement

  const handle = (delta: number) => {
    if (!ref) return
    const total = props.node.direction === "horizontal" ? ref.offsetWidth : ref.offsetHeight
    if (total === 0) return
    const ratio = props.node.ratio + delta / total
    props.onResize?.(props.path, Math.min(0.9, Math.max(0.1, ratio)))
  }

  return (
    <div
      ref={ref}
      class="flex size-full min-w-0 min-h-0"
      classList={{
        "flex-row": props.node.direction === "horizontal",
        "flex-col": props.node.direction === "vertical",
      }}
    >
      <div
        class="min-w-0 min-h-0 overflow-hidden"
        style={
          props.node.direction === "horizontal"
            ? { width: `calc(${props.node.ratio * 100}% - 2px)` }
            : { height: `calc(${props.node.ratio * 100}% - 2px)` }
        }
      >
        <Node
          layout={props.node.children[0]}
          path={[...props.path, 0]}
          focused={props.focused}
          onFocus={props.onFocus}
          onResize={props.onResize}
          onClose={props.onClose}
          renderPane={props.renderPane}
        />
      </div>
      <Divider direction={props.node.direction} onDrag={handle} />
      <div
        class="min-w-0 min-h-0 overflow-hidden flex-1"
      >
        <Node
          layout={props.node.children[1]}
          path={[...props.path, 1]}
          focused={props.focused}
          onFocus={props.onFocus}
          onResize={props.onResize}
          onClose={props.onClose}
          renderPane={props.renderPane}
        />
      </div>
    </div>
  )
}

function Node(props: {
  layout: LayoutNode
  path: number[]
  focused?: string
  onFocus?: (id: string) => void
  onResize?: (path: number[], ratio: number) => void
  onClose?: (id: string) => void
  renderPane: (id: string) => JSX.Element
}) {
  return (
    <Switch>
      <Match when={props.layout.type === "pane" && props.layout as PaneNode}>
        {(node) => (
          <Pane
            node={node()}
            focused={props.focused}
            onFocus={props.onFocus}
            renderPane={props.renderPane}
          />
        )}
      </Match>
      <Match when={props.layout.type === "split" && props.layout as SplitNode}>
        {(node) => (
          <Split
            node={node()}
            path={props.path}
            focused={props.focused}
            onFocus={props.onFocus}
            onResize={props.onResize}
            onClose={props.onClose}
            renderPane={props.renderPane}
          />
        )}
      </Match>
    </Switch>
  )
}

export function SplitContainer(props: SplitContainerProps) {
  return (
    <Node
      layout={props.layout}
      path={[]}
      focused={props.focused}
      onFocus={props.onFocus}
      onResize={props.onResize}
      onClose={props.onClose}
      renderPane={props.renderPane}
    />
  )
}

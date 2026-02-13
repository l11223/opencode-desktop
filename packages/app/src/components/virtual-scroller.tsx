import { createSignal, createMemo, For, type JSX } from "solid-js"
import { visibleRange } from "./file-tree-helpers"

const ROW_HEIGHT = 24

export default function VirtualScroller<T>(props: {
  items: T[]
  height: number
  rowHeight?: number
  overscan?: number
  children: (item: T, index: number) => JSX.Element
}) {
  const [scrollTop, setScrollTop] = createSignal(0)
  const row = () => props.rowHeight ?? ROW_HEIGHT
  const overscan = () => props.overscan ?? 5

  const range = createMemo(() =>
    visibleRange({
      scrollTop: scrollTop(),
      height: props.height,
      rowHeight: row(),
      overscan: overscan(),
      total: props.items.length,
    }),
  )

  const slice = createMemo(() => props.items.slice(range().start, range().end))

  return (
    <div
      style={{ height: `${props.height}px`, overflow: "auto" }}
      class="thin-scrollbar"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: `${props.items.length * row()}px`, position: "relative" }}>
        <div style={{ position: "absolute", top: `${range().start * row()}px`, width: "100%" }}>
          <For each={slice()}>
            {(item, i) => props.children(item, range().start + i())}
          </For>
        </div>
      </div>
    </div>
  )
}

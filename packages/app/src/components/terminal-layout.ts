export type SplitDirection = "horizontal" | "vertical"

export type PaneNode = {
  type: "pane"
  id: string
  focused: boolean
}

export type SplitNode = {
  type: "split"
  direction: SplitDirection
  ratio: number
  children: [LayoutNode, LayoutNode]
}

export type LayoutNode = PaneNode | SplitNode

export function split(layout: LayoutNode, paneId: string, direction: SplitDirection, newPaneId: string): LayoutNode {
  if (layout.type === "pane") {
    if (layout.id !== paneId) return layout
    return {
      type: "split",
      direction,
      ratio: 0.5,
      children: [
        { ...layout },
        { type: "pane", id: newPaneId, focused: false },
      ],
    }
  }
  return {
    ...layout,
    children: [
      split(layout.children[0], paneId, direction, newPaneId),
      split(layout.children[1], paneId, direction, newPaneId),
    ],
  }
}

export function remove(layout: LayoutNode, paneId: string): LayoutNode | undefined {
  if (layout.type === "pane") return layout.id === paneId ? undefined : layout
  const left = remove(layout.children[0], paneId)
  const right = remove(layout.children[1], paneId)
  if (!left) return right
  if (!right) return left
  return { ...layout, children: [left, right] }
}

export function resize(layout: LayoutNode, path: number[], ratio: number): LayoutNode {
  if (layout.type === "pane") return layout
  if (path.length === 0) return { ...layout, ratio: Math.min(0.9, Math.max(0.1, ratio)) }
  const [head, ...rest] = path
  return {
    ...layout,
    children: [
      head === 0 ? resize(layout.children[0], rest, ratio) : layout.children[0],
      head === 1 ? resize(layout.children[1], rest, ratio) : layout.children[1],
    ],
  }
}

export function panes(layout: LayoutNode): string[] {
  if (layout.type === "pane") return [layout.id]
  return [...panes(layout.children[0]), ...panes(layout.children[1])]
}

export function find(layout: LayoutNode, paneId: string): PaneNode | undefined {
  if (layout.type === "pane") return layout.id === paneId ? layout : undefined
  return find(layout.children[0], paneId) ?? find(layout.children[1], paneId)
}

type Rect = { x: number; y: number; w: number; h: number }

function rects(layout: LayoutNode, rect: Rect = { x: 0, y: 0, w: 1, h: 1 }): { id: string; rect: Rect }[] {
  if (layout.type === "pane") return [{ id: layout.id, rect }]
  if (layout.direction === "horizontal") {
    const lw = rect.w * layout.ratio
    return [
      ...rects(layout.children[0], { x: rect.x, y: rect.y, w: lw, h: rect.h }),
      ...rects(layout.children[1], { x: rect.x + lw, y: rect.y, w: rect.w - lw, h: rect.h }),
    ]
  }
  const th = rect.h * layout.ratio
  return [
    ...rects(layout.children[0], { x: rect.x, y: rect.y, w: rect.w, h: th }),
    ...rects(layout.children[1], { x: rect.x, y: rect.y + th, w: rect.w, h: rect.h - th }),
  ]
}

function center(r: Rect): { cx: number; cy: number } {
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 }
}

export function focus(layout: LayoutNode, direction: "left" | "right" | "up" | "down", currentId: string): string | undefined {
  const all = rects(layout)
  const current = all.find((p) => p.id === currentId)
  if (!current) return undefined
  const cc = center(current.rect)

  const candidates = all.filter((p) => {
    if (p.id === currentId) return false
    const pc = center(p.rect)
    switch (direction) {
      case "left": return pc.cx < cc.cx
      case "right": return pc.cx > cc.cx
      case "up": return pc.cy < cc.cy
      case "down": return pc.cy > cc.cy
    }
  })

  if (candidates.length === 0) return undefined

  return candidates.reduce((closest, c) => {
    const cc2 = center(c.rect)
    const dc = center(closest.rect)
    const dist = Math.abs(cc2.cx - cc.cx) + Math.abs(cc2.cy - cc.cy)
    const best = Math.abs(dc.cx - cc.cx) + Math.abs(dc.cy - cc.cy)
    return dist < best ? c : closest
  }).id
}

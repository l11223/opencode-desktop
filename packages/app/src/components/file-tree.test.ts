import { describe, test, expect } from "bun:test"
import { shouldListRoot, shouldListExpanded, dirsToExpand, flattenTree, visibleRange, shouldVirtualize } from "./file-tree-helpers"
import type { FileNode } from "@opencode-ai/sdk/v2"

describe("shouldListRoot", () => {
  test("returns true for level 0 with no dir state", () => {
    expect(shouldListRoot({ level: 0 })).toBe(true)
  })

  test("returns false for non-zero level", () => {
    expect(shouldListRoot({ level: 1 })).toBe(false)
  })

  test("returns false when already loaded", () => {
    expect(shouldListRoot({ level: 0, dir: { loaded: true } })).toBe(false)
  })

  test("returns false when loading", () => {
    expect(shouldListRoot({ level: 0, dir: { loading: true } })).toBe(false)
  })
})

describe("shouldListExpanded", () => {
  test("returns false for level 0", () => {
    expect(shouldListExpanded({ level: 0, dir: { expanded: true } })).toBe(false)
  })

  test("returns false when not expanded", () => {
    expect(shouldListExpanded({ level: 1, dir: { expanded: false } })).toBe(false)
  })

  test("returns true when expanded and not loaded or loading", () => {
    expect(shouldListExpanded({ level: 1, dir: { expanded: true } })).toBe(true)
  })

  test("returns false when expanded but already loaded", () => {
    expect(shouldListExpanded({ level: 1, dir: { expanded: true, loaded: true } })).toBe(false)
  })

  test("returns false when expanded but currently loading", () => {
    expect(shouldListExpanded({ level: 1, dir: { expanded: true, loading: true } })).toBe(false)
  })
})

describe("dirsToExpand", () => {
  test("returns empty for non-zero level", () => {
    expect(dirsToExpand({ level: 1, filter: { dirs: new Set(["a"]) }, expanded: () => false })).toEqual([])
  })

  test("returns empty when no filter", () => {
    expect(dirsToExpand({ level: 0, expanded: () => false })).toEqual([])
  })

  test("returns dirs not yet expanded", () => {
    const result = dirsToExpand({
      level: 0,
      filter: { dirs: new Set(["a", "b", "c"]) },
      expanded: (dir) => dir === "b",
    })
    expect(result).toEqual(["a", "c"])
  })

  test("returns empty when all dirs already expanded", () => {
    const result = dirsToExpand({
      level: 0,
      filter: { dirs: new Set(["a", "b"]) },
      expanded: () => true,
    })
    expect(result).toEqual([])
  })
})


const node = (name: string, type: "file" | "directory", parent = ""): FileNode => ({
  name,
  path: parent ? `${parent}/${name}` : name,
  absolute: parent ? `${parent}/${name}` : name,
  type,
  ignored: false,
})

describe("flattenTree", () => {
  test("returns empty for empty root", () => {
    expect(flattenTree({ root: "root", children: () => [], expanded: () => false })).toEqual([])
  })

  test("flattens single level with dirs before files", () => {
    const nodes: Record<string, FileNode[]> = {
      root: [node("b.ts", "file", "root"), node("a", "directory", "root"), node("a.ts", "file", "root")],
    }
    const result = flattenTree({ root: "root", children: (p) => nodes[p] ?? [], expanded: () => false })
    expect(result.map((r) => r.node.name)).toEqual(["a", "a.ts", "b.ts"])
    expect(result[0].expanded).toBe(false)
    expect(result[0].level).toBe(0)
  })

  test("expands directories recursively", () => {
    const nodes: Record<string, FileNode[]> = {
      root: [node("src", "directory", "root")],
      "root/src": [node("index.ts", "file", "root/src")],
    }
    const result = flattenTree({ root: "root", children: (p) => nodes[p] ?? [], expanded: () => true })
    expect(result).toHaveLength(2)
    expect(result[0].node.name).toBe("src")
    expect(result[0].expanded).toBe(true)
    expect(result[0].level).toBe(0)
    expect(result[1].node.name).toBe("index.ts")
    expect(result[1].level).toBe(1)
  })

  test("respects filter", () => {
    const nodes: Record<string, FileNode[]> = {
      root: [node("a.ts", "file", "root"), node("b.ts", "file", "root")],
    }
    const result = flattenTree({
      root: "root",
      children: (p) => nodes[p] ?? [],
      expanded: () => false,
      filter: (n) => n.name === "a.ts",
    })
    expect(result).toHaveLength(1)
    expect(result[0].node.name).toBe("a.ts")
  })

  test("collapsed directory hides children", () => {
    const nodes: Record<string, FileNode[]> = {
      root: [node("src", "directory", "root")],
      "root/src": [node("index.ts", "file", "root/src")],
    }
    const result = flattenTree({ root: "root", children: (p) => nodes[p] ?? [], expanded: () => false })
    expect(result).toHaveLength(1)
    expect(result[0].node.name).toBe("src")
  })
})

describe("visibleRange", () => {
  test("computes basic range", () => {
    const result = visibleRange({ scrollTop: 0, height: 240, rowHeight: 24, overscan: 5, total: 100 })
    expect(result.start).toBe(0)
    expect(result.end).toBe(15)
  })

  test("scrolled down", () => {
    const result = visibleRange({ scrollTop: 480, height: 240, rowHeight: 24, overscan: 5, total: 100 })
    expect(result.start).toBe(15)
    expect(result.end).toBe(35)
  })

  test("clamps end to total", () => {
    const result = visibleRange({ scrollTop: 2200, height: 240, rowHeight: 24, overscan: 5, total: 100 })
    expect(result.end).toBe(100)
  })

  test("start never negative", () => {
    const result = visibleRange({ scrollTop: 0, height: 240, rowHeight: 24, overscan: 50, total: 10 })
    expect(result.start).toBe(0)
  })
})

describe("shouldVirtualize", () => {
  test("false below 200", () => {
    expect(shouldVirtualize(0)).toBe(false)
    expect(shouldVirtualize(199)).toBe(false)
  })

  test("true at 200 and above", () => {
    expect(shouldVirtualize(200)).toBe(true)
    expect(shouldVirtualize(1000)).toBe(true)
  })
})

import type { FileNode } from "@opencode-ai/sdk/v2"

export function shouldListRoot(input: { level: number; dir?: { loaded?: boolean; loading?: boolean } }) {
  if (input.level !== 0) return false
  if (input.dir?.loaded) return false
  if (input.dir?.loading) return false
  return true
}

export function shouldListExpanded(input: {
  level: number
  dir?: { expanded?: boolean; loaded?: boolean; loading?: boolean }
}) {
  if (input.level === 0) return false
  if (!input.dir?.expanded) return false
  if (input.dir.loaded) return false
  if (input.dir.loading) return false
  return true
}

export function dirsToExpand(input: {
  level: number
  filter?: { dirs: Set<string> }
  expanded: (dir: string) => boolean
}) {
  if (input.level !== 0) return []
  if (!input.filter) return []
  return [...input.filter.dirs].filter((dir) => !input.expanded(dir))
}

export function matchesQuery(path: string, query: string): boolean {
  if (!query) return true
  const lower = path.toLowerCase()
  const q = query.toLowerCase()
  if (lower.includes(q)) return true
  const name = path.slice(path.lastIndexOf("/") + 1)
  return name.toLowerCase().includes(q)
}

export function filterNodes(input: {
  nodes: FileNode[]
  allNodes: Record<string, FileNode>
  query: string
}): FileNode[] {
  if (!input.query) return input.nodes
  const matched = input.nodes.filter(
    (n) => n.type === "file" && matchesQuery(n.path, input.query),
  )
  const paths = new Set<string>()
  for (const n of matched) paths.add(n.path)
  for (const n of matched) {
    const parts = n.path.split("/")
    for (let i = 1; i < parts.length; i++) {
      const ancestor = parts.slice(0, i).join("/")
      if (input.allNodes[ancestor]) paths.add(ancestor)
    }
  }
  return input.nodes.filter((n) => paths.has(n.path))
}

export function targetDir(node: FileNode): string {
  if (node.type === "directory") return node.path
  const idx = node.path.lastIndexOf("/")
  if (idx < 0) return "."
  return node.path.slice(0, idx)
}

export function validateName(name: string, existing: string[]): string | null {
  const trimmed = name.trim()
  if (existing.includes(trimmed)) return `"${trimmed}" already exists`
  return null
}


export type FlatNode = {
  node: FileNode
  level: number
  expanded: boolean
}

export function flattenTree(input: {
  root: string
  children: (path: string) => FileNode[]
  expanded: (path: string) => boolean
  filter?: (node: FileNode) => boolean
}): FlatNode[] {
  const result: FlatNode[] = []

  const visit = (path: string, level: number) => {
    const nodes = input.children(path)
      .filter((n) => !input.filter || input.filter(n))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    for (const node of nodes) {
      const open = node.type === "directory" && input.expanded(node.path)
      result.push({ node, level, expanded: open })
      if (open) visit(node.path, level + 1)
    }
  }

  visit(input.root, 0)
  return result
}

export function visibleRange(input: {
  scrollTop: number
  height: number
  rowHeight: number
  overscan: number
  total: number
}) {
  const first = Math.floor(input.scrollTop / input.rowHeight)
  const count = Math.ceil(input.height / input.rowHeight)
  const start = Math.max(0, first - input.overscan)
  const end = Math.min(input.total, first + count + input.overscan)
  return { start, end }
}

export function shouldVirtualize(count: number) {
  return count >= 200
}


export type GitFile = {
  path: string
  status: "modified" | "added" | "deleted" | "untracked" | "renamed"
  staged: boolean
}

export type GitBranch = {
  name: string
  current: boolean
}

export type GitState = {
  branch: string
  branches: GitBranch[]
  staged: GitFile[]
  unstaged: GitFile[]
}

const STATUS_MAP: Record<string, GitFile["status"]> = {
  M: "modified",
  A: "added",
  D: "deleted",
  R: "renamed",
  "?": "untracked",
}

export function parseStatus(raw: string): { staged: GitFile[]; unstaged: GitFile[] } {
  const staged: GitFile[] = []
  const unstaged: GitFile[] = []

  for (const line of raw.split("\n")) {
    if (line.length < 4) continue
    const x = line[0]!
    const y = line[1]!
    const filepath = line.slice(3).split(" -> ").pop()!

    if (x !== " " && x !== "?") {
      staged.push({ path: filepath, status: STATUS_MAP[x] ?? "modified", staged: true })
    }

    if (y === "?" || (y !== " " && x !== "?")) {
      unstaged.push({ path: filepath, status: STATUS_MAP[y] ?? "modified", staged: false })
    } else if (x === "?" && y === "?") {
      unstaged.push({ path: filepath, status: "untracked", staged: false })
    }
  }

  return { staged, unstaged }
}

export function parseBranches(raw: string): { current: string; branches: GitBranch[] } {
  let current = ""
  const branches: GitBranch[] = []

  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith("* ")) {
      const name = trimmed.slice(2).replace(/^\(HEAD detached at (.+)\)$/, "$1")
      current = name
      branches.push({ name, current: true })
      continue
    }

    branches.push({ name: trimmed, current: false })
  }

  return { current, branches }
}

export function createGitState(status: string, raw: string): GitState {
  const files = parseStatus(status)
  const branches = parseBranches(raw)
  return {
    branch: branches.current,
    branches: branches.branches,
    staged: files.staged,
    unstaged: files.unstaged,
  }
}

export function label(status: GitFile["status"]): string {
  if (status === "modified") return "M"
  if (status === "added") return "A"
  if (status === "deleted") return "D"
  if (status === "renamed") return "R"
  return "U"
}

export function color(status: GitFile["status"]): string {
  if (status === "added" || status === "untracked") return "var(--icon-diff-add-base)"
  if (status === "deleted") return "var(--icon-diff-delete-base)"
  return "var(--icon-warning-active)"
}

export function colorClass(status: GitFile["status"]): string {
  if (status === "added" || status === "untracked") return "text-diff-add"
  if (status === "deleted") return "text-diff-delete"
  return "text-warning"
}


export function parseDiff(raw: string): { before: string; after: string } {
  const lines = raw.split("\n")
  const before: string[] = []
  const after: string[] = []
  let started = false

  for (const line of lines) {
    if (line.startsWith("@@")) {
      started = true
      continue
    }
    if (!started) continue
    if (line.startsWith("-")) {
      before.push(line.slice(1))
      continue
    }
    if (line.startsWith("+")) {
      after.push(line.slice(1))
      continue
    }
    const text = line.startsWith(" ") ? line.slice(1) : line
    before.push(text)
    after.push(text)
  }

  return { before: before.join("\n"), after: after.join("\n") }
}


export function commitAction(message: string, staged: GitFile[]): string | null {
  const msg = message.trim()
  if (!msg || staged.length === 0) return null
  return msg
}


export function gitError(op: string, err: unknown): { title: string; description: string } {
  if (err instanceof Error) return { title: `Git ${op} failed`, description: err.message }
  if (typeof err === "string") return { title: `Git ${op} failed`, description: err }
  return { title: `Git ${op} failed`, description: "An unknown error occurred" }
}


export type CommitEntry = {
  hash: string
  author: string
  date: string
  message: string
}

export function parseLog(raw: string): CommitEntry[] {
  if (!raw.trim()) return []
  return raw.trim().split("\n").flatMap((line) => {
    const parts = line.split("\x00")
    if (parts.length < 4) return []
    return [{ hash: parts[0]!, author: parts[1]!, date: parts[2]!, message: parts[3]! }]
  })
}

export function formatLog(entries: CommitEntry[]): string {
  return entries.map((e) => `${e.hash}\x00${e.author}\x00${e.date}\x00${e.message}`).join("\n")
}

export type StashEntry = {
  index: number
  branch: string
  message: string
}

export function parseStash(raw: string): StashEntry[] {
  if (!raw.trim()) return []
  return raw.trim().split("\n").flatMap((line) => {
    const match = line.match(/^stash@\{(\d+)\}: (?:WIP on|On) ([^:]+): (.+)$/)
    if (!match) return []
    return [{ index: Number(match[1]), branch: match[2]!, message: match[3]! }]
  })
}

export function formatStash(entries: StashEntry[]): string {
  return entries.map((e) => `stash@{${e.index}}: On ${e.branch}: ${e.message}`).join("\n")
}


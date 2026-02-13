import { describe, test, expect } from "bun:test"
import { parseStatus, parseBranches, createGitState, label, color, parseDiff, commitAction, gitError } from "./git-explorer-helpers"

describe("parseStatus", () => {
  test("parses modified staged file", () => {
    const result = parseStatus("M  src/app.ts")
    expect(result.staged).toEqual([{ path: "src/app.ts", status: "modified", staged: true }])
    expect(result.unstaged).toEqual([])
  })

  test("parses modified unstaged file", () => {
    const result = parseStatus(" M src/app.ts")
    expect(result.staged).toEqual([])
    expect(result.unstaged).toEqual([{ path: "src/app.ts", status: "modified", staged: false }])
  })

  test("parses untracked file", () => {
    const result = parseStatus("?? new-file.ts")
    expect(result.staged).toEqual([])
    expect(result.unstaged).toEqual([{ path: "new-file.ts", status: "untracked", staged: false }])
  })

  test("parses added staged file", () => {
    const result = parseStatus("A  src/new.ts")
    expect(result.staged).toEqual([{ path: "src/new.ts", status: "added", staged: true }])
  })

  test("parses deleted staged file", () => {
    const result = parseStatus("D  old.ts")
    expect(result.staged).toEqual([{ path: "old.ts", status: "deleted", staged: true }])
  })

  test("parses renamed file", () => {
    const result = parseStatus("R  old.ts -> new.ts")
    expect(result.staged).toEqual([{ path: "new.ts", status: "renamed", staged: true }])
  })

  test("parses mixed staged and unstaged", () => {
    const result = parseStatus("MM src/app.ts")
    expect(result.staged).toHaveLength(1)
    expect(result.unstaged).toHaveLength(1)
    expect(result.staged[0]!.staged).toBe(true)
    expect(result.unstaged[0]!.staged).toBe(false)
  })

  test("handles multiple files", () => {
    const raw = `M  src/a.ts
 M src/b.ts
?? src/c.ts`
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(1)
    expect(result.unstaged).toHaveLength(2)
  })

  test("returns empty for empty input", () => {
    const result = parseStatus("")
    expect(result.staged).toEqual([])
    expect(result.unstaged).toEqual([])
  })
})

describe("parseBranches", () => {
  test("parses current branch", () => {
    const result = parseBranches("* main\n  dev\n  feature")
    expect(result.current).toBe("main")
    expect(result.branches).toHaveLength(3)
    expect(result.branches[0]).toEqual({ name: "main", current: true })
  })

  test("parses non-current branches", () => {
    const result = parseBranches("* main\n  dev")
    expect(result.branches[1]).toEqual({ name: "dev", current: false })
  })

  test("handles detached HEAD", () => {
    const result = parseBranches("* (HEAD detached at abc123)\n  main")
    expect(result.current).toBe("abc123")
  })

  test("handles empty input", () => {
    const result = parseBranches("")
    expect(result.current).toBe("")
    expect(result.branches).toEqual([])
  })
})

describe("createGitState", () => {
  test("combines status and branch output", () => {
    const state = createGitState("M  src/a.ts\n?? b.ts", "* main\n  dev")
    expect(state.branch).toBe("main")
    expect(state.branches).toHaveLength(2)
    expect(state.staged).toHaveLength(1)
    expect(state.unstaged).toHaveLength(1)
  })

  test("returns empty state for empty inputs", () => {
    const state = createGitState("", "")
    expect(state.branch).toBe("")
    expect(state.branches).toEqual([])
    expect(state.staged).toEqual([])
    expect(state.unstaged).toEqual([])
  })
})

describe("label", () => {
  test("returns correct labels", () => {
    expect(label("modified")).toBe("M")
    expect(label("added")).toBe("A")
    expect(label("deleted")).toBe("D")
    expect(label("renamed")).toBe("R")
    expect(label("untracked")).toBe("U")
  })
})

describe("color", () => {
  test("returns add color for added and untracked", () => {
    expect(color("added")).toBe("var(--icon-diff-add-base)")
    expect(color("untracked")).toBe("var(--icon-diff-add-base)")
  })

  test("returns delete color for deleted", () => {
    expect(color("deleted")).toBe("var(--icon-diff-delete-base)")
  })

  test("returns warning color for modified and renamed", () => {
    expect(color("modified")).toBe("var(--icon-warning-active)")
    expect(color("renamed")).toBe("var(--icon-warning-active)")
  })
})

describe("parseDiff", () => {
  test("parses unified diff into before and after", () => {
    const raw = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 line one
-old line
+new line
 line three`
    const result = parseDiff(raw)
    expect(result.before).toBe("line one\nold line\nline three")
    expect(result.after).toBe("line one\nnew line\nline three")
  })

  test("handles added file", () => {
    const raw = `diff --git a/new.ts b/new.ts
new file mode 100644
--- /dev/null
+++ b/new.ts
@@ -0,0 +1,2 @@
+first
+second`
    const result = parseDiff(raw)
    expect(result.before).toBe("")
    expect(result.after).toBe("first\nsecond")
  })

  test("handles deleted file", () => {
    const raw = `diff --git a/old.ts b/old.ts
deleted file mode 100644
--- a/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-first
-second`
    const result = parseDiff(raw)
    expect(result.before).toBe("first\nsecond")
    expect(result.after).toBe("")
  })

  test("handles multiple hunks", () => {
    const raw = `diff --git a/file.ts b/file.ts
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 a
-b
+B
 c
@@ -10,3 +10,3 @@
 x
-y
+Y
 z`
    const result = parseDiff(raw)
    expect(result.before).toBe("a\nb\nc\nx\ny\nz")
    expect(result.after).toBe("a\nB\nc\nx\nY\nz")
  })

  test("returns empty for empty input", () => {
    const result = parseDiff("")
    expect(result.before).toBe("")
    expect(result.after).toBe("")
  })
})



describe("commitAction", () => {
  const staged = [{ path: "src/a.ts", status: "modified" as const, staged: true }]

  test("returns trimmed message when staged is non-empty", () => {
    expect(commitAction("  fix bug  ", staged)).toBe("fix bug")
  })

  test("returns null when message is empty", () => {
    expect(commitAction("", staged)).toBe(null)
  })

  test("returns null when message is whitespace only", () => {
    expect(commitAction("   ", staged)).toBe(null)
  })

  test("returns null when staged is empty", () => {
    expect(commitAction("fix bug", [])).toBe(null)
  })

  test("returns null when both message is empty and staged is empty", () => {
    expect(commitAction("", [])).toBe(null)
  })
})

describe("gitError", () => {
  test("formats Error instance", () => {
    const result = gitError("commit", new Error("nothing to commit"))
    expect(result.title).toBe("Git commit failed")
    expect(result.description).toBe("nothing to commit")
  })

  test("formats string error", () => {
    const result = gitError("push", "rejected by remote")
    expect(result.title).toBe("Git push failed")
    expect(result.description).toBe("rejected by remote")
  })

  test("formats unknown error", () => {
    const result = gitError("stage", 42)
    expect(result.title).toBe("Git stage failed")
    expect(result.description).toBe("An unknown error occurred")
  })

  test("formats null error", () => {
    const result = gitError("branch switch", null)
    expect(result.title).toBe("Git branch switch failed")
    expect(result.description).toBe("An unknown error occurred")
  })

  test("formats undefined error", () => {
    const result = gitError("pull", undefined)
    expect(result.title).toBe("Git pull failed")
    expect(result.description).toBe("An unknown error occurred")
  })
})

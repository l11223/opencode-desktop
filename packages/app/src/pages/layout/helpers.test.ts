import { describe, expect, test } from "bun:test"
import { relativeTime, sortSessions, filterSessions, archivedRootSessions } from "./helpers"
import type { Session } from "@opencode-ai/sdk/v2/client"

const session = (id: string, title: string, dir: string, opts?: { archived?: number; parentID?: string }): Session =>
  ({
    id,
    title,
    directory: dir,
    parentID: opts?.parentID,
    time: { created: 1000, updated: 2000, archived: opts?.archived },
  }) as Session

describe("relativeTime", () => {
  const now = 1_700_000_000_000

  test("returns 'now' for timestamps less than 60s ago", () => {
    expect(relativeTime(now, now)).toBe("now")
    expect(relativeTime(now - 30_000, now)).toBe("now")
    expect(relativeTime(now - 59_000, now)).toBe("now")
  })

  test("returns 'now' for future timestamps", () => {
    expect(relativeTime(now + 10_000, now)).toBe("now")
  })

  test("returns minutes", () => {
    expect(relativeTime(now - 60_000, now)).toBe("1m")
    expect(relativeTime(now - 5 * 60_000, now)).toBe("5m")
    expect(relativeTime(now - 59 * 60_000, now)).toBe("59m")
  })

  test("returns hours", () => {
    expect(relativeTime(now - 60 * 60_000, now)).toBe("1h")
    expect(relativeTime(now - 23 * 60 * 60_000, now)).toBe("23h")
  })

  test("returns days", () => {
    expect(relativeTime(now - 24 * 60 * 60_000, now)).toBe("1d")
    expect(relativeTime(now - 29 * 24 * 60 * 60_000, now)).toBe("29d")
  })

  test("returns months", () => {
    expect(relativeTime(now - 30 * 24 * 60 * 60_000, now)).toBe("1mo")
    expect(relativeTime(now - 11 * 30 * 24 * 60 * 60_000, now)).toBe("11mo")
  })

  test("returns years", () => {
    expect(relativeTime(now - 365 * 24 * 60 * 60_000, now)).toBe("1y")
    expect(relativeTime(now - 2 * 365 * 24 * 60 * 60_000, now)).toBe("2y")
  })
})

describe("filterSessions", () => {
  const s1 = session("1", "fix login bug", "/proj")
  const s2 = session("2", "add tests", "/proj")
  const archived1 = session("3", "old login refactor", "/proj", { archived: 999 })

  test("returns all sessions with no highlights when query is empty", () => {
    const result = filterSessions("", [s1, s2])
    expect(result.length).toBe(2)
    expect(result[0].highlighted).toBeUndefined()
  })

  test("filters by fuzzy match on title", () => {
    const result = filterSessions("login", [s1, s2])
    expect(result.length).toBe(1)
    expect(result[0].session.id).toBe("1")
    expect(result[0].highlighted).toBeDefined()
  })

  test("includes archived sessions in search when provided", () => {
    const result = filterSessions("login", [s1, s2], [archived1])
    expect(result.length).toBe(2)
    const ids = result.map((r) => r.session.id)
    expect(ids).toContain("1")
    expect(ids).toContain("3")
  })

  test("does not include archived sessions when query is empty", () => {
    const result = filterSessions("", [s1, s2], [archived1])
    expect(result.length).toBe(2)
    const ids = result.map((r) => r.session.id)
    expect(ids).not.toContain("3")
  })

  test("returns empty when no matches", () => {
    const result = filterSessions("zzzzz", [s1, s2], [archived1])
    expect(result.length).toBe(0)
  })
})

describe("archivedRootSessions", () => {
  test("returns only archived root sessions for the directory", () => {
    const s1 = session("1", "active", "/proj")
    const s2 = session("2", "archived", "/proj", { archived: 999 })
    const s3 = session("3", "other dir", "/other", { archived: 999 })
    const s4 = session("4", "child archived", "/proj", { archived: 999, parentID: "1" })

    const result = archivedRootSessions({ session: [s1, s2, s3, s4], path: { directory: "/proj" } })
    expect(result.length).toBe(1)
    expect(result[0].id).toBe("2")
  })

  test("returns empty when no archived sessions", () => {
    const s1 = session("1", "active", "/proj")
    const result = archivedRootSessions({ session: [s1], path: { directory: "/proj" } })
    expect(result.length).toBe(0)
  })
})

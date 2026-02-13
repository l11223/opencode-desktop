import { describe, expect, test } from "bun:test"
import { backoff, deriveTerminalColors, DEFAULT_TERMINAL_COLORS } from "./terminal"
import { oc1Theme, draculaTheme } from "@opencode-ai/ui/theme"

describe("backoff", () => {
  test("returns 1s for first attempt", () => {
    expect(backoff(1)).toBe(1000)
  })

  test("doubles each attempt", () => {
    expect(backoff(2)).toBe(2000)
    expect(backoff(3)).toBe(4000)
    expect(backoff(4)).toBe(8000)
  })

  test("caps at 16s", () => {
    expect(backoff(5)).toBe(16000)
    expect(backoff(6)).toBe(16000)
    expect(backoff(100)).toBe(16000)
  })
})

describe("deriveTerminalColors", () => {
  test("returns fallback colors when no theme provided", () => {
    expect(deriveTerminalColors("dark")).toEqual(DEFAULT_TERMINAL_COLORS.dark)
    expect(deriveTerminalColors("light")).toEqual(DEFAULT_TERMINAL_COLORS.light)
  })

  test("returns fallback colors when theme has no seeds", () => {
    const broken = { light: {}, dark: {} }
    expect(deriveTerminalColors("dark", broken)).toEqual(DEFAULT_TERMINAL_COLORS.dark)
    expect(deriveTerminalColors("light", broken)).toEqual(DEFAULT_TERMINAL_COLORS.light)
  })

  test("derives colors from a real theme in dark mode", () => {
    const colors = deriveTerminalColors("dark", oc1Theme)
    expect(colors.background).toBeString()
    expect(colors.foreground).toBeString()
    expect(colors.cursor).toBe(colors.foreground)
    expect(colors.selectionBackground).toContain("rgba(")
  })

  test("derives colors from a real theme in light mode", () => {
    const colors = deriveTerminalColors("light", oc1Theme)
    expect(colors.background).toBeString()
    expect(colors.foreground).toBeString()
    expect(colors.cursor).toBe(colors.foreground)
    expect(colors.selectionBackground).toContain("rgba(")
  })

  test("foreground and cursor are always the same", () => {
    for (const mode of ["light", "dark"] as const) {
      const colors = deriveTerminalColors(mode, oc1Theme)
      expect(colors.cursor).toBe(colors.foreground)
    }
  })

  test("dark mode uses 0.25 alpha, light mode uses 0.2 alpha", () => {
    const dark = deriveTerminalColors("dark", oc1Theme)
    const light = deriveTerminalColors("light", oc1Theme)
    expect(dark.selectionBackground).toContain("0.25)")
    expect(light.selectionBackground).toContain("0.2)")
  })

  test("different themes produce different colors", () => {
    const oc1 = deriveTerminalColors("dark", oc1Theme)
    const dracula = deriveTerminalColors("dark", draculaTheme)
    expect(oc1.foreground).not.toBe(dracula.foreground)
  })
})

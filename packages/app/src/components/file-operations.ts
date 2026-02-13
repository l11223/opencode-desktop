import { getDirectory } from "@opencode-ai/util/path"

type Exec = (cmd: string[], cwd?: string) => Promise<void>

export function createFileOperations(exec: Exec) {
  return {
    create(input: { dir: string; name: string; type: "file" | "directory" }) {
      const path = `${input.dir}/${input.name}`
      const cmd = input.type === "directory" ? ["mkdir", "-p", path] : ["touch", path]
      return exec(cmd, input.dir)
    },
    remove(input: { path: string }) {
      return exec(["rm", "-rf", input.path])
    },
    rename(input: { oldPath: string; newName: string }) {
      const dir = getDirectory(input.oldPath) || "."
      return exec(["mv", input.oldPath, `${dir}/${input.newName}`], dir)
    },
  }
}

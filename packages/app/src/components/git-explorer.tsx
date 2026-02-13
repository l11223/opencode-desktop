import { Show, For, createSignal, onCleanup } from "solid-js"
import { Dynamic } from "solid-js/web"
import { createMediaQuery } from "@solid-primitives/media"
import { Icon } from "@opencode-ai/ui/icon"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { Spinner } from "@opencode-ai/ui/spinner"
import { Collapsible } from "@opencode-ai/ui/collapsible"
import { Select } from "@opencode-ai/ui/select"
import { Tabs } from "@opencode-ai/ui/tabs"
import { useDiffComponent } from "@opencode-ai/ui/context/diff"
import { getFilename } from "@opencode-ai/util/path"
import type { GitFile, GitBranch, GitState, CommitEntry, StashEntry } from "./git-explorer-helpers"
import { label, colorClass, commitAction } from "./git-explorer-helpers"

export function GitExplorer(props: {
  state: GitState
  diff?: { file: string; before: string; after: string }
  onFileClick?: (file: GitFile) => void
  onStage?: (file: GitFile) => void
  onUnstage?: (file: GitFile) => void
  onStageAll?: () => void
  onUnstageAll?: () => void
  onCommit?: (message: string) => void
  onBranchSwitch?: (branch: string) => void
  onFocusReviewDiff?: (path: string) => void
  onError?: (op: string, error: unknown) => void
  log?: CommitEntry[]
  onLoadLog?: (offset: number) => void
  onCommitClick?: (hash: string) => void
  commitDiff?: { hash: string; before: string; after: string }
  stashes?: StashEntry[]
  onStashSave?: (message: string) => void
  onStashPop?: () => void
  onStashDrop?: (index: number) => void
  onLoadStashes?: () => void
  diffStyle?: "unified" | "split"
  onDiffStyleChange?: (style: "unified" | "split") => void
}) {
  const diffComponent = useDiffComponent()
  const touch = createMediaQuery("(hover: none)")
  const [selected, setSelected] = createSignal<string | null>(null)
  const [message, setMessage] = createSignal("")
  const [style, setStyle] = createSignal<"unified" | "split">(props.diffStyle ?? "unified")
  const [tab, setTab] = createSignal("changes")
  const [commit, setCommit] = createSignal<string | null>(null)

  const active = () => props.diffStyle ?? style()

  const toggle = (s: "unified" | "split") => {
    setStyle(s)
    props.onDiffStyleChange?.(s)
  }

  const select = (file: GitFile) => {
    setCommit(null)
    setSelected(file.path)
    props.onFileClick?.(file)
    props.onFocusReviewDiff?.(file.path)
  }

  const close = () => {
    setSelected(null)
    setCommit(null)
  }

  const doCommit = () => {
    const msg = commitAction(message(), props.state.staged)
    if (!msg) return
    props.onCommit?.(msg)
    setMessage("")
  }

  const selectCommit = (hash: string) => {
    setSelected(null)
    setCommit(hash)
    props.onCommitClick?.(hash)
  }

  const showing = () => selected() || commit()
  const diffData = () => {
    if (commit()) return props.commitDiff
    return props.diff
  }
  const diffPath = () => {
    if (commit() && props.commitDiff) return props.commitDiff.hash
    return selected()
  }

  return (
    <div class="flex h-full overflow-hidden">
      <div class="flex flex-col shrink-0 overflow-y-auto no-scrollbar" classList={{ "w-full": !showing(), "w-64 border-r border-border-base": !!showing() }}>
        <div class="flex items-center gap-2 px-3 py-2 border-b border-border-base">
          <Icon name="branch" size="small" class="text-icon-weak" />
          <Select
            options={props.state.branches}
            current={props.state.branches.find((b) => b.current)}
            value={(b: GitBranch) => b.name}
            label={(b: GitBranch) => b.name}
            onSelect={(b) => b && !b.current && props.onBranchSwitch?.(b.name)}
            placeholder={props.state.branch || "unknown"}
            size="small"
            variant="ghost"
          />
        </div>

        <Tabs value={tab()} onChange={setTab} class="flex flex-col flex-1 min-h-0">
          <Tabs.List class="shrink-0 px-1">
            <Tabs.Trigger value="changes">Changes</Tabs.Trigger>
            <Tabs.Trigger value="log">Log</Tabs.Trigger>
            <Tabs.Trigger value="stash">Stash</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="changes" class="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <div class="flex flex-col gap-1.5 px-3 py-2 border-b border-border-base bg-surface-base shadow-xs">
              <input
                type="text"
                class="w-full h-7 px-2 rounded-md border border-border-base bg-surface-base text-12-regular text-text-strong placeholder:text-text-weaker outline-none focus:border-border-active"
                placeholder="Commit message"
                value={message()}
                onInput={(e) => setMessage(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doCommit() }}
              />
              <button
                type="button"
                class="w-full h-7 rounded-md text-12-medium transition-colors"
                classList={{
                  "bg-button-primary-base text-text-on-primary cursor-pointer hover:bg-button-primary-hover": message().trim().length > 0 && props.state.staged.length > 0,
                  "bg-surface-raised-base text-text-weaker cursor-not-allowed": message().trim().length === 0 || props.state.staged.length === 0,
                }}
                disabled={message().trim().length === 0 || props.state.staged.length === 0}
                onClick={doCommit}
              >
                Commit
              </button>
            </div>

            <Collapsible open={true} variant="ghost" class="w-full">
              <Collapsible.Trigger>
                <div class="flex items-center gap-2 px-3 py-2">
                  <span class="text-12-medium text-text-weak">Staged Changes</span>
                  <Show when={props.state.staged.length > 0}>
                    <span class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-surface-raised-base-hover text-11-medium text-text-strong">
                      {props.state.staged.length}
                    </span>
                  </Show>
                  <Show when={props.state.staged.length > 0}>
                    <button
                      type="button"
                      class="ml-auto p-0.5 rounded-md hover:bg-surface-raised-base-hover text-icon-weak"
                      title="Unstage All"
                      onClick={(e) => { e.stopPropagation(); props.onUnstageAll?.() }}
                    >
                      <Icon name="dash" size="small" />
                    </button>
                  </Show>
                </div>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <FileList
                  files={props.state.staged}
                  selected={selected()}
                  touch={touch()}
                  onFileClick={select}
                  onAction={props.onUnstage}
                  action="unstage"
                />
              </Collapsible.Content>
            </Collapsible>

            <Collapsible open={true} variant="ghost" class="w-full">
              <Collapsible.Trigger>
                <div class="flex items-center gap-2 px-3 py-2">
                  <span class="text-12-medium text-text-weak">Changes</span>
                  <Show when={props.state.unstaged.length > 0}>
                    <button
                      type="button"
                      class="ml-auto p-0.5 rounded-md hover:bg-surface-raised-base-hover text-icon-weak"
                      title="Stage All"
                      onClick={(e) => { e.stopPropagation(); props.onStageAll?.() }}
                    >
                      <Icon name="plus" size="small" />
                    </button>
                  </Show>
                </div>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <FileList
                  files={props.state.unstaged}
                  selected={selected()}
                  touch={touch()}
                  onFileClick={select}
                  onAction={props.onStage}
                  action="stage"
                />
              </Collapsible.Content>
            </Collapsible>

            <Show when={props.state.staged.length === 0 && props.state.unstaged.length === 0}>
              <div class="flex-1 flex flex-col items-center justify-center gap-2">
                <Icon name="branch" class="size-8 text-icon-weaker" />
                <span class="text-14-regular text-text-weaker">No changes</span>
              </div>
            </Show>
          </Tabs.Content>

          <Tabs.Content value="log" class="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <CommitLog
              log={props.log ?? []}
              selected={commit()}
              onCommitClick={selectCommit}
              onLoadMore={props.onLoadLog}
            />
          </Tabs.Content>

          <Tabs.Content value="stash" class="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <StashList
              stashes={props.stashes ?? []}
              onPop={props.onStashPop}
              onDrop={props.onStashDrop}
              onSave={props.onStashSave}
            />
          </Tabs.Content>
        </Tabs>
      </div>

      <Show when={showing()}>
        <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div class="shrink-0 h-10 flex items-center gap-2 px-4 border-b border-border-base">
            <Show when={selected()}>
              {(path: () => string) => (
                <>
                  <FileIcon node={{ path: path(), type: "file" }} class="text-icon-weak size-4" />
                  <span class="text-12-medium text-text-strong truncate">{getFilename(path())}</span>
                </>
              )}
            </Show>
            <Show when={commit() && !selected()}>
              <Icon name="branch" size="small" class="text-icon-weak" />
              <span class="text-12-medium text-text-strong truncate">{commit()}</span>
            </Show>
            <div class="ml-auto flex items-center gap-1">
              <button
                type="button"
                class="p-1 rounded-md transition-colors"
                classList={{
                  "bg-surface-raised-base-hover text-text-strong": active() === "unified",
                  "hover:bg-surface-raised-base-hover text-icon-weak": active() !== "unified",
                }}
                title="Unified diff"
                onClick={() => toggle("unified")}
              >
                <Icon name="menu" size="small" />
              </button>
              <button
                type="button"
                class="p-1 rounded-md transition-colors"
                classList={{
                  "bg-surface-raised-base-hover text-text-strong": active() === "split",
                  "hover:bg-surface-raised-base-hover text-icon-weak": active() !== "split",
                }}
                title="Split diff"
                onClick={() => toggle("split")}
              >
                <Icon name="task" size="small" />
              </button>
              <button
                type="button"
                class="p-1 rounded-md hover:bg-surface-raised-base-hover text-icon-weak"
                onClick={close}
              >
                <Icon name="close" size="small" />
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-auto thin-scrollbar">
            <Show
              when={diffData()}
              fallback={
                <div class="p-4 flex items-center justify-center"><Spinner /></div>
              }
            >
              {(d) => (
                <Dynamic
                  component={diffComponent}
                  diffStyle={active()}
                  before={{ name: diffPath() ?? "", contents: d().before }}
                  after={{ name: diffPath() ?? "", contents: d().after }}
                />
              )}
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

function CommitLog(props: {
  log: CommitEntry[]
  selected: string | null
  onCommitClick?: (hash: string) => void
  onLoadMore?: (offset: number) => void
}) {
  let sentinel: HTMLDivElement | undefined

  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && props.log.length > 0) {
      props.onLoadMore?.(props.log.length)
    }
  })

  onCleanup(() => observer.disconnect())

  const ref = (el: HTMLDivElement) => {
    sentinel = el
    observer.observe(el)
  }

  return (
    <div class="flex flex-col">
      <Show when={props.log.length === 0}>
        <div class="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <Icon name="branch" class="size-8 text-icon-weaker" />
          <span class="text-14-regular text-text-weaker">No commits</span>
        </div>
      </Show>
      <For each={props.log}>
        {(entry) => (
          <button
            type="button"
            class="w-full text-left px-3 py-2 hover:bg-surface-raised-base-hover transition-colors cursor-pointer border-b border-border-base"
            classList={{ "bg-surface-raised-base-hover": props.selected === entry.hash }}
            onClick={() => props.onCommitClick?.(entry.hash)}
          >
            <div class="flex items-center gap-2">
              <span class="text-12-medium text-text-strong font-mono">{entry.hash}</span>
              <span class="text-12-regular text-text-weak truncate">{entry.author}</span>
              <span class="text-12-regular text-text-weaker ml-auto shrink-0">{entry.date}</span>
            </div>
            <div class="text-12-regular text-text-weak truncate mt-0.5">{entry.message}</div>
          </button>
        )}
      </For>
      <div ref={ref} class="h-1" />
    </div>
  )
}

function StashList(props: {
  stashes: StashEntry[]
  onPop?: () => void
  onDrop?: (index: number) => void
  onSave?: (message: string) => void
}) {
  const [desc, setDesc] = createSignal("")

  const save = () => {
    const msg = desc().trim()
    if (!msg) return
    props.onSave?.(msg)
    setDesc("")
  }

  return (
    <div class="flex flex-col">
      <div class="flex items-center gap-1.5 px-3 py-2 border-b border-border-base">
        <input
          type="text"
          class="flex-1 h-7 px-2 rounded-md border border-border-base bg-surface-base text-12-regular text-text-strong placeholder:text-text-weaker outline-none focus:border-border-active"
          placeholder="Stash description"
          value={desc()}
          onInput={(e) => setDesc(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save() }}
        />
        <button
          type="button"
          class="h-7 px-3 rounded-md text-12-medium transition-colors shrink-0"
          classList={{
            "bg-button-primary-base text-text-on-primary cursor-pointer hover:bg-button-primary-hover": desc().trim().length > 0,
            "bg-surface-raised-base text-text-weaker cursor-not-allowed": desc().trim().length === 0,
          }}
          disabled={desc().trim().length === 0}
          onClick={save}
        >
          Save
        </button>
      </div>

      <Show when={props.stashes.length === 0}>
        <div class="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <Icon name="archive" class="size-8 text-icon-weaker" />
          <span class="text-14-regular text-text-weaker">No stashes</span>
        </div>
      </Show>
      <For each={props.stashes}>
        {(entry, i) => (
          <div class="flex items-center gap-2 px-3 py-2 border-b border-border-base group">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-12-medium text-text-strong font-mono shrink-0">stash@{`{${entry.index}}`}</span>
                <span class="text-12-regular text-text-weak truncate">{entry.branch}</span>
              </div>
              <div class="text-12-regular text-text-weak truncate mt-0.5">{entry.message}</div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <Show when={i() === 0}>
                <button
                  type="button"
                  class="p-1 rounded-md hover:bg-surface-raised-base-hover text-icon-weak"
                  title="Pop"
                  onClick={() => props.onPop?.()}
                >
                  <Icon name="align-right" size="small" />
                </button>
              </Show>
              <button
                type="button"
                class="p-1 rounded-md hover:bg-surface-raised-base-hover text-icon-weak"
                title="Drop"
                onClick={() => props.onDrop?.(entry.index)}
              >
                <Icon name="trash" size="small" />
              </button>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}

function FileList(props: {
  files: GitFile[]
  selected: string | null
  touch: boolean
  onFileClick?: (file: GitFile) => void
  onAction?: (file: GitFile) => void
  action: "stage" | "unstage"
}) {
  return (
    <div class="flex flex-col gap-0.5 px-1">
      <Show when={props.files.length === 0}>
        <div class="px-3 py-1 text-12-regular text-text-weaker">No files</div>
      </Show>
      <For each={props.files}>
        {(file: GitFile) => {
          const name = () => file.path.split("/").pop() ?? file.path
          const dir = () => {
            const idx = file.path.lastIndexOf("/")
            if (idx === -1) return ""
            return file.path.slice(0, idx)
          }

          return (
            <button
              type="button"
              class="w-full min-w-0 h-7 flex items-center gap-1.5 rounded-md px-1.5 text-left hover:bg-surface-raised-base-hover active:bg-surface-base-active transition-colors cursor-pointer group"
              classList={{ "bg-surface-raised-base-hover": props.selected === file.path }}
              onClick={() => props.onFileClick?.(file)}
            >
              <span
                class={`shrink-0 w-4 text-center text-12-medium ${colorClass(file.status)}`}
              >
                {label(file.status)}
              </span>
              <span class="text-12-medium text-text-weak truncate">{name()}</span>
              <Show when={dir()}>
                <span class="text-12-regular text-text-weaker truncate ml-auto">{dir()}</span>
              </Show>
              <span
                role="button"
                tabIndex={0}
                class="shrink-0 items-center justify-center size-4 rounded hover:bg-surface-raised-base-hover text-icon-weak ml-auto"
                classList={{
                  "inline-flex": props.touch,
                  "hidden group-hover:inline-flex": !props.touch,
                }}
                title={props.action === "stage" ? "Stage" : "Unstage"}
                onClick={(e) => { e.stopPropagation(); props.onAction?.(file) }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); props.onAction?.(file) } }}
              >
                <Icon name={props.action === "stage" ? "plus" : "dash"} size="small" />
              </span>
            </button>
          )
        }}
      </For>
    </div>
  )
}

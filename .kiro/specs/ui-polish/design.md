# 设计文档：UI Visual Polish Pass

## 概述

本设计对 opencode 桌面应用进行纯视觉层面的打磨，不涉及新功能开发。所有改动集中在 CSS 样式、组件模板微调、设计令牌统一三个方面。改动范围覆盖 `packages/app`（SolidJS Web UI）和 `packages/ui`（共享组件库）。

核心原则：
- 仅修改样式和模板，不改变业务逻辑
- 复用现有设计令牌和组件（Spinner、Icon、ResizeHandle 等）
- 增量改动，确保现有 267 个测试全部通过

## 架构

本次打磨不改变应用架构。所有改动分为三层：

```
┌─────────────────────────────────────────┐
│  Layer 1: 全局 CSS（index.css）          │
│  - 过渡规则作用域收窄                     │
│  - 滚动条样式                            │
│  - 按钮按压反馈                          │
│  - 流畅度优化（will-change、合成属性）     │
├─────────────────────────────────────────┤
│  Layer 2: 组件模板微调（.tsx）            │
│  - File Explorer 空状态/Spinner/按钮令牌  │
│  - Git Explorer 行高/状态类/触摸适配      │
│  - Terminal 错误覆盖层卡片化              │
├─────────────────────────────────────────┤
│  Layer 3: 设计令牌扩展（.css）            │
│  - Git 状态语义色 CSS 类                  │
│  - resize-handle 视觉指示器增强           │
│  - 空状态统一样式                         │
└─────────────────────────────────────────┘
```

## 组件与接口

### 1. 全局 CSS 改动（packages/app/src/index.css）

**过渡规则收窄**：当前 `*` 通配符对所有元素应用 200ms 颜色过渡，导致性能问题和非预期动画。改为仅对交互元素生效：

```css
/* 替换现有 * 通配符规则 */
button,
input,
select,
textarea,
a,
[role="button"],
[role="tab"],
[data-component="collapsible-trigger"],
[data-component="context-menu-item"] {
  transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease;
}
```

**按钮按压反馈**：

```css
button:active:not(:disabled),
[role="button"]:active:not(:disabled) {
  transform: scale(0.98);
}
```

**滚动条样式**：新增 `thin-scrollbar` 工具类，对非 `no-scrollbar` 面板生效：

```css
/* 自定义细滚动条 — 悬停时显示 */
.thin-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.thin-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.thin-scrollbar::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
  transition: background 150ms ease;
}
.thin-scrollbar:hover::-webkit-scrollbar-thumb {
  background: var(--surface-raised-base-hover);
}
```

**流畅度优化**：

```css
/* GPU 加速提示 */
[data-panel],
[data-component="dialog-overlay"] {
  will-change: opacity;
}

button:active:not(:disabled),
[role="button"]:active:not(:disabled) {
  will-change: transform;
}

/* 长列表离屏优化 */
[data-component="file-tree-node"],
[data-component="session-item"] {
  content-visibility: auto;
  contain-intrinsic-size: auto 32px;
}
```

### 2. File Explorer 改动（packages/app/src/components/file-explorer.tsx）

**树面板可调宽度**：将硬编码 `w-64` 替换为 `ResizeHandle` 组件 + 信号驱动宽度。最小宽度 180px，最大 400px。

```tsx
// 新增信号
const [width, setWidth] = createSignal(256)

// 树面板 div
<div style={{ width: `${width()}px` }} class="shrink-0 border-r border-border-base overflow-y-auto thin-scrollbar">

// 在树面板和预览面板之间插入 ResizeHandle
<ResizeHandle direction="horizontal" edge="end" size={width()} min={180} max={400} onResize={setWidth} />
```

**空状态增强**：用 Icon + 提示文字替代纯文本：

```tsx
<div class="flex-1 flex flex-col items-center justify-center gap-2">
  <Icon name="file" class="size-8 text-icon-weaker" />
  <span class="text-14-regular text-text-weaker">Select a file to preview</span>
</div>
```

**"Add to chat" 按钮语义化**：从 `bg-surface-raised-base-hover` 改为 `bg-button-primary-base text-text-on-primary hover:bg-button-primary-hover`。

**文件预览头部栏背景**：添加 `bg-surface-base`。

**Loading 状态用 Spinner**：替换 `"Loading..."` 文本为 `<Spinner />` 组件（已在 file-tree.tsx 中使用）。

**重试按钮统一样式**：添加 `shadow-interactive rounded-interactive`。

### 3. Git Explorer 改动（packages/app/src/components/git-explorer.tsx）

**提交区域视觉层次**：为提交区域 div 添加 `bg-surface-base` 背景和更明确的间距。

**文件列表项行高**：从 `h-6`（24px）改为 `h-7`（28px）。

**状态指示器语义化**：在 `git-explorer-helpers.ts` 中新增 `colorClass` 函数返回 CSS 类名，替代内联 `style={{ color }}`：

```ts
export function colorClass(status: GitFile["status"]): string {
  if (status === "added" || status === "untracked") return "text-diff-add"
  if (status === "deleted") return "text-diff-delete"
  return "text-warning"
}
```

需要在 tailwind 主题中注册对应的语义色类，映射到现有 CSS 变量 `--icon-diff-add-base`、`--icon-diff-delete-base`、`--icon-warning-active`。

**触摸设备适配**：使用 `createMediaQuery("(hover: none)")` 检测触摸设备，始终显示操作按钮：

```tsx
// 替换 hidden group-hover:inline-flex
classList={{
  "inline-flex": touch(),
  "hidden group-hover:inline-flex": !touch()
}}
```

**Diff 加载 Spinner**：替换 `"Loading diff..."` 为 `<Spinner />`。

**空状态**：当 staged + unstaged 均为空时，显示统一空状态组件。

**折叠标题增强**：`py-1.5` → `py-2`，保持 `text-12-medium`。

### 4. Terminal 错误覆盖层（packages/app/src/components/terminal.tsx）

**卡片化样式**：将错误覆盖层内容区域包裹在卡片容器中：

```tsx
<div class="absolute inset-0 flex items-center justify-center bg-background-base/80 z-10 animate-fade-in">
  <div class="flex flex-col items-center gap-3 px-6 py-5 rounded-card bg-surface-raised-base shadow-panel">
    <p class="text-14-regular text-text-weak text-center">{msg()}</p>
    <Show when={retries >= RECONNECT_MAX_RETRIES}>
      <button class="px-3 py-1.5 rounded-interactive bg-button-secondary-base text-14-regular text-text-base shadow-interactive hover:bg-button-secondary-hover cursor-pointer">
        {language.t("terminal.retry")}
      </button>
    </Show>
  </div>
</div>
```

**fade-in 动画**：复用已定义的 `fade-in` keyframe，添加 `animate-fade-in` 类。

### 5. 侧边栏会话项（packages/app/src/pages/layout/sidebar-workspace.tsx）

**归档图标区分**：对已归档会话行添加 `opacity-70`，归档图标使用 `text-icon-weaker`。

**搜索高亮样式**：为 `<mark>` 标签添加样式：

```css
mark {
  background-color: color-mix(in oklch, var(--surface-warning-base) 40%, transparent);
  border-radius: var(--radius-sm);
  color: inherit;
}
```

### 6. 侧面板标签栏（packages/app/src/pages/session/session-side-panel.tsx）

**标签栏分隔线**：Tabs.List 容器添加 `border-b border-border-base`。

**pill 标签增强**：pill 变体的 Tabs.Trigger 已有样式，通过 CSS 增加 `px-3 py-1` 内边距。

**resize-handle 视觉指示器**：在 `resize-handle.css` 中为 `::after` 伪元素添加背景色：

```css
&::after {
  background-color: var(--border-base);
}
&:hover::after {
  background-color: var(--border-active);
}
```

### 7. 空状态统一

所有空状态使用统一模式：

```tsx
<div class="flex-1 flex flex-col items-center justify-center gap-2">
  <Icon name={iconName} class="size-8 text-icon-weaker" />
  <span class="text-14-regular text-text-weaker">{message}</span>
</div>
```

各面板对应图标：
- File Explorer: `"file"`
- Git Explorer: `"branch"`
- 会话列表: 已有 `<Mark>` logo 组件

### 8. 流畅度系统优化

**仅使用可合成属性动画**：审查所有 CSS transition，确保仅使用 `transform`、`opacity`。现有 `[data-panel]` 的 `width` 过渡改为使用 `transform: scaleX()` 或保留但添加 `will-change: width`。

**requestAnimationFrame 节流**：ResizeHandle 的 `onMouseMove` 回调已在每次 mousemove 事件中直接调用 `onResize`。添加 rAF 节流：

```ts
// 在 ResizeHandle 的 onMouseMove 中
let raf: number | undefined
const onMouseMove = (e: MouseEvent) => {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = undefined
    // 计算并调用 onResize
  })
}
```

**主题切换优化**：现有 `color-scheme` 已通过 ThemeProvider 设置。确保 CSS 变量切换时使用 `transition` 而非逐元素重绘（当前实现已满足）。

## 数据模型

本次打磨不引入新的数据模型。唯一的状态变化是 File Explorer 树面板宽度信号：

```ts
// file-explorer.tsx 内部信号
const [width, setWidth] = createSignal(256)
```

Git 状态指示器的 `colorClass` 函数是纯映射，无状态：

```ts
// git-explorer-helpers.ts
export function colorClass(status: GitFile["status"]): string
```



## 正确性属性

*属性是一种在系统所有有效执行中都应成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范与机器可验证正确性保证之间的桥梁。*

本次打磨以 CSS/样式改动为主，大部分验收标准属于纯视觉要求，不可通过自动化属性测试验证。经过逐条分析，仅有一个功能性映射适合属性测试：

### Property 1: Git 状态到 CSS 类的映射完整性

*For any* 有效的 GitFile status 值（"modified"、"added"、"deleted"、"untracked"、"renamed"），`colorClass` 函数应返回一个非空字符串，且该字符串属于预定义的 CSS 类集合（"text-diff-add"、"text-diff-delete"、"text-warning"）。

**Validates: Requirements 2.3**

## 错误处理

本次打磨不引入新的错误处理逻辑。所有改动均为样式层面：

- **终端错误覆盖层**：仅改变现有错误状态的视觉呈现（卡片化），不改变错误检测和重连逻辑
- **文件加载失败**：仅将重试按钮样式统一，不改变错误捕获和重试机制
- **Git 操作错误**：不涉及改动

## 测试策略

### 属性测试（Property-Based Testing）

使用 `fast-check` 库，每个属性测试至少运行 100 次迭代。

唯一的属性测试：
- **Feature: ui-polish, Property 1: Git 状态到 CSS 类的映射完整性**
- 生成随机的 GitFile status 值，验证 `colorClass` 返回值属于预定义集合

### 单元测试

使用 `bun:test` 运行，重点覆盖：

- `colorClass` 函数：验证每种 status 的返回值
- `backoff` 函数：已有测试，确保不被破坏
- `parseStatus` / `parseBranches`：已有测试，确保不被破坏

### 视觉回归验证

由于大部分改动为 CSS 样式，自动化测试覆盖有限。建议：
- 运行现有 267 个测试确保无功能回归
- 手动检查各面板在明暗主题下的视觉效果
- 手动检查触摸设备模拟下的按钮可见性

### 测试配置

```ts
import fc from "fast-check"

// 属性测试默认配置
const config = { numRuns: 100 }
```

测试文件放置在对应源文件旁边，遵循现有约定（如 `git-explorer-helpers.test.ts`）。

# 实现计划：UI Visual Polish Pass

## 概述

纯视觉打磨，按全局 CSS → 组件模板微调 → 设计令牌扩展的顺序推进。所有改动不涉及业务逻辑，确保现有 267 个测试全部通过。

## Tasks

- [x] 1. 全局 CSS 与流畅度优化
  - [x] 1.1 修改 `packages/app/src/index.css`：将 `*` 通配符过渡规则收窄为仅对交互元素（button、input、select、textarea、a、[role="button"]、[role="tab"]）生效
    - 删除现有 `*,*::before,*::after` 过渡规则
    - 替换为限定选择器的过渡规则
    - _Requirements: 5.1_
  - [x] 1.2 在 `packages/app/src/index.css` 中添加按钮按压反馈：`button:active:not(:disabled)` 和 `[role="button"]:active:not(:disabled)` 应用 `transform: scale(0.98)`
    - _Requirements: 5.4_
  - [x] 1.3 在 `packages/app/src/index.css` 中添加自定义细滚动条样式（`.thin-scrollbar` 类）：6px 宽、圆角、悬停时从透明渐变为可见
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 1.4 在 `packages/app/src/index.css` 中添加流畅度优化：`will-change` 提示、`content-visibility: auto` 长列表优化、确保动画仅使用可合成属性
    - 为 `[data-panel]` 和 `[data-component="dialog-overlay"]` 添加 `will-change: opacity`
    - 为文件树节点和会话项添加 `content-visibility: auto`
    - _Requirements: 8.1, 8.3, 8.4_
  - [x] 1.5 在 `packages/app/src/index.css` 中添加搜索高亮 `mark` 标签样式：`bg-surface-warning-base/40` 背景色、`rounded-sm` 圆角
    - _Requirements: 4.2_

- [x] 2. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请告知。

- [x] 3. File Explorer 视觉打磨
  - [x] 3.1 修改 `packages/app/src/components/file-explorer.tsx`：将硬编码 `w-64` 树面板替换为 `ResizeHandle` 驱动的可调宽度（min 180px, max 400px）
    - 新增 `createSignal(256)` 管理宽度
    - 导入并插入 `ResizeHandle` 组件
    - _Requirements: 1.1_
  - [x] 3.2 修改 `packages/app/src/components/file-explorer.tsx`：增强空状态（Icon + 提示文字）、Loading 用 Spinner 替代、"Add to chat" 按钮使用语义化令牌、文件预览头部栏添加 bg-surface-base、重试按钮统一样式
    - 导入 `Icon` 和 `Spinner` 组件
    - 空状态：`<Icon name="file" class="size-8 text-icon-weaker" />` + 提示文字
    - Loading：`<Spinner />` 替代 `"Loading..."` 文本
    - "Add to chat"：`bg-button-primary-base text-text-on-primary hover:bg-button-primary-hover`
    - 头部栏：添加 `bg-surface-base`
    - 重试按钮：添加 `shadow-interactive rounded-interactive`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 4. Git Explorer 视觉打磨
  - [x] 4.1 修改 `packages/app/src/components/git-explorer-helpers.ts`：新增 `colorClass` 函数，返回语义化 CSS 类名替代内联 style
    - _Requirements: 2.3_
  - [ ]* 4.2 为 `colorClass` 函数编写属性测试
    - **Property 1: Git 状态到 CSS 类的映射完整性**
    - **Validates: Requirements 2.3**
  - [x] 4.3 修改 `packages/app/src/components/git-explorer.tsx`：提交区域添加 bg-surface-base 背景、文件列表项 h-6→h-7、状态指示器用 colorClass 替代内联 style、触摸设备始终显示操作按钮、diff 加载用 Spinner、空状态组件、折叠标题 py-2
    - 导入 `Spinner`、`Icon`、`createMediaQuery`
    - 导入 `colorClass` 替代 `color`
    - 触摸检测：`createMediaQuery("(hover: none)")`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 5. Terminal 错误覆盖层与侧面板打磨
  - [x] 5.1 修改 `packages/app/src/components/terminal.tsx`：错误覆盖层卡片化（shadow-panel、rounded-card、bg-surface-raised-base）、重试按钮语义化样式、fade-in 动画
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 5.2 修改 `packages/ui/src/components/resize-handle.css`：为 `::after` 伪元素添加 `background-color: var(--border-base)` 和悬停时 `var(--border-active)` 颜色
    - _Requirements: 6.3_

- [x] 6. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请告知。

- [x] 7. 侧边栏会话项与侧面板标签栏打磨
  - [x] 7.1 修改侧边栏会话项样式：已归档会话行 `opacity-70`、归档图标 `text-icon-weaker`
    - 定位 `packages/app/src/pages/layout/sidebar-workspace.tsx` 中归档会话的渲染逻辑
    - _Requirements: 4.1_
  - [x] 7.2 修改 `packages/app/src/pages/session/session-side-panel.tsx`：file-tree-panel 的 Tabs.List 添加 `border-b border-border-base` 分隔线
    - _Requirements: 6.1, 6.2_

- [x] 8. 应用 thin-scrollbar 类到各面板
  - [x] 8.1 在 File Explorer、Git Explorer、Side Panel 等可滚动面板中，将 `overflow-y-auto` 的容器添加 `thin-scrollbar` 类（保留已有 `no-scrollbar` 的容器不变）
    - `file-explorer.tsx`：文件预览区域
    - `git-explorer.tsx`：文件列表面板
    - `session-side-panel.tsx`：标签内容区域
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 9. Final Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请告知。

## Notes

- 标记 `*` 的任务为可选，可跳过以加速交付
- 所有改动为 CSS/样式层面，不涉及业务逻辑
- 属性测试使用 `fast-check` 库，100 次迭代
- 单元测试使用 `bun:test`
- 测试文件放在对应源文件旁边

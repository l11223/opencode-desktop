# 实现计划：Desktop Overhaul（桌面应用全面改版）

## 概述

基于现有 SolidJS + Tauri 2 架构，增量改造桌面应用。按照布局系统 → 主题美化 → 终端修复 → 文件浏览器 → Git 浏览器 → 会话管理 → 组件集成的顺序推进。

## Tasks

- [x] 1. 布局系统增强与响应式适配
  - [x] 1.1 扩展 `packages/app/src/context/layout.tsx` 的 persisted store，新增 `sidePanel` 字段（width、activeTab），新增移动端布局检测信号
    - 在现有 `fileTree` 旁新增 `sidePanel` 配置
    - 新增 `mobile` 响应式 accessor，监听 resize 事件
    - _Requirements: 1.1, 1.2, 1.5_
  - [x] 1.2 修改 `packages/app/src/pages/layout.tsx` 和 session.tsx，实现三栏布局，支持面板分隔线拖拽
    - 复用 `ResizeHandle` 组件
    - 面板最小宽度：Sidebar 240px、Side Panel 280px、Session Panel 400px
    - _Requirements: 1.3, 1.4, 1.5_
  - [ ]* 1.3 为布局计算逻辑编写属性测试
    - **Property 1: 布局模式由窗口宽度阈值决定**
    - **Property 3: 面板宽度低于阈值自动折叠**
    - **Validates: Requirements 1.1, 1.2, 1.4**
  - [ ]* 1.4 为面板宽度持久化编写属性测试
    - **Property 2: 面板宽度持久化往返一致**
    - **Validates: Requirements 1.3**

- [x] 2. 主题与视觉美化
  - [x] 2.1 在 `packages/app/src/index.css` 中添加全局过渡动画样式：面板切换、弹窗动画、主题切换过渡
    - 为 `[data-panel]`、`[data-dialog-overlay]` 添加 CSS transition/animation
    - _Requirements: 3.2, 3.3, 3.5_
  - [x] 2.2 统一 `packages/ui/src/styles/` 中的圆角、间距、阴影变量，确保交互元素使用一致的设计令牌
    - _Requirements: 3.3_
  - [x] 2.3 增强消息列表的平滑自动滚动，复用 `createAutoScroll` hook
    - _Requirements: 3.4_
  - [ ]* 2.4 为新消息自动滚动编写属性测试
    - **Property 6: 新消息自动滚动到底部**
    - **Validates: Requirements 3.4**

- [x] 3. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请告知。

- [x] 4. 终端面板修复与增强
  - [x] 4.1 在 `packages/app/src/components/terminal.tsx` 中实现 WebSocket 指数退避重连和错误覆盖层
    - 重连：初始 1s，最大 16s，最多 5 次
    - 错误覆盖层：错误信息 + 重试按钮
    - _Requirements: 6.1, 6.2_
  - [x] 4.2 实现终端配色跟随主题：从 ThemeProvider 读取颜色令牌映射到 Ghostty 终端
    - _Requirements: 6.3_
  - [x] 4.3 增强终端标签管理：接入 `solid-dnd` 拖拽排序，添加 Ctrl+Tab 快捷键切换
    - _Requirements: 6.4_
  - [x] 4.4 实现终端面板 resize 时实时更新行列数，通过 `terminal.update()` 通知后端 PTY
    - _Requirements: 6.5_
  - [x] 4.5 实现终端面板隐藏/恢复时保留缓冲区和滚动位置
    - _Requirements: 6.6_
  - [ ]* 4.6 为终端逻辑编写属性测试
    - **Property 13: 终端配色跟随主题**
    - **Property 15: 终端面板高度与行列数对应**
    - **Property 16: 终端缓冲区隐藏/恢复往返一致**
    - **Validates: Requirements 6.3, 6.5, 6.6**

- [x] 5. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请告知。

- [x] 6. 文件浏览器增强
  - [x] 6.1 创建 `packages/app/src/components/file-explorer.tsx`，封装文件树 + 文件预览面板
    - 文件预览复用 `@opencode-ai/ui/code`（Shiki 语法高亮）
    - 文件图标复用 `@opencode-ai/ui/file-icon`
    - _Requirements: 4.1, 4.2, 4.4_
  - [x] 6.2 实现目录节点异步展开，展示加载指示器
    - 复用现有 `shouldListExpanded` / `dirsToExpand` 逻辑
    - _Requirements: 4.3_
  - [x] 6.3 实现文件预览行选择功能，支持将选中行附加到聊天上下文
    - _Requirements: 4.5_
  - [x] 6.4 实现文件加载失败的错误状态（错误信息 + 重试按钮）
    - _Requirements: 4.6_
  - [x] 6.5 为 File Explorer 添加右键上下文菜单（在终端中打开、添加到聊天、复制路径）
    - 复用 `@opencode-ai/ui/context-menu`
    - _Requirements: 8.1_
  - [ ]* 6.6 为文件浏览器编写属性测试
    - **Property 7: 文件树完整展示目录结构**
    - **Property 8: 文件扩展名到图标的映射一致性**
    - **Validates: Requirements 4.1, 4.4**

- [x] 7. Git 浏览器
  - [x] 7.1 创建 `packages/app/src/components/git-explorer.tsx`，实现 Git 状态展示
    - 显示当前分支名、staged/unstaged 文件列表、暂存区文件数量徽标
    - 定义 `GitState`、`GitFile`、`GitBranch` 类型
    - _Requirements: 5.1, 5.7_
  - [x] 7.2 实现变更文件 diff 视图，复用 `@opencode-ai/ui/diff`
    - _Requirements: 5.2_
  - [x] 7.3 实现暂存/取消暂存操作（`git add` / `git reset`）
    - _Requirements: 5.3_
  - [x] 7.4 实现提交功能（提交信息输入 + `git commit` + 刷新列表）
    - _Requirements: 5.4_
  - [x] 7.5 实现分支切换下拉列表
    - _Requirements: 5.5_
  - [x] 7.6 实现 Git 操作错误处理，通过 Toast 通知显示错误详情
    - _Requirements: 5.6_
  - [ ]* 7.7 为 Git 浏览器编写属性测试
    - **Property 9: Git 状态完整展示**
    - **Property 10: 暂存操作将文件从未暂存移至已暂存**
    - **Property 11: 提交操作清空暂存区**
    - **Property 12: 暂存区徽标数量等于已暂存文件数**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.7**

- [x] 8. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请告知。

- [x] 9. 侧边栏导航与会话管理增强
  - [x] 9.1 在 `packages/app/src/pages/layout/sidebar-items.tsx` 中增强 Sidebar：项目图标 Tooltip、悬停展开会话列表
    - 复用 `@opencode-ai/ui/tooltip`
    - _Requirements: 2.1, 2.2_
  - [x] 9.2 在 Sidebar 展开状态下新增会话搜索输入框，使用 `fuzzysort` 模糊匹配并高亮结果
    - _Requirements: 2.3, 7.4_
  - [x] 9.3 实现项目图标拖拽排序，复用 `solid-dnd`，持久化排序结果
    - 现有 `projects.move()` 已支持排序逻辑
    - _Requirements: 2.4_
  - [x] 9.4 在 Sidebar 底部固定显示设置和帮助按钮
    - _Requirements: 2.5_
  - [x] 9.5 增强会话列表：按时间倒序排列、显示最后活动时间、未读消息徽标
    - 复用现有 `useNotification` context
    - _Requirements: 7.1, 7.5_
  - [x] 9.6 实现会话右键上下文菜单（重命名、归档、删除），复用 `@opencode-ai/ui/context-menu`
    - _Requirements: 7.3_
  - [x] 9.7 实现新建会话时自动聚焦到提示输入框
    - _Requirements: 7.6_
  - [x] 9.8 实现已归档会话恢复：点击归档会话时加载完整消息历史
    - _Requirements: 7.2_
  - [ ]* 9.9 为侧边栏和会话管理编写属性测试
    - **Property 4: 项目列表完整渲染**
    - **Property 5: 项目排序持久化往返一致**
    - **Property 17: 会话按时间倒序排列**
    - **Property 18: 会话搜索过滤正确性**
    - **Property 19: 未读消息徽标数量一致**
    - **Validates: Requirements 2.1, 2.4, 7.1, 7.4, 7.5**

- [x] 10. 组件间集成
  - [x] 10.1 实现 File Explorer 右键"在终端中打开"：在 Terminal_Panel 中 cd 到文件所在目录
    - 调用 `terminal.new()` 或复用现有终端，通过 WebSocket 发送 cd 命令
    - _Requirements: 8.1_
  - [x] 10.2 实现 AI 会话文件变更时自动刷新 File Explorer 和 Git Explorer
    - 监听 sync context 的 session_diff 数据变化
    - _Requirements: 8.2, 8.3_
  - [x] 10.3 实现 Git Explorer 中点击变更文件在文件预览面板打开 diff 视图
    - _Requirements: 8.4_
  - [x] 10.4 实现文件拖拽到聊天输入框添加为上下文附件
    - 调用 `prompt.context.add({ type: "file", path })`
    - _Requirements: 8.5_
  - [ ]* 10.5 为组件间集成编写属性测试
    - **Property 14: 终端标签排序持久化**
    - **Property 20: 文件变更事件触发面板刷新**
    - **Validates: Requirements 6.4, 8.2, 8.3**

- [x] 11. Final Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请告知。

## Notes

- 标记 `*` 的任务为可选，可跳过以加速 MVP
- 每个任务引用具体需求编号以保证可追溯性
- 属性测试使用 `fast-check` 库，每个测试至少 100 次迭代
- 单元测试使用 `bun:test`，重点覆盖边界情况和错误条件
- 测试文件放在对应源文件旁边（如 `file-explorer.test.ts`）

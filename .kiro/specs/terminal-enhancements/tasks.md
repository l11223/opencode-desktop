# 实现计划：终端增强

## 概述

基于设计文档，将终端增强功能分为两条主线实现：终端内搜索（Search Addon + Search Bar）和分屏终端（布局纯函数 + Split Container + Context 扩展）。先实现纯函数和 addon 层，再实现 UI 组件，最后集成到现有终端面板。

## 任务

- [x] 1. 实现分屏布局纯函数
  - [x] 1.1 创建 `packages/app/src/components/terminal-split.ts`，定义 `PaneNode`、`SplitNode`、`LayoutNode` 类型，实现 `split()`、`remove()`、`resize()`、`panes()`、`find()` 纯函数
    - `split(layout, paneId, direction, newPaneId)`: 将目标窗格替换为 SplitNode，原窗格和新窗格作为子节点，默认 ratio 0.5
    - `remove(layout, paneId)`: 移除窗格，父 SplitNode 只剩一个子节点时提升该子节点，返回 undefined 表示布局为空
    - `resize(layout, path, ratio)`: 根据路径定位 SplitNode 并更新 ratio，约束在 [0.1, 0.9]
    - `panes(layout)`: 收集所有叶节点 pane ID
    - `find(layout, paneId)`: 查找指定 pane
    - _Requirements: 4.1, 4.2, 4.4, 5.2, 5.4_

  - [x] 1.2 实现 `focus(layout, direction, currentId)` 方向导航函数
    - 从当前窗格出发，按 left/right/up/down 方向查找最近的相邻窗格
    - 需要计算每个窗格在布局中的几何位置来判断方向关系
    - _Requirements: 6.2_

  - [ ]* 1.3 为布局纯函数编写属性测试（`packages/app/src/components/terminal-split.test.ts`）
    - **Property 4: 分屏操作保持窗格数量不变量**
    - **Validates: Requirements 4.1, 4.2, 4.4**

  - [ ]* 1.4 为布局纯函数编写属性测试
    - **Property 5: 分屏后原窗格仍存在**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 1.5 为布局纯函数编写属性测试
    - **Property 6: 移除窗格后布局有效性**
    - **Validates: Requirements 4.4**

  - [ ]* 1.6 为布局纯函数编写属性测试
    - **Property 7: 调整比例范围约束**
    - **Validates: Requirements 5.2**

  - [ ]* 1.7 为布局纯函数编写属性测试
    - **Property 8: 布局序列化往返**
    - **Validates: Requirements 5.5**

  - [ ]* 1.8 为方向导航编写属性测试
    - **Property 9: 方向导航一致性**
    - **Validates: Requirements 6.2**

  - [ ]* 1.9 为布局纯函数编写单元测试
    - 单窗格 split、嵌套 split、remove 最后窗格返回 undefined、remove 中间窗格提升子节点
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 2. 检查点 — 确保所有布局测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 3. 实现 Search Addon
  - [x] 3.1 创建 `packages/app/src/addons/search.ts`，实现 `SearchAddon` 类
    - 实现 `ITerminalAddon` 接口（activate/dispose）
    - 定义 `SearchOptions`（caseSensitive、regex、wholeWord）和 `SearchMatch`（row、col、length）类型
    - 实现 `search(query, options)`: 遍历终端缓冲区每行，执行字符串/正则匹配，收集所有匹配项
    - 实现 `next()` / `previous()`: 循环导航匹配项，使用模运算实现环绕
    - 实现 `clear()`: 清除匹配状态和高亮装饰
    - 通过终端装饰 API 高亮匹配项，当前匹配项使用不同颜色
    - 处理无效正则表达式：捕获错误，返回空匹配列表
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.4_

  - [ ]* 3.2 为 Search Addon 编写属性测试（`packages/app/src/addons/search.test.ts`）
    - **Property 1: 搜索正确性 — 所有匹配项均被找到**
    - **Validates: Requirements 2.1**

  - [ ]* 3.3 为 Search Addon 编写属性测试
    - **Property 2: 搜索导航循环**
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ]* 3.4 为 Search Addon 编写属性测试
    - **Property 3: 搜索选项影响匹配结果**
    - **Validates: Requirements 3.4**

  - [ ]* 3.5 为 Search Addon 编写单元测试
    - 空查询返回空匹配、无匹配时 next/previous 返回 undefined、无效正则不崩溃、全词匹配边界
    - _Requirements: 2.1, 2.6_

- [x] 4. 检查点 — 确保所有搜索测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 5. 实现 Search Bar UI 组件
  - [x] 5.1 创建 `packages/app/src/components/terminal-search.tsx`，实现搜索栏 SolidJS 组件
    - 浮动定位在终端内容区域右上角（absolute positioning）
    - 搜索输入框，带 150ms debounce
    - 匹配计数显示（"N/M" 格式），无匹配时显示 "0/0"
    - 上一个/下一个导航按钮，无匹配时禁用
    - 大小写敏感、正则、全词匹配三个切换按钮
    - 关闭按钮
    - 打开时自动聚焦输入框，如有终端选中文本则预填
    - Enter 触发下一个，Shift+Enter 触发上一个，Escape 关闭
    - 遵循现有设计令牌和主题配色
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 2.6, 3.1, 3.2, 3.3_

  - [x] 5.2 在 `packages/app/src/components/terminal.tsx` 中集成 Search Addon 和 Search Bar
    - 加载 SearchAddon 到终端实例
    - 添加搜索状态信号（open、query、options）
    - 在 `attachCustomKeyEventHandler` 中拦截 Cmd+F / Ctrl+F 打开搜索栏
    - 关闭搜索栏时调用 addon.clear() 并恢复终端焦点
    - 主题变化时更新搜索高亮颜色
    - _Requirements: 1.1, 1.3, 1.4, 7.4_

- [x] 6. 实现 Split Container UI 组件
  - [x] 6.1 创建 `packages/app/src/components/terminal-split.tsx` 中的 `SplitContainer` SolidJS 组件
    - 递归渲染 LayoutNode 树：PaneNode 渲染 Terminal 组件，SplitNode 渲染两个子节点和分隔条
    - 分隔条使用现有 ResizeHandle 组件或类似实现，支持拖拽调整 ratio
    - 水平分屏使用 flex-row，垂直分屏使用 flex-col
    - 聚焦窗格显示边框高亮
    - 点击窗格切换焦点
    - _Requirements: 5.1, 5.2, 5.4, 6.1, 6.3, 6.4_

- [x] 7. 扩展 Terminal Context 支持分屏
  - [x] 7.1 在 `packages/app/src/context/terminal.tsx` 中扩展 store 和方法
    - 在 persisted store 中新增 `layouts` 字段（Record<string, LayoutNode>），key 为 active tab ID
    - 实现 `split(id, direction)`: 调用布局纯函数 split()，创建新 PTY，更新 layout
    - 实现 `removeSplit(id)`: 调用布局纯函数 remove()，关闭 PTY，更新 layout；如果 remove 返回 undefined 则关闭标签页
    - 实现 `focusPane(id)` 和 `focusDirection(direction)`: 更新 focused 状态
    - 实现 `resizePane(path, ratio)`: 调用布局纯函数 resize()，更新 layout
    - 实现 `getLayout()`: 返回当前标签页的 layout
    - 向后兼容：无 layout 时视为单窗格模式
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.3, 5.5, 6.2_

- [x] 8. 集成到 Terminal Panel
  - [x] 8.1 更新 `packages/app/src/pages/session/terminal-panel.tsx`
    - 当标签页有分屏 layout 时，使用 SplitContainer 渲染替代现有单终端渲染
    - 当标签页无 layout 时，保持现有单终端渲染逻辑不变
    - 每个分屏窗格的 Terminal 组件独立管理 WebSocket 连接和缓冲区持久化
    - _Requirements: 7.1, 7.3_

  - [x] 8.2 注册终端命令和快捷键
    - 在命令系统中注册 `terminal.search`、`terminal.splitRight`、`terminal.splitDown`、`terminal.focusLeft/Right/Up/Down`、`terminal.closePane`
    - 配置默认快捷键（参见设计文档命令表）
    - _Requirements: 1.1, 4.1, 4.2, 6.2_

- [x] 9. 最终检查点 — 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP
- 每个任务引用具体需求以确保可追溯性
- 检查点确保增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
- 布局纯函数先于 UI 组件实现，便于充分测试核心逻辑

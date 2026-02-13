# 需求文档

## 简介

对 opencode 桌面应用的终端功能进行增强，包括终端内搜索（Find in Terminal）和分屏终端（Split Pane）。当前终端已支持多标签、拖拽排序、WebSocket 重连和缓冲区持久化，但缺少文本搜索和分屏能力。本增强将使终端体验更接近 VS Code / Cursor 等主流 IDE。

## 术语表

- **Terminal_Component**: 终端渲染组件，基于 Ghostty Web（xterm.js 兼容），负责单个终端实例的渲染和交互
- **Terminal_Panel**: 终端面板组件，包含标签栏和终端内容区域，管理终端标签的展示和切换
- **Terminal_Context**: 终端状态管理上下文，管理终端实例的创建、销毁、切换和持久化
- **Search_Bar**: 终端搜索栏组件，浮动在终端内容区域上方，提供搜索输入和导航控制
- **Search_Addon**: 终端搜索插件，基于 xterm.js 兼容接口实现终端缓冲区文本搜索和高亮
- **Split_Container**: 分屏容器组件，管理终端实例在水平或垂直方向上的分割布局
- **Split_Pane**: 分屏窗格，Split_Container 中的单个终端实例区域
- **Pane_Layout**: 分屏布局数据结构，以树形结构描述分屏的嵌套关系和尺寸比例

## 需求

### 需求 1：终端内搜索 — 搜索栏交互

**用户故事：** 作为开发者，我希望在终端中搜索文本，以便快速定位终端输出中的关键信息。

#### 验收标准

1. WHEN 用户在终端聚焦时按下 Cmd+F（macOS）或 Ctrl+F（其他平台）, THE Terminal_Component SHALL 在终端内容区域右上角显示 Search_Bar
2. WHEN Search_Bar 显示时, THE Search_Bar SHALL 自动获取输入焦点
3. WHEN 用户按下 Escape 或点击关闭按钮, THE Search_Bar SHALL 关闭并将焦点返回终端
4. WHEN Search_Bar 关闭, THE Search_Addon SHALL 清除所有搜索高亮
5. WHEN 终端中存在选中文本且用户触发搜索, THE Search_Bar SHALL 将选中文本预填到搜索输入框中

### 需求 2：终端内搜索 — 搜索与导航

**用户故事：** 作为开发者，我希望在搜索结果之间导航，以便逐一查看每个匹配项。

#### 验收标准

1. WHEN 用户在 Search_Bar 中输入文本, THE Search_Addon SHALL 在终端缓冲区中搜索所有匹配项并高亮显示
2. WHEN 存在搜索匹配项, THE Search_Bar SHALL 显示当前匹配项索引和总匹配数（如 "3/42"）
3. WHEN 用户点击"下一个"按钮或按 Enter, THE Search_Addon SHALL 跳转到下一个匹配项并滚动终端使其可见
4. WHEN 用户点击"上一个"按钮或按 Shift+Enter, THE Search_Addon SHALL 跳转到上一个匹配项并滚动终端使其可见
5. WHEN 搜索到达最后一个匹配项后继续"下一个", THE Search_Addon SHALL 循环回到第一个匹配项
6. WHEN 搜索输入框为空或无匹配结果, THE Search_Bar SHALL 显示 "0/0" 并禁用导航按钮

### 需求 3：终端内搜索 — 搜索选项

**用户故事：** 作为开发者，我希望控制搜索的匹配方式，以便更精确地定位目标文本。

#### 验收标准

1. THE Search_Bar SHALL 提供大小写敏感切换按钮
2. THE Search_Bar SHALL 提供正则表达式模式切换按钮
3. THE Search_Bar SHALL 提供全词匹配切换按钮
4. WHEN 用户切换搜索选项, THE Search_Addon SHALL 使用新选项重新执行搜索并更新高亮

### 需求 4：分屏终端 — 分屏操作

**用户故事：** 作为开发者，我希望将终端分屏，以便同时查看多个终端的输出。

#### 验收标准

1. WHEN 用户在终端聚焦时执行"水平分屏"命令, THE Split_Container SHALL 在当前窗格右侧创建新的 Split_Pane 并启动新终端实例
2. WHEN 用户在终端聚焦时执行"垂直分屏"命令, THE Split_Container SHALL 在当前窗格下方创建新的 Split_Pane 并启动新终端实例
3. WHEN 新的 Split_Pane 创建时, THE Terminal_Context SHALL 为该窗格创建独立的终端实例并建立 WebSocket 连接
4. WHEN 用户关闭一个 Split_Pane, THE Split_Container SHALL 移除该窗格并将空间分配给相邻窗格
5. WHEN 标签页中仅剩一个 Split_Pane 且用户关闭该窗格, THE Terminal_Panel SHALL 关闭整个标签页

### 需求 5：分屏终端 — 窗格布局与调整

**用户故事：** 作为开发者，我希望调整分屏窗格的大小，以便根据需要分配屏幕空间。

#### 验收标准

1. THE Split_Container SHALL 在相邻窗格之间显示可拖拽的分隔条
2. WHEN 用户拖拽分隔条, THE Split_Container SHALL 实时调整相邻窗格的尺寸比例
3. WHEN 窗格尺寸变化, THE Terminal_Component SHALL 重新计算终端行列数并通知后端更新 PTY 尺寸
4. THE Split_Container SHALL 支持嵌套分屏（水平分屏内可再垂直分屏，反之亦然）
5. WHEN 分屏布局变化, THE Terminal_Context SHALL 持久化当前 Pane_Layout 以便恢复

### 需求 6：分屏终端 — 窗格焦点与导航

**用户故事：** 作为开发者，我希望在分屏窗格之间快速切换焦点，以便高效操作多个终端。

#### 验收标准

1. WHEN 用户点击某个 Split_Pane, THE Split_Container SHALL 将焦点切换到该窗格的终端实例
2. WHEN 用户执行"聚焦左侧/右侧/上方/下方窗格"命令, THE Split_Container SHALL 将焦点移动到对应方向的相邻窗格
3. THE Split_Container SHALL 通过视觉指示器（如边框高亮）标识当前聚焦的窗格
4. WHEN 窗格获得焦点, THE Terminal_Component SHALL 激活该终端实例的光标闪烁

### 需求 7：集成与一致性

**用户故事：** 作为开发者，我希望新增功能与现有终端系统无缝集成，保持一致的用户体验。

#### 验收标准

1. THE Terminal_Panel SHALL 保留现有的所有功能，包括多标签、标签拖拽排序、WebSocket 重连和缓冲区持久化
2. THE Search_Bar SHALL 遵循现有的设计令牌系统和主题配色方案
3. THE Split_Container SHALL 与现有标签系统协同工作，每个标签页独立维护自己的分屏布局
4. WHEN 终端主题变化, THE Search_Bar SHALL 同步更新搜索高亮颜色以匹配新主题

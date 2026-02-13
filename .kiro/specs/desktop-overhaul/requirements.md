# 需求文档

## 简介

对 opencode 桌面应用进行全面改版，提升 UI 美观度、补全缺失功能、修复终端错误。参考 claudecodeui 项目的设计理念，实现响应式布局、文件浏览器（含语法高亮与编辑）、Git 浏览器（查看/暂存/提交/切换分支）、增强的会话管理，以及整体视觉打磨。

## 术语表

- **Desktop_App**: 基于 Tauri 2 + SolidJS 的 opencode 桌面客户端应用
- **Sidebar**: 应用左侧导航栏，包含项目列表、工作区切换、设置入口
- **Session_Panel**: 会话主面板，展示聊天消息时间线、提示输入区域
- **Terminal_Panel**: 集成的 Ghostty Web 终端面板
- **File_Explorer**: 文件浏览器组件，支持目录树展示、文件预览与编辑
- **Git_Explorer**: Git 浏览器组件，支持查看变更、暂存、提交、切换分支
- **Session_Manager**: 会话管理模块，负责会话的创建、恢复、归档、历史追踪
- **Theme_Engine**: 主题引擎，负责颜色方案、明暗模式切换
- **Layout_System**: 布局系统，负责面板排列、尺寸调整、响应式适配

## 需求

### 需求 1：响应式布局系统

**用户故事：** 作为用户，我希望桌面应用在不同窗口尺寸下都能良好展示，以便在各种屏幕上高效工作。

#### 验收标准

1. WHEN 窗口宽度小于 768px, THE Layout_System SHALL 切换为移动端布局，将 Sidebar 折叠为图标栏并隐藏扩展面板
2. WHEN 窗口宽度大于等于 768px, THE Layout_System SHALL 展示完整的桌面端布局，包含可展开的 Sidebar 和并排面板
3. WHEN 用户拖拽面板分隔线, THE Layout_System SHALL 实时调整相邻面板宽度，并将宽度值持久化到本地存储
4. WHEN 面板宽度被调整到最小阈值以下, THE Layout_System SHALL 自动折叠该面板并显示展开按钮
5. THE Layout_System SHALL 在 Session_Panel、Terminal_Panel、File_Explorer 之间支持灵活的分栏布局

### 需求 2：侧边栏导航优化

**用户故事：** 作为用户，我希望侧边栏更加美观且功能完善，以便快速切换项目和会话。

#### 验收标准

1. THE Sidebar SHALL 展示项目图标列表，每个图标带有项目名称的 Tooltip 提示
2. WHEN 用户悬停在项目图标上, THE Sidebar SHALL 展开显示该项目下的会话列表
3. WHEN Sidebar 处于展开状态, THE Sidebar SHALL 显示会话搜索输入框，支持按标题模糊搜索
4. WHEN 用户拖拽项目图标, THE Sidebar SHALL 允许重新排序并持久化顺序
5. THE Sidebar SHALL 在底部固定显示设置和帮助按钮

### 需求 3：主题与视觉美化

**用户故事：** 作为用户，我希望应用有精致的视觉设计和丰富的主题选择，以获得愉悦的使用体验。

#### 验收标准

1. THE Theme_Engine SHALL 支持明亮、暗黑、跟随系统三种颜色方案
2. WHEN 用户切换主题, THE Theme_Engine SHALL 在 200ms 内完成所有组件的颜色过渡
3. THE Desktop_App SHALL 对所有交互元素（按钮、输入框、列表项）应用一致的圆角、间距和阴影样式
4. WHEN 消息列表滚动时, THE Session_Panel SHALL 使用平滑滚动动画并在新消息到达时自动滚动到底部
5. THE Desktop_App SHALL 对面板切换、弹窗打开/关闭应用过渡动画

### 需求 4：文件浏览器

**用户故事：** 作为开发者，我希望在应用内浏览和编辑项目文件，以便无需切换到外部编辑器。

#### 验收标准

1. WHEN 用户打开 File_Explorer, THE File_Explorer SHALL 以树形结构展示当前项目的目录和文件
2. WHEN 用户点击文件节点, THE File_Explorer SHALL 在右侧面板中以语法高亮方式展示文件内容
3. WHEN 用户展开目录节点, THE File_Explorer SHALL 异步加载该目录的子节点并显示加载指示器
4. THE File_Explorer SHALL 根据文件扩展名显示对应的文件类型图标
5. WHEN 用户在文件预览中选择代码行, THE File_Explorer SHALL 支持将选中行作为上下文附加到聊天提示中
6. IF 文件加载失败, THEN THE File_Explorer SHALL 在文件预览区域显示错误信息和重试按钮

### 需求 5：Git 浏览器

**用户故事：** 作为开发者，我希望在应用内查看 Git 状态并执行基本 Git 操作，以便高效管理代码变更。

#### 验收标准

1. WHEN 用户打开 Git_Explorer, THE Git_Explorer SHALL 显示当前分支名称和未提交变更文件列表
2. WHEN 用户点击变更文件, THE Git_Explorer SHALL 以 diff 视图展示该文件的变更内容
3. WHEN 用户选择文件并点击暂存按钮, THE Git_Explorer SHALL 将选中文件添加到 Git 暂存区
4. WHEN 用户输入提交信息并点击提交按钮, THE Git_Explorer SHALL 执行 Git 提交操作并刷新变更列表
5. WHEN 用户点击分支选择器, THE Git_Explorer SHALL 显示本地分支列表并允许切换分支
6. IF Git 操作失败, THEN THE Git_Explorer SHALL 显示包含错误详情的通知消息
7. WHEN 暂存区有文件时, THE Git_Explorer SHALL 在暂存区标题旁显示文件数量徽标

### 需求 6：终端面板修复与增强

**用户故事：** 作为开发者，我希望终端面板稳定可靠且功能完善，以便在应用内执行命令行操作。

#### 验收标准

1. WHEN WebSocket 连接断开, THE Terminal_Panel SHALL 显示重连提示并在用户确认后自动重新建立连接
2. WHEN 终端实例创建失败, THE Terminal_Panel SHALL 显示明确的错误信息而非空白面板
3. THE Terminal_Panel SHALL 根据当前主题动态调整终端配色方案
4. WHEN 用户创建多个终端标签, THE Terminal_Panel SHALL 支持标签拖拽排序和快捷键切换
5. WHEN 用户调整终端面板高度, THE Terminal_Panel SHALL 实时调整终端行列数并通知后端 PTY 进程
6. WHEN 终端面板从隐藏状态恢复, THE Terminal_Panel SHALL 恢复之前的终端缓冲区内容和滚动位置

### 需求 7：会话管理增强

**用户故事：** 作为用户，我希望更好地管理多个对话会话，以便追踪历史和恢复上下文。

#### 验收标准

1. THE Session_Manager SHALL 在侧边栏按时间倒序展示所有会话，并显示会话标题和最后活动时间
2. WHEN 用户点击已归档的会话, THE Session_Manager SHALL 恢复该会话的完整消息历史
3. WHEN 用户右键点击会话项, THE Session_Manager SHALL 显示上下文菜单，包含重命名、归档、删除选项
4. WHEN 用户在会话搜索框输入关键词, THE Session_Manager SHALL 按标题过滤会话列表并高亮匹配文本
5. THE Session_Manager SHALL 在会话列表项上显示未读消息数量徽标
6. WHEN 用户创建新会话, THE Session_Manager SHALL 自动聚焦到提示输入框

### 需求 8：组件间集成

**用户故事：** 作为开发者，我希望各功能面板之间能够协同工作，以获得流畅的工作流体验。

#### 验收标准

1. WHEN 用户在 File_Explorer 中右键点击文件, THE Desktop_App SHALL 提供"在终端中打开"选项，在 Terminal_Panel 中切换到该文件所在目录
2. WHEN AI 会话产生文件变更, THE File_Explorer SHALL 自动刷新受影响的目录节点
3. WHEN AI 会话产生文件变更, THE Git_Explorer SHALL 自动更新变更文件列表
4. WHEN 用户在 Git_Explorer 中点击变更文件, THE Desktop_App SHALL 在文件预览面板中打开该文件的 diff 视图
5. WHEN 用户从 File_Explorer 拖拽文件到聊天输入框, THE Desktop_App SHALL 将该文件作为上下文附件添加到提示中

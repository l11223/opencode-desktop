# 需求文档

## 简介

为 opencode 桌面应用新增跨文件全文搜索功能（类似 VS Code 的 Cmd+Shift+F）。当前应用仅支持文件名搜索（Cmd+P），缺少在项目文件内容中搜索文本的能力。本功能将通过 SDK 的 `find.text` API（底层使用 ripgrep）实现高性能全文搜索，支持正则表达式、大小写敏感切换，搜索结果按文件分组展示，并记录搜索历史。

## 术语表

- **Search_Panel**: 全局搜索面板组件，作为侧面板的一个标签页展示搜索界面和结果
- **Search_Input**: 搜索输入框组件，包含搜索文本输入、正则切换按钮和大小写切换按钮
- **Search_Results**: 搜索结果展示组件，按文件分组显示匹配行
- **Search_Match**: 单条搜索匹配结果，包含文件路径、行号、匹配行文本和子匹配高亮信息
- **Search_History**: 搜索历史管理模块，持久化存储最近的搜索查询
- **SDK_Find**: SDK 提供的 `find.text` API，底层使用 ripgrep 进行文本搜索，返回匹配结果数组
- **File_Context**: 文件上下文模块，提供文件加载和标签页打开功能

## 需求

### 需求 1：搜索触发与面板展示

**用户故事：** 作为开发者，我希望通过快捷键快速打开全局搜索面板，以便在项目中搜索文本内容。

#### 验收标准

1. WHEN 用户按下 Cmd+Shift+F（macOS）或 Ctrl+Shift+F（Windows/Linux）, THE Search_Panel SHALL 在侧面板中打开并聚焦搜索输入框
2. THE Search_Panel SHALL 在命令面板（Cmd+Shift+P）中注册"全局搜索"命令，供用户通过命令面板触发
3. WHEN Search_Panel 已打开且用户再次按下搜索快捷键, THE Search_Input SHALL 重新获得焦点并选中当前搜索文本
4. WHEN 用户按下 Escape, THE Search_Input SHALL 失去焦点但保持搜索面板打开和结果可见

### 需求 2：搜索执行

**用户故事：** 作为开发者，我希望输入搜索文本后自动执行搜索，以便快速查看匹配结果。

#### 验收标准

1. WHEN 用户在 Search_Input 中输入文本并停止输入 300ms, THE Search_Panel SHALL 调用 SDK_Find 执行搜索
2. WHILE 搜索正在执行, THE Search_Panel SHALL 显示加载指示器
3. WHEN 搜索完成且有匹配结果, THE Search_Results SHALL 展示按文件分组的匹配结果
4. WHEN 搜索完成且无匹配结果, THE Search_Panel SHALL 显示"无匹配结果"提示
5. WHEN 用户修改搜索文本触发新搜索, THE Search_Panel SHALL 取消前一次未完成的搜索请求
6. IF SDK_Find 返回错误, THEN THE Search_Panel SHALL 显示错误提示信息

### 需求 3：搜索结果展示

**用户故事：** 作为开发者，我希望搜索结果按文件分组展示，以便快速定位目标文件和匹配行。

#### 验收标准

1. THE Search_Results SHALL 将匹配结果按文件路径分组，每个文件显示为可折叠的分组
2. THE Search_Results SHALL 在每个文件分组标题中显示文件名、文件路径和该文件的匹配数量
3. THE Search_Results SHALL 在每个匹配行中显示行号和匹配行文本
4. THE Search_Results SHALL 在匹配行文本中高亮显示匹配的子字符串
5. THE Search_Results SHALL 在搜索结果顶部显示匹配文件总数和匹配行总数的摘要信息
6. WHEN 匹配结果数量超过 1000 条, THE Search_Results SHALL 截断显示并提示用户缩小搜索范围

### 需求 4：结果交互与导航

**用户故事：** 作为开发者，我希望点击搜索结果能跳转到对应文件和行，以便快速查看上下文。

#### 验收标准

1. WHEN 用户点击某条匹配结果, THE Search_Panel SHALL 在侧面板的文件标签页中打开对应文件并滚动到匹配行
2. WHEN 用户点击文件分组标题, THE Search_Results SHALL 切换该文件分组的折叠/展开状态
3. THE Search_Results SHALL 默认展开所有文件分组

### 需求 5：正则表达式支持

**用户故事：** 作为开发者，我希望使用正则表达式进行搜索，以便执行更精确的模式匹配。

#### 验收标准

1. THE Search_Input SHALL 提供一个正则表达式切换按钮（图标为 `.*`）
2. WHEN 正则模式关闭, THE Search_Panel SHALL 将搜索文本作为字面量传递给 SDK_Find
3. WHEN 正则模式开启, THE Search_Panel SHALL 将搜索文本作为正则表达式传递给 SDK_Find
4. IF 用户输入的正则表达式无效且 SDK_Find 返回错误, THEN THE Search_Panel SHALL 显示正则语法错误提示

### 需求 6：大小写敏感切换

**用户故事：** 作为开发者，我希望控制搜索的大小写敏感性，以便灵活匹配目标文本。

#### 验收标准

1. THE Search_Input SHALL 提供一个大小写敏感切换按钮（图标为 `Aa`）
2. WHEN 大小写敏感模式关闭（默认）, THE Search_Panel SHALL 执行大小写不敏感搜索
3. WHEN 大小写敏感模式开启, THE Search_Panel SHALL 执行大小写敏感搜索
4. WHEN 用户切换大小写敏感模式且搜索框中有文本, THE Search_Panel SHALL 立即使用新模式重新执行搜索

### 需求 7：搜索历史

**用户故事：** 作为开发者，我希望快速访问最近的搜索查询，以便重复执行常用搜索。

#### 验收标准

1. WHEN 搜索执行成功, THE Search_History SHALL 将搜索查询（包含文本、正则模式和大小写模式）保存到历史记录
2. THE Search_History SHALL 最多保存 20 条历史记录，超出时移除最早的记录
3. WHEN 用户在 Search_Input 中按上/下方向键, THE Search_History SHALL 在历史记录中导航并填充搜索框
4. THE Search_History SHALL 使用 localStorage 持久化存储，在应用重启后保留

### 需求 8：集成与一致性

**用户故事：** 作为开发者，我希望全局搜索功能与现有应用无缝集成，保持一致的用户体验。

#### 验收标准

1. THE Search_Panel SHALL 遵循现有的设计令牌系统和 Tailwind CSS 4 样式规范
2. THE Search_Panel SHALL 与现有命令系统集成，通过 `command.register` 注册搜索命令和快捷键
3. THE Search_Panel SHALL 使用现有的 `useFile` 上下文打开文件和管理标签页
4. THE Search_Panel SHALL 支持国际化，所有用户可见文本通过 `useLanguage` 的翻译函数获取

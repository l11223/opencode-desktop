# 需求文档

## 简介

对 opencode 桌面应用的文件浏览器进行功能增强，包括文件树内搜索/过滤、文件操作（新建/删除/重命名）以及大项目虚拟滚动优化。当前文件浏览器仅支持浏览和预览，缺少搜索过滤、文件管理和大规模节点性能优化能力。

## 术语表

- **File_Explorer**: 文件浏览器主组件，包含文件树面板和文件预览面板
- **File_Tree**: 文件树组件，以树形结构递归展示目录和文件节点
- **Search_Filter**: 文件树顶部的搜索过滤组件，用于实时过滤文件树节点
- **Context_Menu**: 右键上下文菜单，提供文件操作入口
- **Virtual_Scroller**: 虚拟滚动组件，仅渲染可视区域内的节点以优化性能
- **FileNode**: SDK 定义的文件节点数据类型，包含 name、path、type 等字段
- **Tree_Store**: 文件树状态管理模块，管理目录展开/折叠、子节点列表等状态

## 需求

### 需求 1：文件树搜索过滤

**用户故事：** 作为开发者，我希望在文件树中搜索和过滤文件，以便在大项目中快速定位目标文件。

#### 验收标准

1. THE File_Explorer SHALL 在文件树面板顶部显示一个搜索输入框
2. WHEN 用户在搜索框中输入文本, THE Search_Filter SHALL 实时过滤文件树节点，仅显示路径或文件名匹配输入文本的节点
3. WHEN 搜索框中存在过滤文本, THE File_Tree SHALL 自动展开包含匹配文件的父目录
4. WHEN 用户清空搜索框, THE File_Tree SHALL 恢复到过滤前的展开/折叠状态
5. WHEN 搜索框中存在过滤文本且无匹配结果, THE Search_Filter SHALL 显示"无匹配结果"提示信息
6. WHEN 用户输入过滤文本, THE Search_Filter SHALL 对输入进行防抖处理（150ms），避免频繁过滤操作

### 需求 2：文件操作 — 新建

**用户故事：** 作为开发者，我希望在文件树中直接新建文件和文件夹，以便快速创建项目资源。

#### 验收标准

1. WHEN 用户右键点击文件树中的目录节点, THE Context_Menu SHALL 显示"新建文件"和"新建文件夹"选项
2. WHEN 用户右键点击文件树中的文件节点, THE Context_Menu SHALL 显示"新建文件"和"新建文件夹"选项，操作目标为该文件所在目录
3. WHEN 用户选择"新建文件"选项, THE File_Tree SHALL 在目标目录下显示一个内联输入框，供用户输入文件名
4. WHEN 用户选择"新建文件夹"选项, THE File_Tree SHALL 在目标目录下显示一个内联输入框，供用户输入文件夹名
5. WHEN 用户在内联输入框中输入名称并按 Enter, THE File_Explorer SHALL 在文件系统中创建对应的文件或文件夹
6. WHEN 用户按 Escape 或输入框失焦且内容为空, THE File_Tree SHALL 取消新建操作并移除内联输入框
7. IF 用户输入的名称与目标目录中已有项目重名, THEN THE File_Explorer SHALL 显示错误提示并阻止创建

### 需求 3：文件操作 — 删除

**用户故事：** 作为开发者，我希望在文件树中直接删除文件和文件夹，以便快速清理不需要的项目资源。

#### 验收标准

1. WHEN 用户右键点击文件树中的节点, THE Context_Menu SHALL 显示"删除"选项
2. WHEN 用户选择"删除"选项, THE File_Explorer SHALL 显示确认对话框，包含待删除项目的路径
3. WHEN 用户确认删除操作, THE File_Explorer SHALL 从文件系统中删除对应的文件或文件夹
4. WHEN 删除操作完成, THE File_Tree SHALL 从树中移除已删除的节点并刷新父目录
5. IF 删除操作失败, THEN THE File_Explorer SHALL 显示错误提示并保持文件树状态不变

### 需求 4：文件操作 — 重命名

**用户故事：** 作为开发者，我希望在文件树中直接重命名文件和文件夹，以便快速调整项目结构。

#### 验收标准

1. WHEN 用户右键点击文件树中的节点, THE Context_Menu SHALL 显示"重命名"选项
2. WHEN 用户选择"重命名"选项, THE File_Tree SHALL 将该节点的名称替换为内联输入框，预填当前名称
3. WHEN 用户在内联输入框中修改名称并按 Enter, THE File_Explorer SHALL 在文件系统中执行重命名操作
4. WHEN 用户按 Escape 或输入框失焦且内容未变, THE File_Tree SHALL 取消重命名操作并恢复原始名称
5. IF 用户输入的新名称与同目录中已有项目重名, THEN THE File_Explorer SHALL 显示错误提示并阻止重命名
6. WHEN 重命名操作完成, THE File_Tree SHALL 更新节点显示并刷新父目录

### 需求 5：虚拟滚动优化

**用户故事：** 作为开发者，我希望在包含大量文件的项目中流畅浏览文件树，以便高效工作。

#### 验收标准

1. THE Virtual_Scroller SHALL 仅渲染可视区域内的文件树节点及上下缓冲区域的节点
2. WHEN 用户滚动文件树, THE Virtual_Scroller SHALL 动态计算并更新可视区域内的节点列表
3. THE Virtual_Scroller SHALL 保持与非虚拟滚动模式一致的视觉表现，包括缩进、图标和交互行为
4. WHEN 文件树节点总数少于 200, THE File_Tree SHALL 使用普通渲染模式而非虚拟滚动
5. WHEN 文件树节点总数达到或超过 200, THE File_Tree SHALL 自动切换到虚拟滚动模式

### 需求 6：集成与一致性

**用户故事：** 作为开发者，我希望新增功能与现有文件浏览器无缝集成，保持一致的用户体验。

#### 验收标准

1. THE File_Explorer SHALL 保留现有的所有功能，包括文件预览、拖拽、路径复制和"添加到聊天"
2. THE Context_Menu SHALL 将新增的文件操作选项与现有选项（Open in Terminal、Add to Chat、Copy Path）整合在同一菜单中
3. WHEN 文件操作（新建/删除/重命名）完成, THE Tree_Store SHALL 自动刷新受影响的目录
4. THE File_Explorer SHALL 遵循现有的设计令牌系统和 Tailwind CSS 4 样式规范

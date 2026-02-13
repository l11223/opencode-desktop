# 需求文档

## 简介

为 opencode 桌面应用的 Git Explorer 组件增加三项核心功能：提交历史浏览器（Commit Log Viewer）、Stash 操作管理、以及 Split Diff 视图切换。这些功能将提升日常 Git 工作流的效率，使用户无需离开应用即可完成常见的版本控制操作。

## 术语表

- **Git_Explorer**: 现有的 Git 文件变更浏览组件，位于 `packages/app/src/components/git-explorer.tsx`
- **Commit_Log_Viewer**: 新增的提交历史浏览子组件，展示 commit 列表及每个 commit 的 diff
- **Stash_Manager**: 新增的 stash 操作管理子组件，支持 save/pop/list/drop 操作
- **Diff_Viewer**: 现有的 diff 展示组件，通过 `useDiffComponent()` 获取，支持 unified 和 split 两种样式
- **SDK**: 应用的 SDK 层，通过 `useSDK()` 获取，可执行 shell 命令与后端交互
- **Commit_Entry**: 一条提交记录，包含 hash、作者、日期、提交信息等字段
- **Stash_Entry**: 一条 stash 记录，包含索引、分支名、描述信息等字段

## 需求

### 需求 1：提交历史浏览

**用户故事：** 作为开发者，我希望在 Git Explorer 中浏览提交历史，以便查看项目的变更记录和每个提交的具体改动。

#### 验收标准

1. WHEN 用户切换到提交历史视图, THE Commit_Log_Viewer SHALL 执行 `git log` 并展示提交列表，每条记录包含缩写 hash、作者、相对日期和提交信息
2. WHEN 用户点击某条提交记录, THE Commit_Log_Viewer SHALL 执行 `git show` 获取该提交的 diff 并在 Diff_Viewer 中展示
3. WHEN 提交历史列表滚动到底部, THE Commit_Log_Viewer SHALL 加载更多提交记录（分页加载）
4. WHEN `git log` 命令执行失败, THEN THE Commit_Log_Viewer SHALL 通过 `gitError` 函数格式化错误并通知用户
5. WHEN 仓库没有任何提交记录, THE Commit_Log_Viewer SHALL 展示空状态提示信息

### 需求 2：提交历史解析

**用户故事：** 作为开发者，我希望提交历史数据被正确解析，以便界面能准确展示每条提交的信息。

#### 验收标准

1. THE parseLog 函数 SHALL 将 `git log` 的原始输出解析为 Commit_Entry 数组，每个条目包含 hash、author、date 和 message 字段
2. WHEN `git log` 输出为空字符串, THE parseLog 函数 SHALL 返回空数组
3. THE parseLog 函数 SHALL 正确处理包含多行提交信息的 commit 记录
4. THE formatLog 函数 SHALL 将 Commit_Entry 数组格式化为可展示的字符串，包含缩写 hash、作者和提交信息
5. FOR ALL 有效的 Commit_Entry 数组，formatLog 然后 parseLog 的结果 SHALL 与原始数组等价（往返一致性）

### 需求 3：Stash 操作管理

**用户故事：** 作为开发者，我希望在 Git Explorer 中管理 stash，以便快速保存和恢复工作进度。

#### 验收标准

1. WHEN 用户点击 stash save 按钮并输入描述信息, THE Stash_Manager SHALL 执行 `git stash push -m <message>` 保存当前工作区变更
2. WHEN 用户点击 stash pop 按钮, THE Stash_Manager SHALL 执行 `git stash pop` 恢复最近的 stash 并从列表中移除
3. WHEN 用户打开 stash 列表, THE Stash_Manager SHALL 执行 `git stash list` 并展示所有 stash 条目
4. WHEN 用户点击某条 stash 的 drop 按钮, THE Stash_Manager SHALL 执行 `git stash drop <index>` 删除该条 stash
5. WHEN stash 操作执行失败, THEN THE Stash_Manager SHALL 通过 `gitError` 函数格式化错误并通知用户
6. WHEN stash 列表为空, THE Stash_Manager SHALL 展示空状态提示信息

### 需求 4：Stash 数据解析

**用户故事：** 作为开发者，我希望 stash 列表数据被正确解析，以便界面能准确展示每条 stash 的信息。

#### 验收标准

1. THE parseStash 函数 SHALL 将 `git stash list` 的原始输出解析为 Stash_Entry 数组，每个条目包含 index、branch 和 message 字段
2. WHEN `git stash list` 输出为空字符串, THE parseStash 函数 SHALL 返回空数组
3. THE parseStash 函数 SHALL 正确解析格式为 `stash@{N}: WIP on branch: message` 和 `stash@{N}: On branch: message` 的条目

### 需求 5：Split Diff 视图

**用户故事：** 作为开发者，我希望在 Git Explorer 的 diff 查看中切换 unified 和 split 视图，以便根据偏好选择最适合的代码对比方式。

#### 验收标准

1. THE Git_Explorer SHALL 在 diff 查看区域提供 unified/split 视图切换控件
2. WHEN 用户选择 split 视图, THE Diff_Viewer SHALL 以左右并排方式展示代码变更
3. WHEN 用户选择 unified 视图, THE Diff_Viewer SHALL 以上下合并方式展示代码变更
4. THE Git_Explorer SHALL 记住用户的视图偏好，在切换文件时保持选择的视图模式

### 需求 6：Git Explorer 集成

**用户故事：** 作为开发者，我希望新功能与现有 Git Explorer 无缝集成，以便获得统一的使用体验。

#### 验收标准

1. THE Git_Explorer SHALL 提供标签页或导航方式在"变更"、"提交历史"和"Stash"视图之间切换
2. WHEN 执行 stash save 或 stash pop 操作后, THE Git_Explorer SHALL 自动刷新文件变更列表
3. WHEN 切换分支后, THE Commit_Log_Viewer SHALL 自动刷新提交历史列表
4. THE Git_Explorer SHALL 保持现有的 stage/unstage/commit 功能不受影响

# 实现计划：Git 增强

## 概述

为 Git Explorer 新增提交历史浏览、Stash 管理和 Split Diff 视图切换。实现顺序：先扩展辅助函数和解析逻辑，再构建 UI 组件，最后集成到现有 GitExplorer 中。

## 任务

- [x] 1. 新增 CommitEntry 和 StashEntry 类型及解析函数
  - [x] 1.1 在 `git-explorer-helpers.ts` 中新增 `CommitEntry` 类型（hash, author, date, message）和 `parseLog` 函数，解析 `git log --format="%h%x00%an%x00%ar%x00%s"` 的 NUL 分隔输出
    - 空输入返回空数组，每行按 NUL 分割为 4 个字段
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 1.2 在 `git-explorer-helpers.ts` 中新增 `formatLog` 函数，将 `CommitEntry[]` 格式化为 `git log` 原始输出格式（NUL 分隔，换行分隔条目）
    - _Requirements: 2.4, 2.5_
  - [x] 1.3 在 `git-explorer-helpers.ts` 中新增 `StashEntry` 类型（index, branch, message）和 `parseStash` 函数，解析 `git stash list` 输出
    - 支持 `stash@{N}: WIP on branch: message` 和 `stash@{N}: On branch: message` 两种格式
    - 空输入返回空数组
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 1.4 在 `git-explorer-helpers.ts` 中新增 `formatStash` 函数，将 `StashEntry[]` 格式化为 `git stash list` 原始输出格式
    - _Requirements: 4.1, 4.3_
  - [ ]* 1.5 在 `git-explorer.test.ts` 中为 `parseLog` 新增单元测试
    - 测试空输入、单条记录、多条记录、特殊字符
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 1.6 在 `git-explorer.test.ts` 中为 `parseStash` 新增单元测试
    - 测试空输入、"WIP on" 格式、"On" 格式、多条记录
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 1.7 在 `git-explorer.test.ts` 中新增属性测试：Commit Log 往返一致性
    - **Property 1: Commit Log 往返一致性**
    - **Validates: Requirements 2.1, 2.5**
    - 使用 fast-check 生成随机 CommitEntry 数组，验证 `parseLog(formatLog(entries))` 等于原始数组
  - [ ]* 1.8 在 `git-explorer.test.ts` 中新增属性测试：Stash List 往返一致性
    - **Property 2: Stash List 往返一致性**
    - **Validates: Requirements 4.1, 4.3**
    - 使用 fast-check 生成随机 StashEntry 数组，验证 `parseStash(formatStash(entries))` 等于原始数组

- [x] 2. Checkpoint - 确保解析函数和测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 3. 实现 GitExplorer 组件的 Tab 导航和 Split Diff 切换
  - [x] 3.1 在 `git-explorer.tsx` 中引入 `Tabs` 组件，将现有变更列表包裹在 "Changes" tab 中，新增 "Log" 和 "Stash" 空 tab
    - 使用 `@opencode-ai/ui/tabs` 的 Tabs 组件
    - 保持现有 stage/unstage/commit 功能不变
    - _Requirements: 6.1, 6.4_
  - [x] 3.2 在 diff 查看区域标题栏添加 unified/split 切换按钮，将 `diffStyle` prop 传递给 `<Dynamic component={diffComponent}>`
    - 新增 `diffStyle` 和 `onDiffStyleChange` props
    - 默认值为 "unified"，切换文件时保持选择
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. 实现 Commit Log 视图
  - [x] 4.1 在 `git-explorer.tsx` 中实现 CommitLog 内部组件，渲染 `CommitEntry[]` 列表
    - 每条记录展示缩写 hash、作者、相对日期、提交信息
    - 点击条目触发 `onCommitClick` 回调
    - 空列表展示空状态提示
    - _Requirements: 1.1, 1.2, 1.5_
  - [x] 4.2 实现滚动加载更多功能，滚动到底部时触发 `onLoadLog` 回调
    - 使用 IntersectionObserver 或 scroll 事件检测
    - _Requirements: 1.3_
  - [x] 4.3 选中 commit 时在右侧 Diff_Viewer 中展示 commit diff，复用现有 diff 展示逻辑
    - 新增 `commitDiff` prop，格式与现有 `diff` prop 一致
    - _Requirements: 1.2_

- [x] 5. 实现 Stash 管理视图
  - [x] 5.1 在 `git-explorer.tsx` 中实现 StashList 内部组件，渲染 `StashEntry[]` 列表
    - 每条记录展示 stash 索引、分支名、描述信息
    - 第一条有 pop 和 drop 按钮，其余只有 drop 按钮
    - 空列表展示空状态提示
    - _Requirements: 3.2, 3.3, 3.4, 3.6_
  - [x] 5.2 实现 stash save 输入区域，包含描述输入框和保存按钮
    - 空描述时按钮禁用
    - 保存后清空输入框
    - _Requirements: 3.1_

- [x] 6. 集成与联调
  - [x] 6.1 为 GitExplorer 新增所有 commit log 和 stash 相关 props（log, onLoadLog, onCommitClick, commitDiff, stashes, onStashSave, onStashPop, onStashDrop, onLoadStashes）
    - 将 props 连接到对应的 tab 内容组件
    - _Requirements: 6.1_
  - [x] 6.2 确保 stash save/pop 操作后触发文件变更列表刷新，分支切换后触发提交历史刷新
    - 通过回调 props 的调用方在外部处理刷新逻辑
    - _Requirements: 6.2, 6.3_

- [x] 7. Final checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 标记 `*` 的任务为可选，可跳过以加速 MVP
- 每个任务引用具体需求以确保可追溯性
- 属性测试验证通用正确性，单元测试验证具体示例和边界情况
- Git 命令执行和错误处理复用现有 `gitError` 函数模式

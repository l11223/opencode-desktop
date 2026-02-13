# 实现计划：文件浏览器增强

## 概述

基于现有 FileExplorer/FileTree 组件，增量添加搜索过滤、文件操作和虚拟滚动能力。每个任务构建在前一个任务之上，测试作为子任务紧跟实现。

## Tasks

- [x] 1. 实现文件树过滤辅助函数
  - [x] 1.1 在 `file-tree-helpers.ts` 中添加 `matchesQuery` 和 `filterNodes` 纯函数
    - `matchesQuery(path, query)`: 大小写不敏感匹配路径或文件名
    - `filterNodes({ nodes, allNodes, query })`: 返回匹配文件及其祖先目录
    - 添加 `targetDir(node)`: 文件节点返回父目录，目录节点返回自身路径
    - 添加 `validateName(name, existing)`: 检查名称是否与已有名称重复
    - _Requirements: 1.2, 1.3, 2.2, 2.7, 4.5_

  - [ ]* 1.2 为 `matchesQuery`、`filterNodes`、`targetDir`、`validateName` 编写属性测试
    - 在 `file-tree-helpers.test.ts` 中使用 fast-check
    - **Property 1: 过滤正确性**
    - **Validates: Requirements 1.2, 1.3**
    - **Property 2: 目标目录解析**
    - **Validates: Requirements 2.2**
    - **Property 3: 名称唯一性验证**
    - **Validates: Requirements 2.7, 4.5**

  - [ ]* 1.3 为 `matchesQuery` 和 `filterNodes` 编写单元测试
    - 测试边界情况：空查询、空树、特殊字符、无匹配
    - 扩展现有 `file-tree.test.ts`
    - _Requirements: 1.2, 1.5_

- [x] 2. 实现搜索过滤 UI
  - [x] 2.1 在 `file-explorer.tsx` 的文件树面板顶部添加搜索输入框
    - 添加 query signal 和 150ms 防抖
    - 将防抖后的查询传递给 FileTree 的 `allowed` prop（通过 filterNodes 计算）
    - 无匹配时显示提示信息
    - 清空搜索框时恢复原始树状态
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

- [x] 3. Checkpoint
  - 确保所有测试通过，如有问题请告知。

- [x] 4. 实现文件操作模块
  - [x] 4.1 创建 `file-operations.ts`，实现 `createFileOperations` 函数
    - `create({ dir, name, type })`: 通过 shell 执行 `mkdir -p` 或 `touch`
    - `remove({ path })`: 通过 shell 执行 `rm -rf`
    - `rename({ oldPath, newName })`: 通过 shell 执行 `mv`
    - 错误处理通过 Promise chain，失败时返回 stderr 信息
    - _Requirements: 2.5, 3.3, 4.3_

  - [ ]* 4.2 为文件操作命令构造编写单元测试
    - 验证生成的 shell 命令字符串正确
    - _Requirements: 2.5, 3.3, 4.3_

- [x] 5. 实现内联输入和增强右键菜单
  - [x] 5.1 在 `file-tree.tsx` 中添加 InlineInput 组件
    - 复用 Node 组件的缩进和布局样式
    - 支持 Enter 提交、Escape 取消、失焦处理
    - 支持新建模式（空输入框）和重命名模式（预填名称）
    - _Requirements: 2.3, 2.4, 2.6, 4.2, 4.4_

  - [x] 5.2 增强 `file-explorer.tsx` 的 ContextMenu
    - 添加"新建文件"、"新建文件夹"、"重命名"、"删除"选项
    - 新建/重命名触发内联输入状态
    - 删除触发确认对话框
    - 操作完成后调用 `file.tree.refresh()` 刷新目录
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4, 4.1, 4.6, 6.2, 6.3_

- [x] 6. Checkpoint
  - 确保所有测试通过，如有问题请告知。

- [x] 7. 实现虚拟滚动
  - [x] 7.1 在 `file-tree-helpers.ts` 中添加 `flattenTree` 和 `visibleRange` 和 `shouldVirtualize` 函数
    - `flattenTree({ root, children, expanded, filter })`: 递归扁平化可见节点
    - `visibleRange({ scrollTop, height, rowHeight, overscan, total })`: 计算可见索引范围
    - `shouldVirtualize(count)`: count >= 200 返回 true
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [ ]* 7.2 为 `flattenTree`、`visibleRange`、`shouldVirtualize` 编写属性测试
    - **Property 4: 可见范围计算**
    - **Validates: Requirements 5.1, 5.2**
    - **Property 5: 虚拟滚动阈值**
    - **Validates: Requirements 5.4, 5.5**
    - **Property 6: 树扁平化正确性**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 7.3 创建 `virtual-scroller.tsx` 组件
    - 固定行高 24px，可配置 overscan（默认 5）
    - 通过 scrollTop signal 和 visibleRange 计算渲染切片
    - 使用 padding-top/padding-bottom 模拟完整滚动高度
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 7.4 在 FileTree 中集成虚拟滚动
    - 使用 flattenTree 将递归树扁平化
    - 根据 shouldVirtualize 决定渲染模式
    - 虚拟模式下使用 VirtualScroller 包裹扁平节点列表
    - 保持缩进、图标、拖拽等现有行为
    - _Requirements: 5.3, 5.4, 5.5, 6.1_

- [x] 8. 集成与最终验证
  - [x] 8.1 确保所有现有功能正常工作
    - 文件预览、拖拽、路径复制、添加到聊天
    - 搜索过滤与虚拟滚动协同工作
    - 文件操作后树自动刷新
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 9. Final Checkpoint
  - 确保所有测试通过，如有问题请告知。

## 备注

- 标记 `*` 的任务为可选，可跳过以加速 MVP
- 每个任务引用具体需求以确保可追溯性
- Checkpoint 确保增量验证
- 属性测试验证通用正确性，单元测试验证具体边界
- 所有代码遵循 AGENTS.md 风格指南：单词变量名、const over let、early returns、no destructuring

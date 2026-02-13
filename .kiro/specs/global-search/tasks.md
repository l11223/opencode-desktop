# 实现计划：全局搜索

## 概述

基于设计文档，将全局搜索功能拆分为增量实现步骤。从纯函数辅助模块开始，逐步构建 UI 组件，最后集成到现有系统中。所有新代码位于 `packages/app/src/components/` 目录下。

## 任务

- [x] 1. 实现搜索辅助函数模块
  - [x] 1.1 创建 `packages/app/src/components/search-helpers.ts`，实现以下纯函数：
    - `group(matches)`: 将扁平匹配数组按文件路径分组为 `GroupedResult[]`
    - `pattern(query, regex)`: 构建搜索 pattern，regex=false 时转义特殊字符
    - `escape(text)`: 转义正则特殊字符
    - `truncate(groups, limit)`: 截断超出 limit 的结果
    - `summary(groups)`: 计算文件数和匹配数
    - `addHistory(history, entry, max)`: 添加历史记录，去重并限制上限
    - 导出 `GroupedResult`、`HistoryEntry` 类型
    - _Requirements: 2.3, 3.1, 3.2, 3.5, 3.6, 5.2, 5.3, 7.1, 7.2_

  - [ ]* 1.2 编写 `search-helpers.ts` 的单元测试
    - 创建 `packages/app/src/components/search-helpers.test.ts`
    - 测试 `group`: 空数组、单文件多匹配、多文件混合
    - 测试 `pattern`: 无特殊字符、含正则元字符、空字符串
    - 测试 `escape`: 各种正则特殊字符 `( ) [ ] { } + * ? ^ $ | . \`
    - 测试 `truncate`: 恰好等于 limit、超过 limit、少于 limit
    - 测试 `summary`: 空分组、单分组、多分组
    - 测试 `addHistory`: 空历史、满历史、重复条目
    - _Requirements: 2.3, 3.1, 3.6, 5.2, 7.1, 7.2_

  - [ ]* 1.3 编写属性测试：分组保留所有匹配
    - **Property 1: 分组保留所有匹配且按文件聚合**
    - **Validates: Requirements 2.3, 3.1**

  - [ ]* 1.4 编写属性测试：摘要计数一致性
    - **Property 2: 摘要计数与分组数据一致**
    - **Validates: Requirements 3.2, 3.5**

  - [ ]* 1.5 编写属性测试：截断尊重上限
    - **Property 3: 截断尊重上限**
    - **Validates: Requirements 3.6**

  - [ ]* 1.6 编写属性测试：字面量模式转义正确性
    - **Property 4: 字面量模式转义的正确性（round-trip）**
    - **Validates: Requirements 5.2**

  - [ ]* 1.7 编写属性测试：正则模式透传
    - **Property 5: 正则模式透传**
    - **Validates: Requirements 5.3**

  - [ ]* 1.8 编写属性测试：历史记录添加
    - **Property 6: 历史记录添加保留新条目且尊重上限**
    - **Validates: Requirements 7.1, 7.2**

- [x] 2. Checkpoint — 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 3. 实现搜索面板 UI 组件
  - [x] 3.1 创建 `packages/app/src/components/search-panel.tsx`
    - 实现 `SearchPanel` 组件，接收 `onOpenFile(path, line)` 回调
    - 搜索输入框：文本输入 + 正则切换按钮（`.*` 图标）+ 大小写切换按钮（`Aa` 图标）
    - 使用 `useSDK` 获取 SDK client，调用 `client.find.text({ pattern })` 执行搜索
    - 300ms 防抖：使用 `setTimeout` + 清除前一个 timer
    - 取消前一次搜索：使用 AbortController
    - 搜索结果渲染：按文件分组，每个文件可折叠，匹配行显示行号和高亮文本
    - 搜索摘要：顶部显示文件数和匹配数
    - 截断提示：超过 1000 条时显示提示
    - 加载状态：搜索中显示 Spinner
    - 错误状态：显示错误信息
    - 空结果状态：显示"无匹配结果"
    - 搜索历史：上/下方向键导航，使用 `persisted` 持久化到 localStorage
    - Escape 键：失去焦点但保持面板打开
    - 遵循设计令牌系统和 Tailwind CSS 4 样式
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.1_

- [x] 4. 集成到 session 页面和命令系统
  - [x] 4.1 在 `packages/app/src/pages/session.tsx` 中集成搜索面板
    - 新增 `searchOpen` 信号控制搜索面板可见性
    - 在 session 页面布局中条件渲染 `SearchPanel`
    - 搜索结果点击时通过 `useFile` 的 `load` 和 `tab` 打开文件
    - _Requirements: 4.1, 8.3_

  - [x] 4.2 在 `packages/app/src/pages/session/use-session-commands.tsx` 中注册搜索命令
    - 注册 `search.global` 命令，绑定 `mod+shift+f` 快捷键
    - 命令触发时打开搜索面板并聚焦输入框
    - _Requirements: 1.1, 1.2, 8.2_

  - [x] 4.3 在 `packages/app/src/i18n/en.ts` 和 `packages/app/src/i18n/zh.ts` 中添加搜索相关的国际化文本
    - 添加命令标题、搜索占位符、无结果提示、截断提示、错误提示等翻译键
    - _Requirements: 8.4_

- [x] 5. Final checkpoint — 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 标记 `*` 的任务为可选，可跳过以加速 MVP
- 每个任务引用具体需求以确保可追溯性
- Checkpoint 确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界情况

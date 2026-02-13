# 需求文档

## 简介

对 opencode 桌面应用进行全面的 UI 视觉打磨，覆盖 File Explorer、Git Explorer、终端错误覆盖层、侧边栏会话项、全局微交互、侧面板、空状态、滚动条等区域。目标是达到 Kiro/Cursor 级别的视觉品质，所有改动均为 CSS/样式层面的精细调整，不涉及新功能开发。

## 术语表

- **File_Explorer**: 文件浏览器组件，包含左侧目录树面板和右侧文件预览面板
- **Git_Explorer**: Git 浏览器组件，包含提交输入区、变更文件列表、diff 预览面板
- **Terminal_Overlay**: 终端面板中的错误/重连覆盖层
- **Side_Panel**: 右侧面板，包含 File Explorer / Git Explorer / Review 标签页
- **Session_Item**: 侧边栏中的会话列表项
- **Empty_State**: 各面板在无内容时显示的占位状态
- **Interactive_Element**: 按钮、输入框、列表项等可交互的 UI 元素
- **Scrollbar**: 面板内的滚动条样式

## 需求

### 需求 1：File Explorer 视觉打磨

**用户故事：** 作为开发者，我希望文件浏览器的视觉层次更清晰、交互更精致，以获得专业级的使用体验。

#### 验收标准

1. WHEN File_Explorer 的目录树面板宽度被用户拖拽调整, THE File_Explorer SHALL 实时更新树面板宽度并保持最小宽度 180px
2. WHEN 没有文件被选中, THE File_Explorer SHALL 在预览区域显示包含文件图标和提示文字的空状态组件，使用 text-text-weaker 颜色和居中布局
3. WHEN 用户点击"Add to chat"按钮, THE File_Explorer SHALL 使用语义化按钮令牌（bg-button-primary-base / hover:bg-button-primary-hover）渲染该按钮
4. WHEN 文件预览头部栏显示时, THE File_Explorer SHALL 为头部栏应用 bg-surface-base 背景色以区分内容区域
5. WHEN 文件内容正在加载, THE File_Explorer SHALL 显示 Spinner 动画组件替代纯文本"Loading..."
6. WHEN 文件加载失败并显示重试按钮, THE File_Explorer SHALL 使用与应用其他按钮一致的语义化样式（shadow-interactive 阴影、radius-interactive 圆角）

### 需求 2：Git Explorer 视觉打磨

**用户故事：** 作为开发者，我希望 Git 浏览器的提交区域更有层次感、文件列表更易读，以提升 Git 操作效率。

#### 验收标准

1. WHEN 提交输入区域显示时, THE Git_Explorer SHALL 为提交区域应用 bg-surface-base 背景色和 shadow-xs 阴影以增强视觉层次
2. WHEN 变更文件列表项渲染时, THE Git_Explorer SHALL 将列表项高度设为至少 28px（h-7）以提供舒适的点击区域
3. WHEN 文件状态指示器（M、A、D、?）渲染时, THE Git_Explorer SHALL 使用语义化 CSS 类（text-status-modified、text-status-added 等）替代内联 style 属性
4. WHEN 用户使用触摸设备时, THE Git_Explorer SHALL 始终显示暂存/取消暂存操作按钮，而非仅在悬停时显示
5. WHEN diff 面板正在加载时, THE Git_Explorer SHALL 显示 Spinner 动画组件替代纯文本"Loading diff..."
6. WHEN 暂存区和变更区均无文件时, THE Git_Explorer SHALL 显示包含图标和提示文字的空状态组件
7. WHEN 可折叠区域的标题渲染时, THE Git_Explorer SHALL 为标题应用 text-12-medium 字重和 py-2 垂直间距以增强视觉权重

### 需求 3：终端错误覆盖层打磨

**用户故事：** 作为开发者，我希望终端的错误和重连提示与应用整体视觉风格一致，以获得统一的体验。

#### 验收标准

1. WHEN 终端错误覆盖层显示时, THE Terminal_Overlay SHALL 使用卡片样式渲染（shadow-panel 阴影、radius-card 圆角、bg-surface-raised-base 背景色）
2. WHEN 重试按钮显示时, THE Terminal_Overlay SHALL 使用语义化按钮令牌（shadow-interactive 阴影、radius-interactive 圆角）渲染按钮
3. WHEN 错误覆盖层出现时, THE Terminal_Overlay SHALL 应用 fade-in 过渡动画

### 需求 4：侧边栏会话项打磨

**用户故事：** 作为用户，我希望侧边栏的会话列表项更精致，以便快速识别会话状态。

#### 验收标准

1. WHEN 已归档的会话项显示归档图标时, THE Session_Item SHALL 将归档图标颜色设为 text-icon-weaker 并降低整行不透明度至 0.7
2. WHEN 搜索高亮 mark 标签渲染时, THE Session_Item SHALL 使用 bg-surface-warning-base/40 背景色和 rounded-sm 圆角样式

### 需求 5：全局微交互优化

**用户故事：** 作为用户，我希望应用的交互反馈更细腻流畅，以获得高品质的操作手感。

#### 验收标准

1. THE Desktop_App SHALL 将全局 CSS 过渡规则从通配符选择器（*）限定为仅应用于 Interactive_Element（button、input、select、a、[role="button"]、[role="tab"]）
2. WHEN 上下文菜单项被悬停时, THE Desktop_App SHALL 应用 150ms 的背景色过渡动画
3. WHEN 可折叠区域展开或收起时, THE Desktop_App SHALL 应用平滑的高度过渡动画
4. WHEN 按钮被按下（active 状态）时, THE Desktop_App SHALL 应用 scale(0.98) 缩放变换以提供按压反馈
5. THE Desktop_App SHALL 对所有 Interactive_Element 应用一致的 focus-visible 样式（2px ring、ring-offset-2、ring-border-active 颜色）

### 需求 6：侧面板打磨

**用户故事：** 作为用户，我希望侧面板的标签栏和控件更精致，以获得清晰的视觉层次。

#### 验收标准

1. WHEN Side_Panel 标签栏渲染时, THE Side_Panel SHALL 在标签栏底部应用 border-b border-border-base 分隔线以区分标签栏和内容区域
2. WHEN "changes"/"all" 切换标签渲染时, THE Side_Panel SHALL 为标签应用 px-3 py-1 内边距和 radius-tag 圆角以增强视觉权重
3. WHEN 面板折叠拖拽手柄区域渲染时, THE Side_Panel SHALL 在手柄区域显示一条 2px 宽的竖线指示器，使用 border-border-base 颜色，悬停时变为 border-border-active

### 需求 7：空状态统一

**用户故事：** 作为用户，我希望所有面板的空状态风格一致，以获得统一的视觉体验。

#### 验收标准

1. THE Desktop_App SHALL 对所有空状态（无文件、无变更、无会话）使用统一的组件样式：居中布局、图标（size-8、text-icon-weaker）、提示文字（text-14-regular、text-text-weaker）、8px 垂直间距
2. WHEN 空状态组件渲染时, THE Empty_State SHALL 使用与面板功能对应的语义化图标（文件浏览器用 file 图标、Git 浏览器用 branch 图标、会话列表用 chat 图标）

### 需求 8：流畅度系统优化

**用户故事：** 作为用户，我希望应用的动画和渲染更加流畅，以获得丝滑的操作体验。

#### 验收标准

1. THE Desktop_App SHALL 对所有动画元素应用 will-change 提示（will-change: transform 用于缩放动画、will-change: opacity 用于淡入淡出），以触发 GPU 加速渲染
2. WHEN 面板拖拽调整大小时, THE Desktop_App SHALL 使用 requestAnimationFrame 节流 resize 回调，确保拖拽过程中保持 60fps 流畅度
3. WHEN 长列表（超过 50 项）渲染时, THE Desktop_App SHALL 使用 content-visibility: auto 属性优化离屏元素的渲染性能
4. THE Desktop_App SHALL 确保所有 CSS 过渡仅使用可合成属性（transform、opacity），避免触发布局重排的属性动画（width、height、top、left）
5. WHEN 主题切换时, THE Desktop_App SHALL 使用 color-scheme 属性配合 CSS 自定义属性实现颜色过渡，避免逐元素重绘

### 需求 9：滚动条样式

**用户故事：** 作为用户，我希望应用的滚动条纤细美观且与主题匹配，以获得精致的视觉体验。

#### 验收标准

1. THE Desktop_App SHALL 为所有可滚动面板应用自定义滚动条样式：6px 宽度、圆角端点、使用 surface-raised-base-hover 颜色
2. WHEN 用户悬停在可滚动面板上时, THE Scrollbar SHALL 从透明渐变为可见状态，使用 150ms 过渡动画
3. WHEN 面板使用 no-scrollbar 类时, THE Desktop_App SHALL 保留该行为不做修改，仅对未使用 no-scrollbar 的面板应用自定义滚动条

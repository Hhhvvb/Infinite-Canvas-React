# Infinite Canvas (TypeScript)

一个基于 React + TypeScript 的无限画布项目，支持便签节点、连线、自由笔迹、缩放平移、撤销重做、工程导入导出。


## 项目定位

- 目标问题：在浏览器中实现接近白板产品的核心交互体验。
- 技术重心：状态管理、坐标系转换、SVG 路径渲染、编辑器级交互细节。
- 工程特征：非 Demo 化，包含 Undo/Redo、持久化、JSON 工程化数据流与图片导出。

## 在线能力概览

- 无限画布视口（平移 + 缩放，鼠标中键拖拽，滚轮缩放）
- 多工具模式：选择、便签、画笔、橡皮擦
- 节点系统：创建、拖拽、缩放、双击编辑、颜色/形状修改
- 连线系统：锚点拖拽建边，贝塞尔曲线渲染，支持选中与删除
- 笔迹系统：自由绘制，自动转换为 path 节点并可被管理
- 历史系统：Undo / Redo 快照栈
- 数据系统：
	- 自动持久化（localStorage）
	- 导出 PNG（按内容包围盒裁剪）
	- 导出/导入 JSON 工程文件

## 技术栈

- 框架：React 19 + TypeScript
- 构建：Vite
- 状态管理：Zustand（含 persist 中间件）
- 图像导出：html-to-image
- 代码质量：ESLint

## 架构拆解

### 1. 统一状态中心（Zustand）

- 画布核心状态集中在 store：nodes、edges、camera、selection、tool、history。
- 通过细粒度 selector + `memo` 降低不必要渲染。
- `useCanvasStore.getState()` 用于交互 Hook 内的即时状态读取，避免高频鼠标事件导致组件反复订阅。

### 2. 双坐标系映射

- 屏幕坐标（`clientX/clientY`）与世界坐标通过相机参数换算：

$$
worldX = \frac{clientX - camera.x}{camera.zoom}, \quad
worldY = \frac{clientY - camera.y}{camera.zoom}
$$

- 画布容器统一使用 `translate + scale` 做视口变换，节点与连线都在世界坐标系下计算。

### 3. 连线渲染与可用性优化

- 连线路径使用三次贝塞尔曲线，控制点根据锚点方向和节点距离动态计算。
- 视觉线条细，但交互命中区采用透明粗描边（Fat Hitbox），显著提升连线选中体验。

### 4. 笔迹建模

- 绘制时采样点并做最小距离阈值过滤，减少冗余点。
- 停笔后计算笔迹包围盒，把绝对坐标转换为相对坐标，最终落盘为 `shape = 'path'` 节点。
- 渲染层使用平滑路径算法生成更自然的手写线条。

### 5. 历史与持久化

- `saveHistory -> undo -> redo` 采用快照栈模型（past/future）。
- 快照使用深拷贝，避免引用污染。
- `persist` 仅持久化必要状态（nodes/nodeIds/edges/配置），避免短暂交互态污染恢复现场。

### 6. 导出系统

- JSON 导出用于工程级存档和回放。
- PNG 导出不是全屏截图，而是先计算内容包围盒，再平移对齐导出区域，得到干净的作品图。

## 快捷键

- `V`：选择工具
- `N`：便签工具
- `P`：画笔工具
- `E`：橡皮擦
- `Ctrl/Cmd + Z`：撤销
- `Ctrl/Cmd + Y` 或 `Cmd + Shift + Z`：重做
- `Delete/Backspace`：删除选中节点或连线

## 项目结构

```text
src/
	components/
		EdgeLayer/        # 连线渲染层
		NodeWrapper/      # 节点壳层（选择、锚点、缩放）
		Note/             # 便签编辑与展示
		PropertyMenu/     # 节点属性浮层
		Toolbar/          # 工具栏与导入导出
	hooks/
		useCanvasInteractions.ts  # 鼠标事件与画布交互主链路
		useKeyboardShortcuts.ts   # 全局快捷键
		useExport.ts              # PNG/JSON 导出
	store/
		useCanvasStore.ts         # 核心状态与业务 action
	utils/
		geometry.ts               # 几何计算（锚点、贝塞尔、笔迹路径）
		layout.ts                 # 文字布局（动态字体）
		file.ts                   # 文件下载工具
```

## 本地运行

```bash
npm install
npm run dev
```

构建产物：

```bash
npm run build
npm run preview
```
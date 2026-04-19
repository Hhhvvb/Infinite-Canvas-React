## ✨ 核心特性与技术架构 (Core Features & Architecture)

本项目并非简单的 DOM 拖拽玩具，而是一个致力于探索商业级白板性能与交互体验的前端工程实践。

### 🧠 状态引擎与时间漫游 (State & Time-Travel Engine)
* **原子化状态管理**：摒弃传统 React Context 导致的全量重渲染，基于 `Zustand` 实现扁平化 Store，通过 `memo` 与颗粒度状态订阅保障极速渲染。
* **深拷贝防污染时间线**：原生实现支持 Undo/Redo 的历史快照栈。采用深拷贝切断内存引用污染，并智能拦截 `activeElement` 焦点，完美兼容浏览器原生的 Input 文本撤销机制。
* **本地防丢持久化**：接入 `persist` 中间件，核心画布状态实时向 `localStorage` 同步，刷新不丢失。

### 🎨 动态矢量渲染引擎 (Dynamic SVG Rendering)
* **三次贝塞尔曲线 (Cubic Bezier)**：采用动态数学运算生成控制点，实现平滑、自然的连线路径渲染，拒绝生硬的直线切割。
* **隐形巨大化热区 (Fat Hitbox)**：利用 CSS 伪元素与 SVG `strokeWidth` 垫层技巧，构建无感知的点击判定区，将 2px 极细线条与微小锚点的命中判定率提升至 100%。
* **属性动态响应**：支持便签文本、字体大小、画笔粗细及颜色主题的实时双向绑定与多节点状态级联更新。

### ⚡ 交互哲学与微操打磨 (Advanced Interaction & UX)
* **反向缩放补偿 (Inverse Zoom Compensation)**：深度践行菲茨定律 (Fitts's Law)。计算相机的 `1/zoom` 倒数作为 CSS 变量传入，确保节点锚点的隐形感应力场 (Hover Aura) 在**极值缩放**下依然保持恒定的物理尺寸与完美手感。
* **单键指令台与全局热键**：抽离纯逻辑 Hook `useKeyboardShortcuts`，支持业界标配的 `V/N/P/E` 单键工具秒切，以及防冲突的 `Ctrl+Z` / `Ctrl+Y` 组合键矩阵。
* **智能级联销毁 (Cascading Deletion)**：实现拓扑图级别的节点关系管理，删除节点时智能追踪并销毁依附其上的源/目标连线。

### 📐 坐标系与数据流转 (Viewport Math & I/O)
* **双坐标系矩阵映射**：利用 `transform: translate(x,y) scale(z)` 处理视口的无极缩放与平移，实现屏幕物理坐标与画布逻辑坐标的精准映射。
* **包围盒精算导出 (Bounding Box Export)**：弃用粗暴的全屏 DOM 截图。通过遍历计算所有 `(x,y,w,h)` 获取最小外接矩形，结合空间坐标系重置技术，导出**无 UI 干扰、自动居中留白、Scale 1 无损画质**的纯净 PNG 作品。
* **工程序列化**：支持将当前画板的所有拓扑关系与参数配置一键序列化为 `.json` 存档，并支持本地文件读取反序列化。
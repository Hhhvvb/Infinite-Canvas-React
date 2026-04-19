import { useCanvasStore } from '@/store/useCanvasStore';
import { useCanvasInteractions } from '@/hooks/useCanvasInteractions';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { NodeWrapper } from '@/components/NodeWrapper/NodeWrapper';
import { EdgeLayer } from '@/components/EdgeLayer/EdgeLayer';
import { PropertyMenu } from './components/PropertyMenu/PropertyMenu';
import { getSvgPathFromStroke } from './utils/geometry'; 
import './App.css';

/**
 * InfiniteCanvasBoard 核心入口组件
 * * 核心架构说明：
 * 1. 状态引擎 (Store)：基于 Zustand 实现扁平化、原子化管理，内置基于绝对深拷贝的撤销/重做(Undo/Redo)历史栈与本地持久化(Persist)能力。
 * 2. 交互分层 (Interactions)：
 * - 鼠标/触控引擎：由 `useCanvasInteractions` Hook 统一接管视口平移、无极缩放、元素拖拽与连线逻辑。
 * - 全局热键引擎：由 `useKeyboardShortcuts` Hook 独立拦截单键工具切换(V/N/P/E)、全局快捷键及焦点冲突屏蔽。
 * 3. 渲染与性能 (Render)：
 * - 节点级订阅：通过 `NodeWrapper` 实现状态的精细化订阅，彻底避免画布级的全量 Re-render。
 * - 触控补偿：引入“反向缩放补偿”(--inv-zoom)技术与巨大化隐形热区，解决极值缩放下的交互精度衰减问题。
 * 4. 数据流转 (I/O)：剥离纯 DOM 截图，采用节点包围盒(Bounding Box)精算算法，实现无 UI 干扰的纯净 PNG 导出与 JSON 工程序列化。
 */

export default function InfiniteCanvas() {
  // 1. 从 Store 中订阅驱动 UI 表现的基础状态
  const camera = useCanvasStore((state) => state.camera);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const isPanning = useCanvasStore((state) => state.isPanning);
  const nodeIds = useCanvasStore((state) => state.nodeIds);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const interactions = useCanvasInteractions();
  const currentStroke = useCanvasStore((state) => state.currentStroke);
  const penSettings = useCanvasStore((state) => state.penSettings);
  const STROKE_COLOR_MAP: Record<string, string> = {
    yellow: '#fde047', 
    blue: '#7dd3fc', 
    pink: '#f9a8d4', 
    green: '#86efac', 
    purple: '#d8b4fe',
  };

  // 2. 注册全局键盘快捷键
  useKeyboardShortcuts();

  return (
    <div
      className={`viewport ${
        isPanning ? 'grabbing' : activeTool === 'cursor' ? 'grab' : 'crosshair'
      }`}
      onMouseDown={interactions.handleMouseDown}
      onMouseMove={interactions.handleMouseMove}
      onMouseUp={interactions.handleMouseUp}
      onMouseLeave={interactions.handleMouseUp}
      onWheel={interactions.handleWheel}
    >
      {/* 侧边工具栏：只在 activeTool 变化时重新渲染 */}
      <Toolbar 
        activeTool={activeTool}
        onToolChange={setActiveTool}
      />

      <PropertyMenu />

      {/* 无限画布主容器：处理虚拟相机的 Transform 变换 */}
      <div
        id="canvas-export-target"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
        }}
      >
        {/* 背景网格 */}
        <div className='grid-bg' />

        <EdgeLayer />

        {currentStroke && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 99 }}>
             <path
                d={getSvgPathFromStroke(currentStroke)}
                fill="none"
                stroke={STROKE_COLOR_MAP[penSettings.color] || '#3b82f6'} 
                strokeWidth={penSettings.size}
                strokeLinecap="round"
                strokeLinejoin="round"
             />
          </svg>
        )}

        {/* 节点渲染列表 */}
        {nodeIds.map((id) => (
          <NodeWrapper key={id} id={id} />
        ))}
      </div>
    </div>
  );
}
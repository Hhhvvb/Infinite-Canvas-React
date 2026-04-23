import { useCanvasStore } from '@/store/useCanvasStore';
import { useCanvasInteractions } from '@/hooks/useCanvasInteractions';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { NodeWrapper } from '@/components/NodeWrapper/NodeWrapper';
import { EdgeLayer } from '@/components/EdgeLayer/EdgeLayer';
import { PropertyMenu } from './components/PropertyMenu/PropertyMenu';
import { getSvgPathFromStroke } from './utils/geometry'; 
import './App.css';

export default function InfiniteCanvas() {
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

  // 注册全局键盘快捷键
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
// import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useCanvasInteractions } from '@/hooks/useCanvasInteractions';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { NodeWrapper } from '@/components/NodeWrapper/NodeWrapper';
import { EdgeLayer } from '@/components/EdgeLayer/EdgeLayer';
import { PropertyMenu } from './components/PropertyMenu/PropertyMenu';
import './App.css';

/**
 * InfiniteCanvasBoard 核心入口组件
 * * 架构说明：
 * 1. 状态管理：通过 Zustand (useCanvasStore) 实现扁平化、原子化的状态管理。
 * 2. 交互逻辑：通过 useCanvasInteractions 钩子将复杂的鼠标/滚轮事件处理逻辑彻底抽离。
 * 3. 性能优化：通过 NodeWrapper 实现节点级的精细化渲染订阅，避免画布全量 Re-render。
 */
export default function InfiniteCanvas() {
  // 1. 从 Store 中订阅驱动 UI 表现的基础状态
  // 注意：这里没有引入 nodes 数组，避免了节点增删改导致的全量渲染
  const camera = useCanvasStore((state) => state.camera);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const isPanning = useCanvasStore((state) => state.isPanning);
  const nodeIds = useCanvasStore((state) => state.nodeIds);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);

  // 2. 注入封装好的画布交互 Hook
  // 所有的坐标计算、平移、缩放、增删节点逻辑都在内部处理
  const interactions = useCanvasInteractions();

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
        {/* 节点渲染列表 */}
        {/* 这里只遍历 ID 列表，具体的节点渲染逻辑被下沉到了 NodeWrapper 中 */}
        {nodeIds.map((id) => (
          <NodeWrapper key={id} id={id} />
        ))}
      </div>
    </div>
  );
}
import React, { useState } from 'react';

type ToolType = 'cursor' | 'text' | 'rect' | 'circle';

interface CanvasNode {
  id:string;
  type: ToolType;
  x: number;
  y: number;
  content?: string;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export default function InfiniteCanvas() {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('cursor');
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (target.closest('.toolbar')) return ;

    const nodeEl = target.closest('.test-node');
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-id');
      if (nodeId && activeTool === 'cursor') {
        setDraggingNodeId(nodeId);
      }
      return ;
    }
    
    if (activeTool === 'cursor' || e.button === 1) {
      setIsPanning(true);
      return ;
    }

    const worldX = (e.clientX - camera.x) / camera.zoom;
    const worldY = (e.clientY - camera.y) / camera.zoom;

    const newNode: CanvasNode = {
      id: Date.now().toString(),
      type: activeTool,
      x: worldX,
      y: worldY,
      content: activeTool === 'text' ? '双击编辑' : ''
    }

    setNodes([...nodes, newNode]);
    setActiveTool('cursor'); // 创建完节点后切回选择工具
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingNodeId) {
      setNodes((prev) => prev.map(node => {
        if (node.id === draggingNodeId) {
          return {
            ...node,
            x: node.x + e.movementX / camera.zoom,
            y: node.y + e.movementY / camera.zoom,
          }
        }
        return node;
      }));
      return; 
    }

    if (isPanning) {
      setCamera((prev) => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const zoomSensitivity = 0.05;
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(0.1, Math.min(5, camera.zoom + delta * zoomSensitivity));
    if (newZoom === camera.zoom) return;

    const scaleRatio = newZoom / camera.zoom;
    const newX = e.clientX - (e.clientX - camera.x) * scaleRatio;
    const newY = e.clientY - (e.clientY - camera.y) * scaleRatio;
    setCamera({
        x: newX,
        y: newY,
        zoom: newZoom,
    })
  };

  const getNodeClassName = (type: ToolType) => {
    if (type === 'text') return 'test-node node-text';
    if (type === 'rect') return 'test-node node-rect';
    if (type === 'circle') return 'test-node node-circle';
    return 'test-node';
  }

  return (
    <div
      className={`viewport ${isPanning ? 'grabbing' : activeTool === 'cursor' ? 'grab' : 'crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >

      <div className='toolbar'>
        <button 
          className={`tool-btn ${activeTool === 'cursor' ? 'active' : ''}`}
          onClick={() => setActiveTool('cursor')} title="选择/拖动画布 (V)"
        >👆</button>
        <button 
          className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTool('text')} title="便签 (N)"
        >📝</button>
        <button 
          className={`tool-btn ${activeTool === 'rect' ? 'active' : ''}`}
          onClick={() => setActiveTool('rect')} title="矩形 (R)"
        >🟦</button>
        <button 
          className={`tool-btn ${activeTool === 'circle' ? 'active' : ''}`}
          onClick={() => setActiveTool('circle')} title="圆形 (C)"
        >🔴</button>
      </div>

      <div
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
        }}
      >
        <div className='grid-bg' />

        {nodes.map((node) => (
          <div
            key={node.id}
            data-id={node.id}
            className={getNodeClassName(node.type)}
            style={{
              left: node.x,
              top: node.y,
              transform: 'translate(-50%, -50%)', // 让节点以中心为基准定位
              zIndex: draggingNodeId === node.id ? 100 : 1, // 拖动时置顶
              boxShadow: draggingNodeId === node.id ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : undefined // 拖动时添加阴影
            }}
          >
            {node.type === 'text' && (
              <>
                <strong>便签</strong>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px'}}>
                  {node.content}
                </p>
              </>
            )}
            </div>
        ))}
      </div>
    </div>
  );
}
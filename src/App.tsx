import React, { useState } from 'react';
import type { Camera, CanvasNode, ToolType } from '@/types';
import { Note } from '@/components/Note';
import { Toolbar } from '@/components/Toolbar';
import './App.css';

export default function InfiniteCanvas() {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('cursor');
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [resizingHandle, setResizingHandle] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (target.isContentEditable || target.closest('[contenteditable="true"]')) return; // 点击可编辑元素时不触发画布操作
    if (target.closest('.toolbar')) return ; // 点击工具栏时不触发画布操作

    const resizeTarget = target.closest('.resize-handle') || target.closest('.edge-handle');
    if (resizeTarget) {
      const dir = resizeTarget.getAttribute('data-dir');
      if (dir) setResizingHandle(dir);
      return ;
    }

    const nodeEl = target.closest('.test-node');
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-id');
      if (nodeId) {
        setSelectedNodeId(nodeId);
        if (activeTool === 'cursor') setDraggingNodeId(nodeId);
      }
      return ;
    }

    setSelectedNodeId(null);
    
    if (activeTool === 'cursor' || e.button === 1) {
      setIsPanning(true);
      return ;
    }

    const defaultW = 200;
    const defaultH = 120;
    const worldX = (e.clientX - camera.x) / camera.zoom - defaultW / 2;
    const worldY = (e.clientY - camera.y) / camera.zoom - defaultH / 2;

    const newNode: CanvasNode = {
      id: Date.now().toString(),
      type: activeTool,
      x: worldX,
      y: worldY,
      w: defaultW,
      h: defaultH,
      content: activeTool === 'text' ? '双击编辑' : ''
    }

    setNodes([...nodes, newNode]);
    setActiveTool('cursor'); // 创建完节点后切回选择工具
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizingHandle && selectedNodeId) {
      const dx = e.movementX / camera.zoom;
      const dy = e.movementY / camera.zoom;
      setNodes((prev) => prev.map(node => {
        if (node.id === selectedNodeId) {
          let { x, y, w, h } = node;
          
          if (resizingHandle.includes('r')) {
            w = Math.max(50, w + dx);
          }
          if (resizingHandle.includes('b')) {
            h = Math.max(50, h + dy);
          }
          if (resizingHandle.includes('l')) {
            const newW = w - dx;
            if (newW >= 50) {
              w = newW;
              x += dx;
            } else {
              x += w - 50;
              w = 50;
            }
          }
          if (resizingHandle.includes('t')) {
            const newH = h - dy;
            if (newH >= 50) {
              h = newH;
              y += dy;
            } else {
              y += h - 50;
              h = 50;
            }
          }
          return { ...node, x, y, w, h };
        }
        return node;
      }))
      return ;
    }

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
    setResizingHandle(null);
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

      <Toolbar 
        activeTool={activeTool}
        onToolChange={(tool) => setActiveTool(tool)}
      />

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
            className={`${getNodeClassName(node.type)} ${selectedNodeId === node.id ? 'selected' : ''}`}
            style={{
              left: node.x,
              top: node.y,
              width: node.w,
              height: node.h,
              // transform: 'translate(-50%, -50%)', // 让节点以中心为基准定位
              zIndex: draggingNodeId === node.id || selectedNodeId === node.id ? 100 : 1, // 拖动时置顶
              boxShadow: draggingNodeId === node.id ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : undefined // 拖动时添加阴影
            }}
          >
            {selectedNodeId === node.id && draggingNodeId !== node.id && (
              <>
                <div className="edge-handle edge-t" data-dir="t" />
                <div className="edge-handle edge-b" data-dir="b" />
                <div className="edge-handle edge-l" data-dir="l" />
                <div className="edge-handle edge-r" data-dir="r" />

                <div className="resize-handle handle-tl" data-dir="tl" />
                <div className="resize-handle handle-tr" data-dir="tr" />
                <div className="resize-handle handle-bl" data-dir="bl" />
                <div className="resize-handle handle-br" data-dir="br" />
              </>
            )}

            {node.type === 'text' && (
              <Note
                node={node}
                cameraZoom={camera.zoom}
                isEditing={editingNodeId === node.id}
                onDoubleClick={() => setEditingNodeId(node.id)}
                onBlur={() => setEditingNodeId(null)}
                onUpdate={(id, content) => {
                  setNodes((prev) => prev.map(n => n.id === id ? { ...n, content } : n));
                }}
              />
            )}
            </div>
        ))}
      </div>
    </div>
  );
}
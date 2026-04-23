import { memo, useCallback, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Note } from '@/components/Note/Note';
import type { NodeColor, NodeShape } from '@/types';
import { getSvgPathFromStroke } from '@/utils/geometry';
import './NodeWrapper.css';

const COLOR_STYLE_MAP: Record<NodeColor, React.CSSProperties> = {
  yellow: { backgroundColor: '#fef08a', borderColor: '#fde047' },
  blue: { backgroundColor: '#bae6fd', borderColor: '#7dd3fc' },
  pink: { backgroundColor: '#fbcfe8', borderColor: '#f9a8d4' },
  green: { backgroundColor: '#bbf7d0', borderColor: '#86efac' },
  purple: { backgroundColor: '#e9d5ff', borderColor: '#d8b4fe' },
};

const SHAPE_STYLE_MAP: Record<NodeShape, React.CSSProperties> = {
  rounded: { borderRadius: '12px' },
  circle: { borderRadius: '50%' },
  path: { borderRadius: '0px' }, 
};

export const NodeWrapper = memo(({ id }: { id: string }) => {
  const node = useCanvasStore((state) => state.nodes[id]);
  const zoom = useCanvasStore((state) => state.camera.zoom);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const isSelected = useCanvasStore((state) => state.selectedNodeId === id);
  const isDragging = useCanvasStore((state) => state.draggingNodeId === id);
  const isEditing = useCanvasStore((state) => state.editingNodeId === id);
  const setEditingNodeId = useCanvasStore((state) => state.setEditingNodeId);
  const updateNodeContent = useCanvasStore((state) => state.updateNodeContent);
  const [isHovered, setIsHovered] = useState(false);
  const inverseZoom = Math.min(1 / zoom, 4);

  const handleDoubleClick = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
  }, [setEditingNodeId]);

  const handleBlur = useCallback(() => {
    setEditingNodeId(null);
  }, [setEditingNodeId]);

  if (!node) return null;

  // 判断是否为笔迹
  const isPath = node.shape === 'path';

  return (
    <div
      data-id={node.id}
      className={`test-node ${isSelected ? 'selected' : ''} ${isPath ? 'is-path' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        zIndex: isDragging || isSelected ? 100 : 1,
        
        // 如果是笔迹，去掉背景、边框、阴影和内边距
        ...(isPath ? {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          boxShadow: 'none',
          padding: 0,
          pointerEvents: 'none',
        } : {
          ...COLOR_STYLE_MAP[node.color],
          ...SHAPE_STYLE_MAP[node.shape],
          boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : undefined,
          pointerEvents: 'auto',
        }),

        '--inv-zoom': inverseZoom
      } as React.CSSProperties & Record<string, any>}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isSelected && !isDragging && !isPath && (
        <>
          <div className="resize-handle handle-tl" data-dir="tl" style={{ pointerEvents: 'auto' }} />
          <div className="resize-handle handle-tr" data-dir="tr" style={{ pointerEvents: 'auto' }} />
          <div className="resize-handle handle-bl" data-dir="bl" style={{ pointerEvents: 'auto' }} />
          <div className="resize-handle handle-br" data-dir="br" style={{ pointerEvents: 'auto' }} />
        </>
      )}

      {/* 笔迹渲染 SVG，便签渲染文字 */}
      {isPath && node.points ? (
        <svg 
          width="100%" height="100%" 
          style={{ 
            overflow: 'visible', 
            pointerEvents: 'none'
          }}
        >
          <path
            d={getSvgPathFromStroke(node.points)}
            fill="none"
            stroke="transparent"
            strokeWidth={(node.strokeWidth || 4) + 20}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ 
              pointerEvents: 'stroke',
              cursor: activeTool === 'cursor' ? 'pointer' : 'crosshair' 
            }}
          />
          <path
            d={getSvgPathFromStroke(node.points)}
            fill="none"
            stroke={COLOR_STYLE_MAP[node.color]?.borderColor || '#3b82f6'} 
            strokeWidth={node.strokeWidth || 4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }} 
          />
        </svg>
      ) : (
        <>
          {/* 非笔迹（便签）才显示边缘拉伸和连线锚点 */}
          {isSelected && !isDragging && (
            <>
              <div className="edge-handle edge-t" data-dir="t" />
              <div className="edge-handle edge-b" data-dir="b" />
              <div className="edge-handle edge-l" data-dir="l" />
              <div className="edge-handle edge-r" data-dir="r" />
            </>
          )}

          {isHovered && !isDragging && (
            <>
              <div className="connection-anchor anchor-t" data-dir="t" data-nodeid={node.id} />
              <div className="connection-anchor anchor-r" data-dir="r" data-nodeid={node.id} />
              <div className="connection-anchor anchor-b" data-dir="b" data-nodeid={node.id} />
              <div className="connection-anchor anchor-l" data-dir="l" data-nodeid={node.id} />
            </>
          )}

          <Note
            node={node}
            cameraZoom={zoom}
            isEditing={isEditing}
            onDoubleClick={handleDoubleClick}
            onBlur={handleBlur}
            onUpdate={updateNodeContent}
          />
        </>
      )}
    </div>
  );
});
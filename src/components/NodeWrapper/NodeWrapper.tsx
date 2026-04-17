import { memo, useCallback, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Note } from '@/components/Note/Note';
import type { NodeColor, NodeShape } from '@/types';
import './NodeWrapper.css';

// ✅ 1. 彻底抛弃 Tailwind 类名，改为 React 内联样式映射字典
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
};

export const NodeWrapper = memo(({ id }: { id: string }) => {
  const node = useCanvasStore((state) => state.nodes[id]);
  const zoom = useCanvasStore((state) => state.camera.zoom);
  const isSelected = useCanvasStore((state) => state.selectedNodeId === id);
  const isDragging = useCanvasStore((state) => state.draggingNodeId === id);
  const isEditing = useCanvasStore((state) => state.editingNodeId === id);

  const setEditingNodeId = useCanvasStore((state) => state.setEditingNodeId);
  const updateNodeContent = useCanvasStore((state) => state.updateNodeContent);

  const [isHovered, setIsHovered] = useState(false);

  const handleDoubleClick = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
  }, [setEditingNodeId]);

  const handleBlur = useCallback(() => {
    setEditingNodeId(null);
  }, [setEditingNodeId]);

  if (!node) return null;

  return (
    <div
      data-id={node.id}
      className={`test-node ${isSelected ? 'selected' : ''}`}
      style={{
        // 基础坐标样式
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        zIndex: isDragging || isSelected ? 100 : 1,
        boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : undefined,
        
        // ✅ 2. 将动态外观以外联样式注入，强制覆盖 App.css 的默认白底
        ...COLOR_STYLE_MAP[node.color],
        ...SHAPE_STYLE_MAP[node.shape],
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 渲染边框和缩放 Handle */}
      {isSelected && !isDragging && (
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

      {/* 渲染连线锚点 */}
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
    </div>
  );
});
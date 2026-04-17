// src/components/PropertyMenu/PropertyMenu.tsx
import { memo } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import type { NodeColor, NodeShape } from '@/types';
import './PropertyMenu.css';

const COLORS: NodeColor[] = ['yellow', 'blue', 'pink', 'green', 'purple'];
const SHAPES: { value: NodeShape; icon: string }[] = [
  { value: 'rounded', icon: '🟨' },
  { value: 'circle', icon: '🟡' },
];

const COLOR_HEX: Record<NodeColor, string> = {
  yellow: '#fef08a',
  blue: '#bae6fd',
  pink: '#fbcfe8',
  green: '#bbf7d0',
  purple: '#e9d5ff',
};

export const PropertyMenu = memo(() => {
  const selectedNodeId = useCanvasStore(state => state.selectedNodeId);
  const selectedNode = useCanvasStore(state => selectedNodeId ? state.nodes[selectedNodeId] : null);
  const updateNodeAppearance = useCanvasStore(state => state.updateNodeAppearance);
  const camera = useCanvasStore(state => state.camera);

  if (!selectedNodeId || !selectedNode) return null;

  // 计算屏幕绝对坐标：节点世界坐标 * 缩放比例 + 画布平移量
  let menuX = selectedNode.x * camera.zoom + camera.x;
  let menuY = selectedNode.y * camera.zoom + camera.y - 60; // 在节点上方 60px 处悬浮

  // 视口安全边界防护
  menuY = Math.max(10, menuY);
  menuX = Math.max(10, menuX);

  return (
    <div 
      className="property-menu-panel"
      style={{ left: `${menuX}px`, top: `${menuY}px` }}
      // 严密拦截所有鼠标和触摸事件，防止点击菜单时导致便签失焦
      onMouseDown={(e) => e.stopPropagation()} 
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* 颜色选择区 */}
      <div className="menu-section">
        {COLORS.map(color => (
          <button
            key={color}
            className={`color-btn ${selectedNode.color === color ? 'active' : ''}`}
            style={{ backgroundColor: COLOR_HEX[color] }}
            onClick={() => updateNodeAppearance(selectedNodeId, { color })}
            title={`颜色: ${color}`}
          />
        ))}
      </div>

      {/* 分割线 */}
      <div className="menu-divider" />

      {/* 形状选择区 */}
      <div className="menu-section">
        {SHAPES.map(shape => (
          <button
            key={shape.value}
            className={`shape-btn ${selectedNode.shape === shape.value ? 'active' : ''}`}
            onClick={() => updateNodeAppearance(selectedNodeId, { shape: shape.value })}
            title={`形状: ${shape.value}`}
          >
            {shape.icon}
          </button>
        ))}
      </div>
    </div>
  );
});
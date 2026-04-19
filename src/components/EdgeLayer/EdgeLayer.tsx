import { memo } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { getHandlePosition, getBezierPath } from '@/utils/geometry';

export const EdgeLayer = memo(() => {
  // 订阅必要的连线数据
  const edges = useCanvasStore((state) => state.edges);
  const nodes = useCanvasStore((state) => state.nodes);
  const draft = useCanvasStore((state) => state.draftConnection);
  const selectedEdgeId = useCanvasStore((state) => state.selectedEdgeId);
  const setSelectedEdgeId = useCanvasStore((state) => state.setSelectedEdgeId);

  return (
    <svg 
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        overflow: 'visible', // 确保画布外的线不被裁剪
        pointerEvents: 'none' // 让 SVG 不阻挡鼠标事件，非常重要！
      }}
    >
      {/* 渲染已确定的连线 */}
      {edges.map(edge => {
        const sourceNode = nodes[edge.sourceNodeId];
        const targetNode = nodes[edge.targetNodeId];
        if (!sourceNode || !targetNode) return null;

        const isSelected = selectedEdgeId === edge.id;
        const p1 = getHandlePosition(sourceNode, edge.sourceHandle);
        const p2 = getHandlePosition(targetNode, edge.targetHandle);
        const path = getBezierPath(p1.x, p1.y, edge.sourceHandle, p2.x, p2.y, edge.targetHandle);

        return (
          <g key={edge.id}>
          {/* 1. 隐形的巨大点击热区 (Fat Hitbox) */}
          <path
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth={24} /* 🚨 24px 的点击范围，闭着眼都能点中！ */
            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
            onMouseDown={(e) => {
              e.stopPropagation(); // 阻止事件冒泡到画板背景，防止瞬间取消选中
              setSelectedEdgeId(edge.id);
            }}
          />
          
          {/* 2. 真实的视觉连线 */}
          <path
            d={path}
            fill="none"
            // 🚨 选中时变成醒目的蓝色并加粗，未选中则是灰色
            stroke={isSelected ? '#3b82f6' : '#94a3b8'} 
            strokeWidth={isSelected ? 3 : 2}
            style={{ pointerEvents: 'none' }} // 让真实线条无视点击，直接穿透给底层热区
          />
        </g>
        );
      })}

      {/* 渲染正在拖拽中的草稿连线 */}
      {draft && nodes[draft.sourceNodeId] && (
        <path
          d={getBezierPath(
            getHandlePosition(nodes[draft.sourceNodeId], draft.sourceHandle).x,
            getHandlePosition(nodes[draft.sourceNodeId], draft.sourceHandle).y,
            draft.sourceHandle,
            draft.currentX,
            draft.currentY,
            draft.sourceHandle // 拖拽中假设终点方向和起点一致，或者用其他逻辑计算
          )}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="5,5" // 虚线表示正在连接
        />
      )}
    </svg>
  );
});
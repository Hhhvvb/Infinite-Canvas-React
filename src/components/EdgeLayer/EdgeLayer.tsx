import { memo } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { getHandlePosition, getBezierPath } from '@/utils/geometry';

export const EdgeLayer = memo(() => {
  // 订阅必要的连线数据
  const edges = useCanvasStore((state) => state.edges);
  const nodes = useCanvasStore((state) => state.nodes);
  const draft = useCanvasStore((state) => state.draftConnection);

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

        const p1 = getHandlePosition(sourceNode, edge.sourceHandle);
        const p2 = getHandlePosition(targetNode, edge.targetHandle);
        const path = getBezierPath(p1.x, p1.y, edge.sourceHandle, p2.x, p2.y, edge.targetHandle);

        return (
          <path 
            key={edge.id}
            d={path}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            markerEnd="url(#arrowhead)" // 可选：添加箭头
          />
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
import { memo } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { getHandlePosition, getBezierPath } from '@/utils/geometry';

export const EdgeLayer = memo(() => {
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
        overflow: 'visible',
        // 默认穿透 SVG，只有显式设置 pointerEvents 的路径参与点击。
        pointerEvents: 'none'
      }}
    >
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
          {/* 可见线条很细，额外叠一条透明粗线让用户更容易选中连线。 */}
          <path
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth={24}
            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelectedEdgeId(edge.id);
            }}
          />
          
          <path
            d={path}
            fill="none"
            stroke={isSelected ? '#3b82f6' : '#94a3b8'} 
            strokeWidth={isSelected ? 3 : 2}
            style={{ pointerEvents: 'none' }}
          />
        </g>
        );
      })}

      {draft && nodes[draft.sourceNodeId] && (
        <path
          d={getBezierPath(
            getHandlePosition(nodes[draft.sourceNodeId], draft.sourceHandle).x,
            getHandlePosition(nodes[draft.sourceNodeId], draft.sourceHandle).y,
            draft.sourceHandle,
            draft.currentX,
            draft.currentY,
            draft.sourceHandle
          )}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      )}
    </svg>
  );
});

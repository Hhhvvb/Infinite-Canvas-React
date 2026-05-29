import type { HandleDirection, CanvasNode } from '@/types';

export const getHandlePosition = (node: CanvasNode, handle: HandleDirection) => {
  switch (handle) {
    case 't': return { x: node.x + node.w / 2, y: node.y };
    case 'r': return { x: node.x + node.w, y: node.y + node.h / 2 };
    case 'b': return { x: node.x + node.w / 2, y: node.y + node.h };
    case 'l': return { x: node.x, y: node.y + node.h / 2 };
  }
};

export const getBezierPath = (
  x1: number, y1: number, dir1: HandleDirection,
  x2: number, y2: number, dir2: HandleDirection
) => {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const offset = Math.max(50, distance * 0.25); 

  let cx1 = x1, cy1 = y1;
  let cx2 = x2, cy2 = y2;

  // 控制点沿锚点方向外扩，连线离开节点时会更自然。
  if (dir1 === 't') cy1 -= offset;
  if (dir1 === 'b') cy1 += offset;
  if (dir1 === 'l') cx1 -= offset;
  if (dir1 === 'r') cx1 += offset;

  if (dir2 === 't') cy2 -= offset;
  if (dir2 === 'b') cy2 += offset;
  if (dir2 === 'l') cx2 -= offset;
  if (dir2 === 'r') cx2 += offset;

  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
};

export const getSvgPathFromStroke = (points: [number, number][]) => {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]} L ${points[0][0]} ${points[0][1]}`;

  let path = `M ${points[0][0]} ${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    const midPoint = [
      (p1[0] + p2[0]) / 2,
      (p1[1] + p2[1]) / 2
    ];

    if (i === 0) {
      path += ` L ${midPoint[0]} ${midPoint[1]}`;
    } else {
      // 用真实采样点做控制点、相邻中点做终点，可以平滑手绘抖动。
      path += ` Q ${p1[0]} ${p1[1]} ${midPoint[0]} ${midPoint[1]}`;
    }
  }
  
  const lastPoint = points[points.length - 1];
  path += ` L ${lastPoint[0]} ${lastPoint[1]}`;

  return path;
};

// src/utils/geometry.ts
import type { HandleDirection, CanvasNode } from '@/types';

// 获取节点某个锚点(t, r, b, l)的精确世界坐标
export const getHandlePosition = (node: CanvasNode, handle: HandleDirection) => {
  switch (handle) {
    case 't': return { x: node.x + node.w / 2, y: node.y };
    case 'r': return { x: node.x + node.w, y: node.y + node.h / 2 };
    case 'b': return { x: node.x + node.w / 2, y: node.y + node.h };
    case 'l': return { x: node.x, y: node.y + node.h / 2 };
  }
};

// 计算带有完美弧度的三次贝塞尔曲线路径
export const getBezierPath = (
  x1: number, y1: number, dir1: HandleDirection,
  x2: number, y2: number, dir2: HandleDirection
) => {
  // 控制点的动态偏移量，距离越远，控制点拉得越长，弧度越自然
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const offset = Math.max(50, distance * 0.25); 

  let cx1 = x1, cy1 = y1;
  let cx2 = x2, cy2 = y2;

  // 根据引出方向赋予控制点偏移
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

  // 🚨 核心修复 3：完美的二次贝塞尔平滑算法
  let path = `M ${points[0][0]} ${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    // 计算两点之间的中点
    const midPoint = [
      (p1[0] + p2[0]) / 2,
      (p1[1] + p2[1]) / 2
    ];

    if (i === 0) {
      // 头部：直线连到第一个中点
      path += ` L ${midPoint[0]} ${midPoint[1]}`;
    } else {
      // 身体：前一个真实点作为控制点，中点作为终点，生成完美弧线
      path += ` Q ${p1[0]} ${p1[1]} ${midPoint[0]} ${midPoint[1]}`;
    }
  }
  
  // 尾部：补齐最后一个点
  const lastPoint = points[points.length - 1];
  path += ` L ${lastPoint[0]} ${lastPoint[1]}`;

  return path;
};
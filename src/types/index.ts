export type HandleDirection = 't' | 'r' | 'b' | 'l';
export type NodeShape = 'rounded' | 'circle' | 'path';
export type NodeColor = 'yellow' | 'blue' | 'pink' | 'green' | 'purple';
export type ToolType = 'cursor' | 'rounded' | 'pen' | 'eraser';

export interface Edge {
  id: string;
  sourceNodeId: string;
  sourceHandle: HandleDirection;
  targetNodeId: string;
  targetHandle: HandleDirection;
}

export interface DraftConnection {
  sourceNodeId: string;
  sourceHandle: HandleDirection;
  // 当前鼠标在世界坐标系下的位置
  currentX: number;
  currentY: number;
}

export interface CanvasNode {
  id: string;
  shape: NodeShape;
  color: NodeColor;
  x: number;
  y: number;
  w: number;
  h: number;
  content?: string;
  points?: [number, number][];
  strokeWidth?: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
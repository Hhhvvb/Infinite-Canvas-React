export type ToolType = 'cursor' | 'text' | 'rect' | 'circle';

export interface CanvasNode {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  w: number;
  h: number;
  content?: string;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
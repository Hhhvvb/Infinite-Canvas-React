import { create } from 'zustand';
import type { Camera, CanvasNode, ToolType, Edge, DraftConnection } from '@/types';

interface CanvasState {
  // --- 状态 (State) ---
  nodes: Record<string, CanvasNode>;
  nodeIds: string[];
  camera: Camera;
  activeTool: ToolType;
  selectedNodeId: string | null;
  draggingNodeId: string | null;
  resizingHandle: string | null;
  isPanning: boolean;
  editingNodeId: string | null;
  edges: Edge[];
  draftConnection: DraftConnection | null;

  // --- 动作 (Actions) ---
  setCamera: (camera: Camera | ((prev: Camera) => Camera)) => void;
  setActiveTool: (tool: ToolType) => void;
  setIsPanning: (isPanning: boolean) => void;
  setDraggingNodeId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setResizingHandle: (handle: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setDraftConnection: (draft: DraftConnection | null) => void;
  updateDraftConnection: (x: number, y: number) => void;
  addEdge: (edge: Edge) => void;
  updateNodeAppearance: (id: string, updates: Partial<Pick<CanvasNode, 'shape' | 'color'>>) => void;

  // 节点操作
  addNode: (node: CanvasNode) => void;
  updateNodeContent: (id: string, content: string) => void;
  
  // 高频交互专用 Action (性能关键)
  updateNodePosition: (id: string, dx: number, dy: number) => void;
  updateNodeSize: (id: string, handle: string, dx: number, dy: number) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  // 初始状态
  nodes: {},
  nodeIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  activeTool: 'cursor',
  selectedNodeId: null,
  draggingNodeId: null,
  resizingHandle: null,
  isPanning: false,
  editingNodeId: null,
  edges: [],
  draftConnection: null,

  // 基础 Setter
  setCamera: (camera) => set((state) => ({
    camera: typeof camera === 'function' ? camera(state.camera) : camera 
  })),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setIsPanning: (isPanning) => set({ isPanning }),
  setDraggingNodeId: (id) => set({ draggingNodeId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setResizingHandle: (handle) => set({ resizingHandle: handle }),
  setEditingNodeId: (id) => set({ editingNodeId: id }),
  setDraftConnection: (draft) => set({ draftConnection: draft }),

  // 业务逻辑 Action
  addNode: (node) => set((state) => ({
    nodes: { ...state.nodes, [node.id]: node },
    nodeIds: [...state.nodeIds, node.id],
    activeTool: 'cursor',
    selectedNodeId: node.id,
    color: node.color,
    shape: node.shape,
  })),

  updateNodeContent: (id, content) => set((state) => ({
    nodes: {
      ...state.nodes,
      [id]: { ...state.nodes[id], content }
    }
  })),

  // 节点移动：基于 Delta 增量更新，避免外部计算坐标偏移
  updateNodePosition: (id, dx, dy) => set((state) => {
    const node = state.nodes[id];
    if (!node) return state;
    return {
      nodes: {
        ...state.nodes,
        [id]: { ...node, x: node.x + dx, y: node.y + dy }
      }
    };
  }),

  // 节点缩放：完美复现你原先 App.tsx 中的边界检查逻辑
  updateNodeSize: (id, handle, dx, dy) => set((state) => {
    const node = state.nodes[id];
    if (!node) return state;

    let { x, y, w, h } = node;
    const MIN_SIZE = 50;

    if (handle.includes('r')) w = Math.max(MIN_SIZE, w + dx);
    if (handle.includes('b')) h = Math.max(MIN_SIZE, h + dy);
    
    if (handle.includes('l')) {
      const newW = w - dx;
      if (newW >= MIN_SIZE) {
        w = newW;
        x += dx;
      } else {
        x += w - MIN_SIZE;
        w = MIN_SIZE;
      }
    }
    
    if (handle.includes('t')) {
      const newH = h - dy;
      if (newH >= MIN_SIZE) {
        h = newH;
        y += dy;
      } else {
        y += h - MIN_SIZE;
        h = MIN_SIZE;
      }
    }

    return {
      nodes: {
        ...state.nodes,
        [id]: { ...node, x, y, w, h }
      }
    };
  }),

  updateDraftConnection: (x, y) => set((state) => ({
    draftConnection: state.draftConnection 
      ? { ...state.draftConnection, currentX: x, currentY: y } 
      : null
  })),
  
  addEdge: (edge) => set((state) => {
    // 简单的去重逻辑：防止两点之间重复连线
    const isDuplicate = state.edges.some(
      e => e.sourceNodeId === edge.sourceNodeId && e.targetNodeId === edge.targetNodeId
    );
    if (isDuplicate) return state;
    return { edges: [...state.edges, edge] };
  }),

  updateNodeAppearance: (id, updates) => set((state) => {
    const node = state.nodes[id];
    if (!node) return state;
    return {
      nodes: {
        ...state.nodes,
        [id]: { ...node, ...updates }
      }
    };
  }),
}));
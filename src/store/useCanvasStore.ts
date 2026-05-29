import { create } from 'zustand';
import type { Camera, CanvasNode, ToolType, Edge, DraftConnection, NodeColor, NodeShape, CanvasProject } from '@/types';
import { persist } from 'zustand/middleware';

interface HistorySnapshot {
  nodes: Record<string, CanvasNode>;
  nodeIds: string[];
  edges: Edge[];
}

const HISTORY_LIMIT = 100;

interface CanvasState {
  nodes: Record<string, CanvasNode>;
  nodeIds: string[];
  camera: Camera;
  activeTool: ToolType;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  draggingNodeId: string | null;
  resizingHandle: string | null;
  isPanning: boolean;
  editingNodeId: string | null;
  edges: Edge[];
  draftConnection: DraftConnection | null;
  currentStroke: [number, number][] | null;
  noteSettings: { color: NodeColor; shape: NodeShape };
  penSettings: { color: NodeColor; size: number };
  openSettingMenu: ToolType | null;
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  
  setCamera: (camera: Camera | ((prev: Camera) => Camera)) => void;
  setActiveTool: (tool: ToolType) => void;
  setIsPanning: (isPanning: boolean) => void;
  setDraggingNodeId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  addNode: (node: CanvasNode) => void;
  updateNodeContent: (id: string, content: string) => void;
  removeEdge: (id: string) => void;
  removeNode: (id: string) => void;
  setResizingHandle: (handle: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setDraftConnection: (draft: DraftConnection | null) => void;
  updateDraftConnection: (x: number, y: number) => void;
  updateNodePosition: (id: string, dx: number, dy: number) => void;
  updateNodeSize: (id: string, handle: string, dx: number, dy: number) => void;
  addEdge: (edge: Edge) => void;
  updateNodeAppearance: (id: string, updates: Partial<Pick<CanvasNode, 'shape' | 'color'>>) => void;
  startStroke: (x: number, y: number) => void;
  addPointToStroke: (x: number, y: number) => void;
  finishStroke: () => void;
  setNoteSettings: (settings: Partial<Pick<CanvasNode, 'shape' | 'color'>>) => void;
  setPenSettings: (settings: Partial<{ color: NodeColor; size: number }>) => void;
  setOpenSettingMenu: (menu: ToolType | null) => void;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  loadProject: (data: CanvasProject) => void;
  resetCanvas: () => void;
}

// 只复制可撤销的画布内容，避免把相机和临时交互状态写进历史。
const cloneSnapshot = (state: Pick<CanvasState, 'nodes' | 'nodeIds' | 'edges'>): HistorySnapshot => ({
  nodes: structuredClone(state.nodes),
  nodeIds: [...state.nodeIds],
  edges: structuredClone(state.edges),
});

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      nodes: {},
      nodeIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      activeTool: 'cursor',
      selectedNodeId: null,
      selectedEdgeId: null,
      draggingNodeId: null,
      resizingHandle: null,
      isPanning: false,
      editingNodeId: null,
      edges: [],
      draftConnection: null,
      currentStroke: null,
      noteSettings: { color: 'yellow', shape: 'rounded' },
      penSettings: { color: 'blue', size: 4 },
      openSettingMenu: null,
      past: [],
      future: [],

      setCamera: (camera) => set((state) => ({
        camera: typeof camera === 'function' ? camera(state.camera) : camera 
      })),
      setActiveTool: (tool) => set({ activeTool: tool }),
      setIsPanning: (isPanning) => set({ isPanning }),
      setDraggingNodeId: (id) => set({ draggingNodeId: id }),
      setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
      setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
      setResizingHandle: (handle) => set({ resizingHandle: handle }),
      setEditingNodeId: (id) => set({ editingNodeId: id }),
      setDraftConnection: (draft) => set({ draftConnection: draft }),
      setNoteSettings: (settings) => set(state => ({ noteSettings: { ...state.noteSettings, ...settings }})),
      setPenSettings: (settings) => set(state => ({ penSettings: { ...state.penSettings, ...settings }})),
      setOpenSettingMenu: (menu) => set({ openSettingMenu: menu }),

      // 新建节点前保存历史，并在创建后自动回到选择工具。
      addNode: (node) => {
        get().saveHistory();

        set((state) => ({
          nodes: { ...state.nodes, [node.id]: node },
          nodeIds: [...state.nodeIds, node.id],
          activeTool: 'cursor',
          selectedNodeId: node.id,
        }))
      },

      // 编辑内容只在文本真实变化时入栈，避免空提交污染撤销历史。
      updateNodeContent: (id, content) => {
        const state = get();
        const node = state.nodes[id];
        
        if (!node || node.content === content) return; 

        state.saveHistory(); 
        
        set((state) => {
          const currentNode = state.nodes[id];
          if (!currentNode) return state;
          return {
            nodes: {
              ...state.nodes,
              [id]: { ...currentNode, content }
            }
          };
        });
      },

      // 拖拽时每帧只更新位置，历史由交互层在第一次移动时保存。
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

      // 根据拖动的控制点调整尺寸，并保证节点不会小于最小尺寸。
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
      
      // 添加连线时阻止两个节点之间出现重复边。
      addEdge: (edge) => {
        const state = get();
        const isDuplicate = state.edges.some(
          e => (e.sourceNodeId === edge.sourceNodeId && e.targetNodeId === edge.targetNodeId) || (e.sourceNodeId === edge.targetNodeId && e.targetNodeId === edge.sourceNodeId)
        );
        if (isDuplicate) return;

        state.saveHistory();

        set((state) => ({ 
          edges: [...state.edges, edge] 
        }));
      },

      // 更新便签外观，并在颜色或形状真实变化时保存历史。
      updateNodeAppearance: (id, updates) => {
        const state = get();
        const node = state.nodes[id];
        if (!node) return;

        const hasShapeUpdate = updates.shape !== undefined && updates.shape !== node.shape;
        const hasColorUpdate = updates.color !== undefined && updates.color !== node.color;
        if (!hasShapeUpdate && !hasColorUpdate) return;

        state.saveHistory();
        set((state) => {
          const currentNode = state.nodes[id];
          if (!currentNode) return state;
          return {
            nodes: {
              ...state.nodes,
              [id]: { ...currentNode, ...updates }
            }
          };
        })
      },
      startStroke: (x, y) => set({ currentStroke: [[x, y]] }),
      
      // 给当前笔迹追加采样点，并过滤过近的点减少渲染负担。
      addPointToStroke: (x, y) => set((state) => {
        if (!state.currentStroke) return state;
        const lastPoint = state.currentStroke[state.currentStroke.length - 1];
        if (Math.hypot(lastPoint[0] - x, lastPoint[1] - y) < 4) return state;
        
        return { currentStroke: [...state.currentStroke, [x, y]] };
      }),

      // 结束画笔笔迹，将临时采样点转换成一个 path 类型节点。
      finishStroke: () => {
        const points = get().currentStroke;
        if (!points || points.length === 0) {
          set({ currentStroke: null });
          return ;
        }

        get().saveHistory();

        set((state) => {
          const points = state.currentStroke;
          if (!points || points.length === 0) return { currentStroke: null };

          const validPoints = points.length === 1 
            ? [[points[0][0], points[0][1]], [points[0][0] + 0.1, points[0][1] + 0.1]] as [number, number][]
            : points;

          const xs = validPoints.map(p => p[0]);
          const ys = validPoints.map(p => p[1]);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          
          const w = Math.max(20, maxX - minX); 
          const h = Math.max(20, maxY - minY);

          // 存相对坐标后，整条笔迹可以像普通节点一样移动和导出。
          const relativePoints: [number, number][] = validPoints.map(p => [p[0] - minX, p[1] - minY]);

          const newNode: CanvasNode = {
            id: `stroke_${Date.now()}`,
            shape: 'path',
            color: state.penSettings.color,
            strokeWidth: state.penSettings.size,
            x: minX,
            y: minY,
            w,
            h,
            content: '',
            points: relativePoints
          };

          return {
            nodes: { ...state.nodes, [newNode.id]: newNode },
            nodeIds: [...state.nodeIds, newNode.id],
            currentStroke: null,
          };
        })
      },

      // 删除节点时同步删除所有连接到它的边。
      removeNode: (id) => {
        const current = get();
        if (!current.nodes[id]) return;

        current.saveHistory();
        set((state) => {
          const newNodes = { ...state.nodes };
          delete newNodes[id];
          return { 
            nodes: newNodes, 
            nodeIds: state.nodeIds.filter(nId => nId !== id),
            edges: state.edges.filter(e => e.sourceNodeId !== id && e.targetNodeId !== id),
            selectedNodeId: null,
          };
        });
      },

      removeEdge: (id) => {
        const current = get();
        if (!current.edges.some(edge => edge.id === id)) return;

        current.saveHistory();
        set((state) => ({
          edges: state.edges.filter(e => e.id !== id),
          selectedEdgeId: null,
        }));
      },

      // 保存当前画布快照，并限制历史栈长度避免长期使用占用过多内存。
      saveHistory: () => set((state) => {
        return {
          past: [...state.past, cloneSnapshot(state)].slice(-HISTORY_LIMIT),
          future: [],
        };
      }),

      // 回到上一个历史快照，并把当前快照放入 redo 栈。
      undo: () => set((state) => {
        if (state.past.length === 0) return state; 
        
        const previous = state.past[state.past.length - 1]; 
        const newPast = state.past.slice(0, -1);
        
        return {
          past: newPast,
          future: [cloneSnapshot(state), ...state.future],
          nodes: structuredClone(previous.nodes),
          nodeIds: [...previous.nodeIds],
          edges: structuredClone(previous.edges),
          selectedNodeId: null, 
        };
      }),

      // 从 redo 栈恢复下一步快照。
      redo: () => set((state) => {
        if (state.future.length === 0) return state; 
        
        const next = state.future[0]; 
        const newFuture = state.future.slice(1);

        return {
          past: [...state.past, cloneSnapshot(state)].slice(-HISTORY_LIMIT),
          future: newFuture,
          nodes: structuredClone(next.nodes),
          nodeIds: [...next.nodeIds],
          edges: structuredClone(next.edges),
          selectedNodeId: null,
        };
      }),

      // 用导入的工程数据替换当前画布，并清空所有临时交互状态。
      loadProject: (data) => {
        get().saveHistory();
        set({
          nodes: structuredClone(data.nodes),
          nodeIds: [...data.nodeIds],
          edges: structuredClone(data.edges),
          selectedNodeId: null,
          selectedEdgeId: null,
          draggingNodeId: null,
          resizingHandle: null,
          editingNodeId: null,
          draftConnection: null,
          currentStroke: null,
        });
      },

      // 清空画布内容前保存一次历史，方便用户撤销恢复。
      resetCanvas: () => {
        const state = get();
        if (state.nodeIds.length === 0 && state.edges.length === 0) return;

        state.saveHistory();

        set({
          nodes: {},
          nodeIds: [],
          edges: [],
          selectedNodeId: null,
          draggingNodeId: null,
          editingNodeId: null,
          currentStroke: null,
        });
      },
    }),
    {
      name: 'infinite-canvas-storage',
      partialize: (state) => ({ 
        nodes: state.nodes,
        nodeIds: state.nodeIds,
        edges: state.edges,
        noteSettings: state.noteSettings,
        penSettings: state.penSettings,
      }),
    }
  )
);

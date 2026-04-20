import { create } from 'zustand';
import type { Camera, CanvasNode, ToolType, Edge, DraftConnection, NodeColor, NodeShape } from '@/types';
import { persist } from 'zustand/middleware';

interface HistorySnapshot {
  nodes: Record<string, CanvasNode>;
  nodeIds: string[];
  edges: Edge[];
}

interface CanvasState {
  // --- 状态 (State) ---
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
  
  // --- 动作 (Actions) ---
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
  setPenSettings: (settings: Partial<Pick<CanvasNode, 'shape' | 'color'>>) => void;
  setOpenSettingMenu: (menu: ToolType | null) => void;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  loadProject: (data: any) => void;
  resetCanvas: () => void;
}

const cloneSnapshot = (state: CanvasState): HistorySnapshot => ({
  nodes: JSON.parse(JSON.stringify(state.nodes)),
  nodeIds: [...state.nodeIds],
  edges: JSON.parse(JSON.stringify(state.edges)),
});

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      // 初始状态
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

      // 基础 Setter
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

      // 业务逻辑 Action
      addNode: (node) => {
        get().saveHistory();

        set((state) => ({
          nodes: { ...state.nodes, [node.id]: node },
          nodeIds: [...state.nodeIds, node.id],
          activeTool: 'cursor',
          selectedNodeId: node.id,
          color: node.color,
          shape: node.shape,
        }))
      },

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

      // 节点移动：基于 Delta 增量更新
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

      // 节点缩放
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
      
      addEdge: (edge) => {
        const state = get();
        const isDuplicate = state.edges.some(
          e => (e.sourceNodeId === edge.sourceNodeId && e.targetNodeId === edge.targetNodeId) || (e.sourceNodeId === edge.targetNodeId && e.targetNodeId === edge.sourceNodeId) // 无向图视角下的重复边检查
        );
        if (isDuplicate) return;

        state.saveHistory();

        set((state) => ({ 
          edges: [...state.edges, edge] 
        }));
      },

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
      
      addPointToStroke: (x, y) => set((state) => {
        if (!state.currentStroke) return state;
        // 节流：如果距离上一个点太近，就不记录，优化性能
        const lastPoint = state.currentStroke[state.currentStroke.length - 1];
        if (Math.hypot(lastPoint[0] - x, lastPoint[1] - y) < 4) return state;
        
        return { currentStroke: [...state.currentStroke, [x, y]] };
      }),

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

          // 核心算法：计算笔迹的包围盒 (Bounding Box)
          const xs = validPoints.map(p => p[0]);
          const ys = validPoints.map(p => p[1]);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          
          const w = Math.max(20, maxX - minX); 
          const h = Math.max(20, maxY - minY);

          // 将绝对世界坐标转换为相对于包围盒左上角的相对坐标
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

      removeNode: (id) => {
        get().saveHistory();
        set((state) => {
          const newNodes = { ...state.nodes };
          delete newNodes[id];
          return { 
            nodes: newNodes, 
            // 把源头或目标是这个节点的连线也一起删掉！
            nodeIds: state.nodeIds.filter(nId => nId !== id),
            edges: state.edges.filter(e => e.sourceNodeId !== id && e.targetNodeId !== id),
            selectedNodeId: null,
          };
        });
      },

      removeEdge: (id) => {
        get().saveHistory();
        set((state) => ({
          edges: state.edges.filter(e => e.id !== id),
          selectedEdgeId: null, // 删除后清空选中态
        }));
      },

      saveHistory: () => set((state) => {
        return {
          past: [...state.past, cloneSnapshot(state)],
          future: [], // 只要有真实的新操作，立刻清空未来
        };
      }),

      undo: () => set((state) => {
        if (state.past.length === 0) return state; 
        
        const previous = state.past[state.past.length - 1]; 
        const newPast = state.past.slice(0, -1);
        
        return {
          past: newPast,
          future: [cloneSnapshot(state), ...state.future],
          nodes: JSON.parse(JSON.stringify(previous.nodes)),
          nodeIds: [...previous.nodeIds],
          edges: JSON.parse(JSON.stringify(previous.edges)),
          selectedNodeId: null, 
        };
      }),

      redo: () => set((state) => {
        if (state.future.length === 0) return state; 
        
        const next = state.future[0]; 
        const newFuture = state.future.slice(1);

        return {
          past: [...state.past, cloneSnapshot(state)],
          future: newFuture,
          nodes: JSON.parse(JSON.stringify(next.nodes)),
          nodeIds: [...next.nodeIds],
          edges: JSON.parse(JSON.stringify(next.edges)),
          selectedNodeId: null,
        };
      }),

      loadProject: (data) => {
        if (!data.nodes || !data.nodeIds) return;
        get().saveHistory(); // 导入前存个历史，防止后悔
        set({
          nodes: data.nodes,
          nodeIds: data.nodeIds,
          edges: data.edges || [],
          selectedNodeId: null,
        });
      },

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
      name: 'infinite-canvas-storage', // 存储在 localStorage 里的 key
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
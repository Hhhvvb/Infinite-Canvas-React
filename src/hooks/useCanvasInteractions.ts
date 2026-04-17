import { useCallback } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import type { CanvasNode, HandleDirection, NodeShape } from '@/types';

export const useCanvasInteractions = () => {
  // ⛔️ 删除了 const store = useCanvasStore(); 
  // 彻底切断该 Hook 对全局状态的渲染订阅！

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // ✅ 在鼠标按下的瞬间，直接穿透 React 生命周期，获取最新状态
    const state = useCanvasStore.getState(); 
    
    const target = e.target as HTMLElement;

    // 检测是否点击了连接锚点
    const anchorTarget = target.closest('.connection-anchor');
    if (anchorTarget) {
      e.stopPropagation(); // 阻止触发节点的拖拽或选中
      const nodeId = anchorTarget.getAttribute('data-nodeid')!;
      const handleDir = anchorTarget.getAttribute('data-dir') as HandleDirection;
      
      // 初始化草稿连线位置为鼠标当前世界坐标
      const worldX = (e.clientX - state.camera.x) / state.camera.zoom;
      const worldY = (e.clientY - state.camera.y) / state.camera.zoom;
      
      state.setDraftConnection({
        sourceNodeId: nodeId,
        sourceHandle: handleDir,
        currentX: worldX,
        currentY: worldY
      });
      return;
    }

    // 忽略特定区域
    if (target.isContentEditable || target.closest('[contenteditable="true"]')) return;
    if (target.closest('.toolbar')) return;

    // 处理缩放控制点
    const resizeTarget = target.closest('.resize-handle') || target.closest('.edge-handle');
    if (resizeTarget) {
      const dir = resizeTarget.getAttribute('data-dir');
      if (dir) state.setResizingHandle(dir);
      return;
    }

    // 处理节点点击
    const nodeEl = target.closest('.test-node');
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-id');
      if (nodeId) {
        state.setSelectedNodeId(nodeId);
        if (state.activeTool === 'cursor') {
          state.setDraggingNodeId(nodeId);
        }
      }
      return;
    }

    // 点击空白处
    state.setSelectedNodeId(null);
    state.setEditingNodeId(null);
    
    if (state.activeTool === 'cursor' || e.button === 1) {
      state.setIsPanning(true);
      return;
    }

    // 创建新节点
    const defaultW = 200;
    const defaultH = 120;
    const worldX = (e.clientX - state.camera.x) / state.camera.zoom - defaultW / 2;
    const worldY = (e.clientY - state.camera.y) / state.camera.zoom - defaultH / 2;

    const newNode: CanvasNode = {
      id: Date.now().toString(),
      color: 'yellow',
      shape: state.activeTool as NodeShape,
      x: worldX,
      y: worldY,
      w: defaultW,
      h: defaultH,
      content:  '双击编辑'
    };

    state.addNode(newNode);
  }, []); // ✅ 依赖项可以大胆置空，不再受闭包困扰


  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState();

    if (state.draftConnection) {
      const worldX = (e.clientX - state.camera.x) / state.camera.zoom;
      const worldY = (e.clientY - state.camera.y) / state.camera.zoom;
      state.updateDraftConnection(worldX, worldY);
      return;
    }

    if (state.resizingHandle && state.selectedNodeId) {
      state.updateNodeSize(
        state.selectedNodeId,
        state.resizingHandle,
        e.movementX / state.camera.zoom,
        e.movementY / state.camera.zoom
      );
      return;
    }

    if (state.draggingNodeId) {
      state.updateNodePosition(
        state.draggingNodeId,
        e.movementX / state.camera.zoom,
        e.movementY / state.camera.zoom
      );
      return;
    }

    if (state.isPanning) {
      state.setCamera((prev) => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState();
    const target = e.target as HTMLElement;

    // 【新增】：松开鼠标时，如果在另一个连线锚点上，则创建永久连线
    if (state.draftConnection) {
      const anchorTarget = target.closest('.connection-anchor');
      
      if (anchorTarget) {
        const targetNodeId = anchorTarget.getAttribute('data-nodeid')!;
        const targetHandleDir = anchorTarget.getAttribute('data-dir') as HandleDirection;

        // 防止自己连自己
        if (state.draftConnection.sourceNodeId !== targetNodeId) {
          state.addEdge({
            id: `edge_${Date.now()}`,
            sourceNodeId: state.draftConnection.sourceNodeId,
            sourceHandle: state.draftConnection.sourceHandle,
            targetNodeId: targetNodeId,
            targetHandle: targetHandleDir
          });
        }
      }
      
      // 无论是否连通，松开鼠标都清除草稿线
      state.setDraftConnection(null);
    }

    state.setIsPanning(false);
    state.setDraggingNodeId(null);
    state.setResizingHandle(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState();
    const zoomSensitivity = 0.05;
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(0.1, Math.min(5, state.camera.zoom + delta * zoomSensitivity));
    
    if (newZoom === state.camera.zoom) return;

    const scaleRatio = newZoom / state.camera.zoom;
    const newX = e.clientX - (e.clientX - state.camera.x) * scaleRatio;
    const newY = e.clientY - (e.clientY - state.camera.y) * scaleRatio;

    state.setCamera({
        x: newX,
        y: newY,
        zoom: newZoom,
    });
  }, []);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  };
};
import { useCallback } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import type { CanvasNode, HandleDirection } from '@/types';

export const useCanvasInteractions = () => {
  // ⛔️ 删除了 const store = useCanvasStore(); 
  // 彻底切断该 Hook 对全局状态的渲染订阅！

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState(); 
    const target = e.target as HTMLElement;

    if (!target.closest('.toolbar-wrapper')) {
      state.setOpenSettingMenu(null);
    }

    if (e.button === 1) {
      state.setSelectedNodeId(null);
      state.setEditingNodeId(null);
      state.setIsPanning(true);
      return;
    }

    if (e.button !== 0) return;
    if (target.closest('.toolbar-wrapper')) return;
    
    const defaultW = 200;
    const defaultH = 120;
    const worldX = (e.clientX - state.camera.x) / state.camera.zoom;
    const worldY = (e.clientY - state.camera.y) / state.camera.zoom;

    if (state.activeTool === 'pen') {
      state.setSelectedNodeId(null);
      state.startStroke(worldX, worldY);
      return;
    }

    if (state.activeTool === 'eraser') {
      const nodeEl = target.closest('.test-node');
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-id');
        if (nodeId) state.removeNode(nodeId);
      }
      return;
    }

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
        state.setDraggingNodeId(nodeId);
        e.stopPropagation();
      }
      return;
    }

    // 点击空白处
    state.setSelectedNodeId(null);
    state.setEditingNodeId(null);
    
    if (state.activeTool === 'cursor') {
      state.setIsPanning(true);
      return;
    }

    // 创建新节点
    const newNode: CanvasNode = {
      id: Date.now().toString(),
      shape: state.activeTool === 'rounded' ? state.noteSettings.shape : 'rounded',
      color: state.activeTool === 'rounded' ? state.noteSettings.color : 'yellow',
      x: worldX - defaultW / 2,
      y: worldY - defaultH / 2,
      w: defaultW,
      h: defaultH,
      content:  '双击编辑'
    };

    state.addNode(newNode);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState();

    if (state.activeTool === 'eraser' && e.buttons === 1) {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.test-node');
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-id');
        if (nodeId) state.removeNode(nodeId);
      }
      return; // 删完直接返回，不触发其他逻辑
    }

    const worldX = (e.clientX - state.camera.x) / state.camera.zoom;
    const worldY = (e.clientY - state.camera.y) / state.camera.zoom;

    if (state.activeTool === 'pen' && state.currentStroke) {
      state.addPointToStroke(worldX, worldY);
      return; // 终止后续操作
    }

    if (state.draftConnection) {
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

    if (state.currentStroke) {
      state.finishStroke();
    }

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
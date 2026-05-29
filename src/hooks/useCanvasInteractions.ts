import { useCallback, useRef } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import type { CanvasNode, HandleDirection } from '@/types';

export const useCanvasInteractions = () => {
  // 拖拽/缩放过程中只保存一次历史，避免每个 mousemove 都进入撤销栈。
  const hasSavedTransformHistory = useRef(false);

  // 鼠标按下时根据当前工具决定是选中、创建、连线、绘制还是开始平移。
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState(); 
    const target = e.target as HTMLElement;

    if (!target.closest('.toolbar-wrapper')) {
      state.setOpenSettingMenu(null);
    }

    if (e.button === 1) {
      // 鼠标中键直接进入画布平移模式。
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
      // 画笔工具从按下位置开始采样一条临时笔迹。
      state.setSelectedNodeId(null);
      state.startStroke(worldX, worldY);
      return;
    }

    if (state.activeTool === 'eraser') {
      // 橡皮擦点击节点时立即删除该节点。
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
      // 从锚点拖出一条草稿连线，直到鼠标松开再尝试落到目标锚点。
      e.stopPropagation();
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
      // 记录当前缩放手柄方向，真正移动时再保存历史快照。
      const dir = resizeTarget.getAttribute('data-dir');
      if (dir) {
        hasSavedTransformHistory.current = false;
        state.setResizingHandle(dir);
      }
      return;
    }

    // 处理节点点击
    const nodeEl = target.closest('.test-node');
    if (nodeEl) {
      // 选中节点并准备拖拽，单击不移动时不会产生历史记录。
      const nodeId = nodeEl.getAttribute('data-id');
      if (nodeId) {
        state.setSelectedNodeId(nodeId);
        hasSavedTransformHistory.current = false;
        state.setDraggingNodeId(nodeId);
        e.stopPropagation();
      }
      return;
    }

    // 点击空白处
    state.setSelectedNodeId(null);
    state.setEditingNodeId(null);
    
    if (state.activeTool === 'cursor') {
      // 选择工具点空白处进入拖动画布模式。
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

  // 鼠标移动时推进当前交互：绘制、连线、缩放、拖拽或平移。
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState();

    if (state.activeTool === 'eraser' && e.buttons === 1) {
      // 按住橡皮擦拖过节点时连续删除。
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.test-node');
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-id');
        if (nodeId) state.removeNode(nodeId);
      }
      return;
    }

    const worldX = (e.clientX - state.camera.x) / state.camera.zoom;
    const worldY = (e.clientY - state.camera.y) / state.camera.zoom;

    if (state.activeTool === 'pen' && state.currentStroke) {
      state.addPointToStroke(worldX, worldY);
      return;
    }

    if (state.draftConnection) {
      state.updateDraftConnection(worldX, worldY);
      return;
    }

    if (state.resizingHandle && state.selectedNodeId) {
      // 缩放第一次产生位移时保存历史，后续位移合并成一次撤销。
      if (!hasSavedTransformHistory.current) {
        state.saveHistory();
        hasSavedTransformHistory.current = true;
      }
      state.updateNodeSize(
        state.selectedNodeId,
        state.resizingHandle,
        e.movementX / state.camera.zoom,
        e.movementY / state.camera.zoom
      );
      return;
    }

    if (state.draggingNodeId) {
      // 拖拽第一次产生位移时保存历史，后续位移合并成一次撤销。
      if (!hasSavedTransformHistory.current) {
        state.saveHistory();
        hasSavedTransformHistory.current = true;
      }
      state.updateNodePosition(
        state.draggingNodeId,
        e.movementX / state.camera.zoom,
        e.movementY / state.camera.zoom
      );
      return;
    }

    if (state.isPanning) {
      // 平移只改变相机，不进入撤销历史。
      state.setCamera((prev) => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  }, []);

  // 鼠标松开时结束临时交互，并在需要时提交笔迹或连线。
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState();
    const target = e.target as HTMLElement;

    if (state.currentStroke) {
      // 将正在绘制的临时笔迹提交成普通节点。
      state.finishStroke();
    }

    if (state.draftConnection) {
      // 如果松开位置是另一个锚点，则生成正式连线。
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
    hasSavedTransformHistory.current = false;
  }, []);

  // 滚轮以鼠标位置为中心缩放虚拟相机。
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

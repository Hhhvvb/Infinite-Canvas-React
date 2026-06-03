import { useCallback, useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import type { CanvasNode, HandleDirection } from '@/types';

const normalizeWheelDelta = (e: React.WheelEvent<HTMLDivElement>) => {
  // 不同浏览器/设备的 wheel delta 单位不同，先统一成接近像素的值再参与相机计算。
  const modeSize = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
  return {
    x: e.deltaX * modeSize,
    y: e.deltaY * modeSize,
  };
};

// Mac 触控板更常用双指平移；平台分支可以保留 Windows 鼠标滚轮缩放习惯。
const isMacLike = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export const useCanvasInteractions = () => {
  // 拖拽/缩放过程中只保存一次历史，避免每个 mousemove 都进入撤销栈。
  const hasSavedTransformHistory = useRef(false);
  const isSpacePressed = useRef(false);

  useEffect(() => {
    // Space 平移是临时按键态，放在 ref 里可避免每次 keydown 都触发组件渲染。
    const isTypingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return (
        element?.tagName === 'INPUT' ||
        element?.tagName === 'TEXTAREA' ||
        element?.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 文本编辑时空格必须优先输入字符，不能抢成画布平移快捷键。
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      isSpacePressed.current = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      isSpacePressed.current = false;
    };

    const handleWindowBlur = () => {
      // 用户按住 Space 切走窗口时可能收不到 keyup，需要兜底清理按键态。
      isSpacePressed.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState(); 
    const target = e.target as HTMLElement;

    if (!target.closest('.toolbar-wrapper')) {
      state.setOpenSettingMenu(null);
    }

    if (e.button === 1) {
      // 中键平移照顾传统鼠标用户，Space + 左键则照顾触控板和妙控鼠标用户。
      state.setSelectedNodeId(null);
      state.setEditingNodeId(null);
      state.setIsPanning(true);
      return;
    }

    if (target.closest('.toolbar-wrapper')) return;

    if (e.button !== 0) return;

    if (target.isContentEditable || target.closest('[contenteditable="true"]')) return;

    if (isSpacePressed.current) {
      // Space 平移优先于工具行为，避免按住空格时误创建节点或拖动节点。
      state.setSelectedNodeId(null);
      state.setEditingNodeId(null);
      state.setIsPanning(true);
      return;
    }
    
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

    const anchorTarget = target.closest('.connection-anchor');
    if (anchorTarget) {
      // 从锚点拖出一条草稿连线，直到鼠标松开再尝试落到目标锚点。
      e.stopPropagation();
      const nodeId = anchorTarget.getAttribute('data-nodeid')!;
      const handleDir = anchorTarget.getAttribute('data-dir') as HandleDirection;
      
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

    if (target.closest('.toolbar')) return;

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

    state.setSelectedNodeId(null);
    state.setEditingNodeId(null);
    
    if (state.activeTool === 'cursor') {
      // 选择工具点空白处直接平移，符合白板类工具的默认浏览行为。
      state.setIsPanning(true);
      return;
    }

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
      return;
    }

    const worldX = (e.clientX - state.camera.x) / state.camera.zoom;
    const worldY = (e.clientY - state.camera.y) / state.camera.zoom;

    if (state.activeTool === 'pen' && state.currentStroke) {
      state.addPointToStroke(worldX, worldY);
      return;
    }

    if (state.draftConnection) {
      // 草稿连线只更新临时终点，真正的边在 mouseup 命中锚点后才入库。
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

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = useCanvasStore.getState();
    const target = e.target as HTMLElement;

    if (state.currentStroke) {
      state.finishStroke();
    }

    if (state.draftConnection) {
      // 松开时没有落到合法锚点也要清理草稿，避免残留半条连线。
      const anchorTarget = target.closest('.connection-anchor');
      
      if (anchorTarget) {
        const targetNodeId = anchorTarget.getAttribute('data-nodeid')!;
        const targetHandleDir = anchorTarget.getAttribute('data-dir') as HandleDirection;

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
      
      state.setDraftConnection(null);
    }

    state.setIsPanning(false);
    state.setDraggingNodeId(null);
    state.setResizingHandle(null);
    hasSavedTransformHistory.current = false;
  }, []);

  // Mac 普通滚动用于平移；非 Mac 或按住修饰键时，用滚轮围绕鼠标位置缩放。
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    const state = useCanvasStore.getState();
    const wheelDelta = normalizeWheelDelta(e);
    const shouldPanOnWheel = isMacLike() && !e.metaKey && !e.ctrlKey && !e.altKey;

    if (shouldPanOnWheel) {
      state.setCamera((prev) => ({
        ...prev,
        x: prev.x - wheelDelta.x,
        y: prev.y - wheelDelta.y,
      }));
      return;
    }

    const zoomFactor = Math.exp(-wheelDelta.y * 0.002);
    const newZoom = Math.max(0.1, Math.min(5, state.camera.zoom * zoomFactor));
    
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

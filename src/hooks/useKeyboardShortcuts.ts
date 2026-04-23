import { useEffect } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';

export const useKeyboardShortcuts = () => {
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 焦点拦截（防止打字时触发）
      const activeElement = document.activeElement as HTMLElement;
      const isTyping = 
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.isContentEditable;

      if (isTyping) return; 

      // 操作系统识别
      const isMac = navigator.userAgent.includes('Mac');
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // 处理删除键
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const state = useCanvasStore.getState();
        
        if (state.selectedNodeId) {
          e.preventDefault();
          state.removeNode(state.selectedNodeId); // 删便签
        } else if (state.selectedEdgeId) {
          e.preventDefault();
          state.removeEdge(state.selectedEdgeId); // 删连线
        }
      }
      
      // 组合键拦截 (撤销/重做)
      if (isCmdOrCtrl) {
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo(); 
          else undo(); 
        } else if (key === 'y') {
          e.preventDefault();
          redo(); 
        }
      } 
      // 单键拦截 (切换工具)
      else {
        if (key === 'v') setActiveTool('cursor');
        else if (key === 'n') setActiveTool('rounded');
        else if (key === 'p') setActiveTool('pen');
        else if (key === 'e') setActiveTool('eraser');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setActiveTool]);
};
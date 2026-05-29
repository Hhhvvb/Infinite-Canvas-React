import { useEffect } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';

export const useKeyboardShortcuts = () => {
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      const isTyping = 
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.isContentEditable;

      if (isTyping) return; 

      const isMac = navigator.userAgent.includes('Mac');
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const state = useCanvasStore.getState();
        
        if (state.selectedNodeId) {
          e.preventDefault();
          state.removeNode(state.selectedNodeId);
        } else if (state.selectedEdgeId) {
          e.preventDefault();
          state.removeEdge(state.selectedEdgeId);
        }
      }
      
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

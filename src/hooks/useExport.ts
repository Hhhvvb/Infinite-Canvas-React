import { toPng } from 'html-to-image';
import { useCanvasStore } from '@/store/useCanvasStore';
import { downloadJSON } from '@/utils/file';

export const useExport = () => {
  const exportJSON = () => {
    const state = useCanvasStore.getState();
    const data = {
      nodes: state.nodes,
      nodeIds: state.nodeIds,
      edges: state.edges,
    };
    downloadJSON(data, `canvas-project-${Date.now()}`);
  };

  const exportImage = async () => {
    const state = useCanvasStore.getState();

    const targetEl = document.getElementById('canvas-export-target');
    if (!targetEl) return;

    const nodes = Object.values(state.nodes);
    if (nodes.length === 0) {
      alert('画板是空的，没有什么可以导出哦！');
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.w);
      maxY = Math.max(maxY, node.y + node.h);
    });

    const padding = 80;
    const exportWidth = maxX - minX + padding * 2;
    const exportHeight = maxY - minY + padding * 2;

    try {
      const dataUrl = await toPng(targetEl, {
        width: exportWidth,
        height: exportHeight,
        backgroundColor: '#ffffff',
        style: {
          // 导出时临时抵消相机变换，只截取内容包围盒而不是当前视口。
          transform: `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`,
          transformOrigin: 'top left',
        },
        filter: (node) => {
          if (node instanceof HTMLElement) {
            if (node.classList.contains('grid-bg')) return false;
          }
          return true;
        }
      });
      
      const link = document.createElement('a');
      link.download = `my-canvas-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出失败', err);
      alert('导出图片时发生了错误。');
    }
  };

  return { exportJSON, exportImage };
};

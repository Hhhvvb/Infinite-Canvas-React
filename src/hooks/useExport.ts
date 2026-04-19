import { toPng } from 'html-to-image';
import { useCanvasStore } from '@/store/useCanvasStore';
import { downloadJSON } from '@/utils/file';

export const useExport = () => {
  const state = useCanvasStore.getState();

  const exportJSON = () => {
    const data = {
      nodes: state.nodes,
      nodeIds: state.nodeIds,
      edges: state.edges,
    };
    downloadJSON(data, `canvas-project-${Date.now()}`);
  };

  const exportImage = async () => {
    // 1. 精准锁定只包含画布内容的容器（天然排除了工具栏！）
    const targetEl = document.getElementById('canvas-export-target');
    if (!targetEl) return;

    const nodes = Object.values(state.nodes);
    if (nodes.length === 0) {
      alert('画板是空的，没有什么可以导出哦！');
      return;
    }

    // 2. 核心算法：计算所有节点的包围盒 (Bounding Box)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.w);
      maxY = Math.max(maxY, node.y + node.h);
    });

    // 3. 设置留白和最终图片的宽高
    const padding = 80; // 给图片四周留出 80px 的呼吸感
    const exportWidth = maxX - minX + padding * 2;
    const exportHeight = maxY - minY + padding * 2;

    try {
      const dataUrl = await toPng(targetEl, {
        width: exportWidth,
        height: exportHeight,
        backgroundColor: '#ffffff', // 使用纯白底色，或者你喜欢的 '#f8fafc'
        style: {
          // 🚨 空间折叠魔法：覆盖掉相机的 transform！
          // 不管用户现在缩放到哪里、平移到哪里，导出的瞬间强行把包围盒的左上角对齐到图片的左上角
          transform: `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`,
          transformOrigin: 'top left',
        },
        filter: (node) => {
          // 过滤节点：不导出背后的点阵网格，让图片更干净专业
          if (node instanceof HTMLElement) {
            if (node.classList.contains('grid-bg')) return false;
          }
          return true; // 其他的所有便签、笔迹、连线统统放行
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
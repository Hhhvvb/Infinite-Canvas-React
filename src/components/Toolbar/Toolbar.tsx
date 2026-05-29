import { memo } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useExport } from '@/hooks/useExport';
import { parseCanvasProject } from '@/utils/project';
import type { ToolType, NodeColor, NodeShape } from '@/types';
import './Toolbar.css';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const TOOLS: { type: ToolType; icon: string; label: string; shortcut: string }[] = [
  { type: 'cursor', icon: '👆', label: '选择', shortcut: 'V' },
  { type: 'rounded', icon: '📝', label: '便签', shortcut: 'N' },
  { type: 'pen', icon: '✏️', label: '画笔', shortcut: 'P' },
  { type: 'eraser', icon: '🧼', label: '橡皮擦', shortcut: 'E' },
];

const COLORS: NodeColor[] = ['yellow', 'blue', 'pink', 'green', 'purple'];
const COLOR_HEX: Record<NodeColor, string> = {
  yellow: '#fef08a', blue: '#bae6fd', pink: '#fbcfe8', green: '#bbf7d0', purple: '#e9d5ff',
};
const SHAPES: { value: NodeShape; icon: string }[] = [
  { value: 'rounded', icon: '🟨' }, { value: 'circle', icon: '🟡' },
];
const PEN_SIZES = [2, 4, 8, 12];

export const Toolbar = memo(({ activeTool, onToolChange }: ToolbarProps) => {
  const openSettingMenu = useCanvasStore(state => state.openSettingMenu);
  const setOpenSettingMenu = useCanvasStore(state => state.setOpenSettingMenu);
  const noteSettings = useCanvasStore(state => state.noteSettings);
  const setNoteSettings = useCanvasStore(state => state.setNoteSettings);
  const penSettings = useCanvasStore(state => state.penSettings);
  const setPenSettings = useCanvasStore(state => state.setPenSettings);
  const undo = useCanvasStore(state => state.undo);
  const redo = useCanvasStore(state => state.redo);
  const pastCount = useCanvasStore(state => state.past.length);
  const futureCount = useCanvasStore(state => state.future.length);
  const { exportJSON, exportImage } = useExport();
  const loadProject = useCanvasStore(state => state.loadProject);
  const resetCanvas = useCanvasStore(state => state.resetCanvas);

  const handleToolClick = (type: ToolType) => {
    // 只有带配置项的工具会展开设置面板，避免普通工具占用额外交互空间。
    onToolChange(type);
    if (type === 'rounded' || type === 'pen') {
      setOpenSettingMenu(openSettingMenu === type ? null : type);
    } else {
      setOpenSettingMenu(null);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 导入文件来自用户本地，必须先校验结构再覆盖当前画布状态。
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      try {
        const data = JSON.parse(String(f.target?.result ?? ''));
        const project = parseCanvasProject(data);

        if (!project) {
          alert('工程文件格式不正确。');
          return;
        }

        loadProject(project);
      } catch {
        alert('读取工程文件失败，请确认它是有效的 JSON 文件。');
      } finally {
        e.currentTarget.value = '';
      }
    };
    reader.onerror = () => {
      alert('读取工程文件失败。');
      e.currentTarget.value = '';
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('确定要清空整个画板吗？\n')) {
      resetCanvas();
    }
  };

  return (
    <div 
      className="toolbar-wrapper"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="toolbar">
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            className={`tool-btn ${activeTool === tool.type ? 'active' : ''}`}
            onClick={() => handleToolClick(tool.type)}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
        <div className="toolbar-divider-horizontal" />
        
        <button 
          className="tool-btn" 
          onClick={undo} 
          disabled={pastCount === 0}
          title="撤销 (Ctrl+Z)"
          style={{ opacity: pastCount === 0 ? 0.3 : 1, cursor: pastCount === 0 ? 'not-allowed' : 'pointer' }}
        >
          ↩️
        </button>
        <button 
          className="tool-btn" 
          onClick={redo} 
          disabled={futureCount === 0}
          title="重做 (Ctrl+Y)"
          style={{ opacity: futureCount === 0 ? 0.3 : 1, cursor: futureCount === 0 ? 'not-allowed' : 'pointer' }}
        >
          ↪️
        </button>

        <div className="toolbar-divider-horizontal" />
        <button className="tool-btn" onClick={exportImage} title="导出图片">🖼️</button>
        
        <button className="tool-btn" onClick={exportJSON} title="保存工程">💾</button>
        
        <label className="tool-btn" title="读取工程" style={{ cursor: 'pointer' }}>
          📂
          <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
        </label>

        <div className="toolbar-divider-horizontal" />

        <button 
          className="tool-btn" 
          onClick={handleReset} 
          title="清空画板"
          style={{ color: '#ef4444' }}
        >
          🗑️
        </button>
      </div>

      {openSettingMenu === 'rounded' && activeTool === 'rounded' && (
        <div className="tool-settings-panel">
          <div className="settings-row">
            {COLORS.map(color => (
              <button
                key={color}
                className={`color-dot ${noteSettings.color === color ? 'active' : ''}`}
                style={{ backgroundColor: COLOR_HEX[color] }}
                onClick={() => setNoteSettings({ color })}
              />
            ))}
          </div>
          <div className="settings-divider" />
          <div className="settings-row">
            {SHAPES.map(shape => (
              <button
                key={shape.value}
                className={`shape-icon ${noteSettings.shape === shape.value ? 'active' : ''}`}
                onClick={() => setNoteSettings({ shape: shape.value })}
              >
                {shape.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {openSettingMenu === 'pen' && activeTool === 'pen' && (
        <div className="tool-settings-panel pen-panel">
          <div className="settings-row">
            {COLORS.map(color => (
              <button
                key={color}
                className={`color-dot ${penSettings.color === color ? 'active' : ''}`}
                style={{ backgroundColor: COLOR_HEX[color] }}
                onClick={() => setPenSettings({ color })}
              />
            ))}
          </div>
          <div className="settings-divider" />
          <div className="settings-row">
            {PEN_SIZES.map(size => (
              <button
                key={size}
                className={`pen-size-btn ${penSettings.size === size ? 'active' : ''}`}
                onClick={() => setPenSettings({ size })}
              >
                <div style={{ width: size, height: size, backgroundColor: '#334155', borderRadius: '50%' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

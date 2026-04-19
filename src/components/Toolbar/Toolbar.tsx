import { memo } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useExport } from '@/hooks/useExport';
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
const PEN_SIZES = [2, 4, 8, 12]; // 画笔粗细档位

export const Toolbar = memo(({ activeTool, onToolChange }: ToolbarProps) => {
  // 记录当前展开了哪个工具的设置面板
  const openSettingMenu = useCanvasStore(state => state.openSettingMenu);
  const setOpenSettingMenu = useCanvasStore(state => state.setOpenSettingMenu);
  const { noteSettings, setNoteSettings, penSettings, setPenSettings } = useCanvasStore();
  const undo = useCanvasStore(state => state.undo);
  const redo = useCanvasStore(state => state.redo);
  const pastCount = useCanvasStore(state => state.past.length);
  const futureCount = useCanvasStore(state => state.future.length);
  const { exportJSON, exportImage } = useExport();
  const loadProject = useCanvasStore(state => state.loadProject);
  const resetCanvas = useCanvasStore(state => state.resetCanvas);

  const handleToolClick = (type: ToolType) => {
    onToolChange(type);
    // 如果点击的是便签或画笔，切换它的设置面板；否则关闭面板
    if (type === 'rounded' || type === 'pen') {
      setOpenSettingMenu(openSettingMenu === type ? null : type);
    } else {
      setOpenSettingMenu(null);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = JSON.parse(f.target?.result as string);
      loadProject(data);
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    // 浏览器原生的确认框，简单好用
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
      {/* 主工具栏 */}
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
        {/* 导出 PNG */}
        <button className="tool-btn" onClick={exportImage} title="导出图片">🖼️</button>
        
        {/* 导出 JSON */}
        <button className="tool-btn" onClick={exportJSON} title="保存工程">💾</button>
        
        {/* 导入 JSON (利用隐藏的 input) */}
        <label className="tool-btn" title="读取工程" style={{ cursor: 'pointer' }}>
          📂
          <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
        </label>

        <div className="toolbar-divider-horizontal" />

        {/* 清空画板按钮 */}
        <button 
          className="tool-btn" 
          onClick={handleReset} 
          title="清空画板"
          style={{ color: '#ef4444' }} // 可以稍微给它加点红色警示一下
        >
          🗑️
        </button>
      </div>

      {/* 便签设置面板 */}
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

      {/* 画笔设置面板 */}
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
                {/* 用黑点的大小直观表示笔的粗细 */}
                <div style={{ width: size, height: size, backgroundColor: '#334155', borderRadius: '50%' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
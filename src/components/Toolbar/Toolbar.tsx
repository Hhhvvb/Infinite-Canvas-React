import { memo } from 'react';
import type { ToolType } from '@/types';
import './Toolbar.css';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const TOOLS: { type: ToolType; icon: string; label: string; shortcut: string }[] = [
  { type: 'cursor', icon: '👆', label: '选择', shortcut: 'V' },
  { type: 'text', icon: '📝', label: '便签', shortcut: 'N' },
  { type: 'rect', icon: '🟦', label: '矩形', shortcut: 'R' },
  { type: 'circle', icon: '🔴', label: '圆形', shortcut: 'O' },
];

export const Toolbar = memo(({ activeTool, onToolChange }: ToolbarProps) => {
  return (
    <div className="toolbar">
      {TOOLS.map((tool) => (
        <button
          key={tool.type}
          className={`tool-btn ${activeTool === tool.type ? 'active' : ''}`}
          onClick={() => onToolChange(tool.type)}
          title={`${tool.label} (${tool.shortcut})`}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
});
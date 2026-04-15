import React, { useState, useEffect, memo, useRef } from 'react';
import type { CanvasNode } from '@/types';
import { getDynamicFontSize } from '@/utils/layout';

interface NoteProps {
  node: CanvasNode;
  cameraZoom: number;
  isEditing: boolean;
  onDoubleClick: () => void;
  onBlur: () => void;
  onUpdate: (id: string, content: string) => void;
}

export const Note = memo(({ node, isEditing, onDoubleClick, onBlur, onUpdate }: NoteProps) => {
  const [localText, setLocalText] = useState(node.content || '');
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalText(node.content || '');
  }, [node.content]);

  useEffect(() => {
    if (isEditing && editRef.current) {
      // 【修复 Bug 1】：进入编辑模式时，先把现有的文字塞进输入框！
      editRef.current.innerText = localText;
      
      editRef.current.focus();
      
      const selection = window.getSelection();
      const range = document.createRange();
      
      // 光标定位到最后
      if (editRef.current.childNodes.length > 0) {
        range.selectNodeContents(editRef.current);
        range.collapse(false);
      } else {
        range.setStart(editRef.current, 0);
        range.setEnd(editRef.current, 0);
      }
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]); // 注意：这里不要把 localText 加进依赖数组，否则打字时光标会乱跳

  const fontSize = getDynamicFontSize(node.w, node.h, localText);

  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    boxSizing: 'border-box',
  };

  const textStyle: React.CSSProperties = {
    width: '100%',
    fontSize: `${fontSize}px`,
    textAlign: 'center',
    lineHeight: '1.2',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    color: '#0f172a',
    fontFamily: 'inherit',
    border: 'none',
    background: 'transparent',
    outline: 'none',
    margin: 0,
    minHeight: '1em', // 保证没字的时候也能撑起一行的高度让光标显示
    cursor: isEditing ? 'text' : 'default', // 编辑时鼠标变成 I 型光标
    userSelect: isEditing ? 'text' : 'none', // 极其关键：编辑时允许选中文字，平时禁止选中
    WebkitUserSelect: isEditing ? 'text' : 'none',
  };

  return (
    <div 
      style={wrapperStyle}
      onDoubleClick={onDoubleClick}
    >
      {isEditing ? (
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          className="node-input"
          style={textStyle}
          onInput={(e) => setLocalText(e.currentTarget.innerText)}
          onBlur={(e) => {
            onUpdate(node.id, e.currentTarget.innerText);
            onBlur();
          }}
          onWheel={(e) => e.stopPropagation()} 
          
          // 【修复 Bug 2】：拦截粘贴事件，只允许纯文本！
          onPaste={(e) => {
            e.preventDefault(); // 阻止浏览器默认的富文本粘贴行为
            const text = e.clipboardData.getData('text/plain'); // 强制提取纯文本
            // document.execCommand 虽然在标准中被标记为过时，
            // 但它是目前前端界唯一能【保留撤销(Ctrl+Z)历史】的插入文本方案，Miro 和 Notion 都在用它
            document.execCommand('insertText', false, text); 
          }}
        />
      ) : (
        <div style={textStyle}>
          {localText}
        </div>
      )}
    </div>
  );
});
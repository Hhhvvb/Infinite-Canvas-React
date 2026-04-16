import { useState, useEffect, memo, useRef } from 'react';
import type { CanvasNode } from '@/types';
import { getDynamicFontSize } from '@/utils/layout';
import './Note.css'

interface NoteProps {
  node: CanvasNode;
  cameraZoom: number;
  isEditing: boolean;
  onDoubleClick: (id: string) => void;
  onBlur: () => void;
  onUpdate: (id: string, content: string) => void;
}

export const Note = memo(({ node, isEditing, onDoubleClick, onBlur, onUpdate }: NoteProps) => {
  const [localText, setLocalText] = useState(node.content || '');
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalText(node.content || '');
  }, [node.content]);

  // 当进入编辑模式时，自动聚焦并将光标移动到文本末尾
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.innerText = localText;
      editRef.current.focus();
      
      const selection = window.getSelection();  // 获取全局光标对象
      const range = document.createRange();
      
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
  }, [isEditing]);

  const fontSize = getDynamicFontSize(node.w, node.h, localText);

  return (
    <div 
      className="note-wrapper"
      onDoubleClick={() => onDoubleClick(node.id)}
    >
      {isEditing ? (
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          className="note-input note-text"
          style={{ fontSize }}
          onInput={(e) => setLocalText(e.currentTarget.innerText)}
          onBlur={(e) => {
            onUpdate(node.id, e.currentTarget.innerText);
            onBlur();
          }}
          onWheel={(e) => e.stopPropagation()} 
          
          // 拦截粘贴事件，只允许纯文本！
          onPaste={(e) => {
            e.preventDefault(); // 阻止浏览器默认的富文本粘贴行为
            const text = e.clipboardData.getData('text/plain'); // 强制提取纯文本
            document.execCommand('insertText', false, text); // 保留撤销(Ctrl+Z)历史
          }}
        />
      ) : (
        <div className="note-text" style={{ fontSize }}>
          {localText}
        </div>
      )}
    </div>
  );
});
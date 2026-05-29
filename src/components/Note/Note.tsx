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
    // contentEditable 不像 input 有 value，需要进入编辑态时手动同步 DOM 文本和光标。
    const currentText = node.content || '';

    if (isEditing && editRef.current) {
      editRef.current.innerText = currentText;
      editRef.current.focus();
      
      const selection = window.getSelection();
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
  }, [isEditing, node.content]);

  const displayText = isEditing ? localText : node.content || '';

  const fontSize = getDynamicFontSize(node.w, node.h, displayText);

  return (
    <div 
      className="note-wrapper"
      onDoubleClick={() => {
        setLocalText(node.content || '');
        onDoubleClick(node.id);
      }}
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
          
          onPaste={(e) => {
            // 阻止富文本进入便签，避免粘贴内容破坏统一样式。
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
          }}
        />
      ) : (
        <div className="note-text" style={{ fontSize }}>
          {displayText}
        </div>
      )}
    </div>
  );
});

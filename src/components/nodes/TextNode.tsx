import React, { memo, useRef, useEffect, useState } from 'react';
import type { NodeProps } from 'reactflow';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import type { TextNodeData } from '../../types';
import { useAppStore } from '../../store/useAppStore';

const MIN_WIDTH = 60;
const MIN_HEIGHT = 24;

const TextNode: React.FC<NodeProps<TextNodeData>> = ({ id, data, selected }) => {
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [localText, setLocalText] = useState(data.text || '');

    // Sync from store if data.text changes externally
    useEffect(() => {
        setLocalText(data.text || '');
    }, [data.text]);

    // Auto-resize textarea to tightly fit content using a hidden measurement span
    useEffect(() => {
        const textarea = textareaRef.current;
        const measure = measureRef.current;
        if (!textarea || !measure) return;

        // Copy text style to measurement span
        const textContent = localText || textarea.placeholder || '';
        // Replace newlines with <br> for measurement, and add a trailing char to account for cursor space
        measure.innerHTML = textContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n$/g, '\n ')  // trailing newline needs a space to render height
            .replace(/\n/g, '<br/>') + '&nbsp;'; // trailing space for cursor

        const measuredWidth = Math.max(measure.offsetWidth + 4, MIN_WIDTH);
        const measuredHeight = Math.max(measure.offsetHeight + 2, MIN_HEIGHT);

        textarea.style.width = `${measuredWidth}px`;
        textarea.style.height = `${measuredHeight}px`;
    }, [localText, data.fontSize, data.isBold, data.isItalic, data.isUnderline]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalText(e.target.value);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (localText !== data.text) {
            updateNodeData(id, { text: localText });
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey || e.metaKey) {
            // Font size shortcuts: Ctrl + Shift + > (or .) and Ctrl + Shift + < (or ,)
            if (e.shiftKey) {
                if (e.key === '>' || e.key === '.') {
                    e.preventDefault();
                    updateNodeData(id, { fontSize: Math.min(72, (data.fontSize || 16) + 1) });
                    return;
                }
                if (e.key === '<' || e.key === ',') {
                    e.preventDefault();
                    updateNodeData(id, { fontSize: Math.max(8, (data.fontSize || 16) - 1) });
                    return;
                }
            }

            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    updateNodeData(id, { isBold: !data.isBold });
                    break;
                case 'i':
                    e.preventDefault();
                    updateNodeData(id, { isItalic: !data.isItalic });
                    break;
                case 'u':
                    e.preventDefault();
                    updateNodeData(id, { isUnderline: !data.isUnderline });
                    break;
                case 'l':
                    e.preventDefault();
                    updateNodeData(id, { textAlign: 'left' });
                    break;
                case 'e':
                    e.preventDefault();
                    updateNodeData(id, { textAlign: 'center' });
                    break;
                case 'r':
                    e.preventDefault();
                    updateNodeData(id, { textAlign: 'right' });
                    break;
                case 'j':
                    e.preventDefault();
                    updateNodeData(id, { textAlign: 'justify' });
                    break;
            }
        }
    };

    // Shared text styles for both textarea and hidden measurement span
    const textStyles: React.CSSProperties = {
        fontSize: data.fontSize || 16,
        fontWeight: data.isBold ? 'bold' : 'normal',
        fontStyle: data.isItalic ? 'italic' : 'normal',
        textDecoration: data.isUnderline ? 'underline' : 'none',
        lineHeight: 1.6,
        fontFamily: 'inherit',
        letterSpacing: 'inherit',
        wordBreak: 'break-word' as const,
        whiteSpace: 'pre-wrap' as const,
    };

    // Prevent dragging when editing text
    const pointerEventsClass = isEditing ? 'nodrag nowheel cursor-text' : 'cursor-grab';

    return (
        <div
            className={`relative group ${pointerEventsClass} ${
                selected ? 'z-50' : 'z-0'
            }`}
            style={{ padding: '2px' }}
            onDoubleClick={handleDoubleClick}
        >
            {/* Hidden measurement span — matches textarea styling exactly */}
            <span
                ref={measureRef}
                aria-hidden
                style={{
                    ...textStyles,
                    position: 'absolute',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    top: 0,
                    left: 0,
                    display: 'inline-block',
                }}
            />

            {/* Floating Toolbar - Visible only when selected */}
            {selected && (
                <div 
                    className="absolute -top-12 left-0 bg-white shadow-lg rounded-md border border-slate-200 p-1 flex items-center gap-1 z-50 nodrag"
                >
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateNodeData(id, { isBold: !data.isBold })}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${data.isBold ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateNodeData(id, { isItalic: !data.isItalic })}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${data.isItalic ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateNodeData(id, { isUnderline: !data.isUnderline })}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${data.isUnderline ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                        title="Underline (Ctrl+U)"
                    >
                        <Underline size={14} />
                    </button>
                    
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateNodeData(id, { textAlign: 'left' })}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${data.textAlign === 'left' || !data.textAlign ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                        title="Align Left (Ctrl+L)"
                    >
                        <AlignLeft size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateNodeData(id, { textAlign: 'center' })}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${data.textAlign === 'center' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                        title="Align Center (Ctrl+E)"
                    >
                        <AlignCenter size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateNodeData(id, { textAlign: 'right' })}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${data.textAlign === 'right' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                        title="Align Right (Ctrl+R)"
                    >
                        <AlignRight size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateNodeData(id, { textAlign: 'justify' })}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${data.textAlign === 'justify' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                        title="Justify (Ctrl+J)"
                    >
                        <AlignJustify size={14} />
                    </button>

                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    
                    <input
                        type="number"
                        value={data.fontSize || 16}
                        onChange={(e) => updateNodeData(id, { fontSize: Number(e.target.value) })}
                        className="w-12 text-xs border border-slate-200 rounded px-1 py-1 outline-none focus:border-blue-400 nodrag"
                        title="Font Size (Ctrl+Shift+. / Ctrl+Shift+,)"
                        min="8"
                        max="72"
                    />
                    
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    
                    <input
                        type="color"
                        value={data.color || '#334155'}
                        onChange={(e) => updateNodeData(id, { color: e.target.value })}
                        className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
                        title="Text Color"
                    />
                </div>
            )}

            <textarea
                ref={textareaRef}
                value={localText}
                onChange={handleTextChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={isEditing ? "Type here..." : "Double click to edit..."}
                readOnly={!isEditing}
                className={`bg-transparent resize-none outline-none overflow-hidden ${isEditing ? 'cursor-text' : 'cursor-grab pointer-events-none'}`}
                style={{
                    ...textStyles,
                    color: data.color || '#334155',
                    textAlign: data.textAlign || 'left',
                    padding: 0,
                    margin: 0,
                    border: 'none',
                    display: 'block',
                    minWidth: `${MIN_WIDTH}px`,
                    minHeight: `${MIN_HEIGHT}px`,
                }}
            />
        </div>
    );
};

export default memo(TextNode);


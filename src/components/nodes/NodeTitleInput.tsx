import React, { useRef, useEffect, useState } from 'react';
import { useNodeId } from 'reactflow';
import { useAppStore } from '../../store/useAppStore';

interface NodeTitleInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

export const NodeTitleInput: React.FC<NodeTitleInputProps> = ({ value, onChange, placeholder, className = '', readOnly }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const nodeId = useNodeId();
    const selectedTime = useRef<number>(0);
    
    const isSelected = useAppStore(state => {
        if (!nodeId) return false;
        const node = state.nodes.find(n => n.id === nodeId);
        return node?.selected || false;
    });

    useEffect(() => {
        if (isSelected) {
            selectedTime.current = Date.now();
        } else {
            setIsEditing(false);
            selectedTime.current = 0;
        }
    }, [isSelected]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [value, isEditing]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [isEditing]);

    const isActuallyReadOnly = readOnly || !isEditing;

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={1}
            className={`resize-none overflow-hidden outline-none bg-transparent block text-left ${className} ${isEditing ? 'nodrag cursor-text' : 'cursor-grab'}`}
            style={{ minHeight: '24px' }}
            readOnly={isActuallyReadOnly}
            onClick={(e) => {
                if (isSelected && !readOnly && !isEditing) {
                    if (Date.now() - selectedTime.current > 200) {
                        setIsEditing(true);
                    }
                }
            }}
            onDoubleClick={(e) => {
                if (!readOnly && !isEditing) {
                    setIsEditing(true);
                }
            }}
            onBlur={() => {
                setIsEditing(false);
                if (textareaRef.current) textareaRef.current.scrollLeft = 0;
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                }
            }}
        />
    );
};

import React, { useRef, useEffect } from 'react';

interface NodeTitleInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

export const NodeTitleInput: React.FC<NodeTitleInputProps> = ({ value, onChange, placeholder, className = '', readOnly }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to auto to correctly measure scrollHeight on shrinking
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={1}
            className={`resize-none overflow-hidden outline-none bg-transparent block text-left ${className}`}
            style={{ minHeight: '24px' }}
            readOnly={readOnly}
            onKeyDown={(e) => {
                // Blur on Enter key to finish editing instead of adding a new line
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                }
            }}
        />
    );
};

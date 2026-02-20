import React, { useState, useCallback } from 'react';
import { ChevronUp, ExternalLink } from 'lucide-react';

interface NoteEditorProps {
    note?: string;
    onChange: (note: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    accentColor?: string; // e.g. 'cyan', 'purple', 'blue'
}

// URL regex pattern
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|www\.[^\s<>"{}|\\^`[\]]+)/gi;

/**
 * Parses text and returns React elements with clickable URLs.
 * URLs are styled blue+underline and open via Ctrl+Click.
 */
const renderTextWithLinks = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Reset regex
    URL_REGEX.lastIndex = 0;

    while ((match = URL_REGEX.exec(text)) !== null) {
        // Text before URL
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const url = match[0];
        const href = url.startsWith('http') ? url : `https://${url}`;

        parts.push(
            <span
                key={match.index}
                className="text-blue-600 underline cursor-pointer hover:text-blue-800 inline-flex items-center gap-0.5"
                onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(href, '_blank');
                    }
                }}
                title="Ctrl+Click to open"
            >
                {url}
                <ExternalLink size={10} className="inline opacity-50" />
            </span>
        );

        lastIndex = match.index + url.length;
    }

    // Remaining text after last URL
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
};

/**
 * Collapsible note editor with edit/preview modes.
 * - Edit mode: textarea for writing
 * - Preview mode: renders text with clickable URLs (Ctrl+Click)
 */
const NoteEditor: React.FC<NoteEditorProps> = ({ note, onChange, isOpen, onToggle, accentColor = 'cyan' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const hasNote = !!note && note.trim().length > 0;

    const handleBlur = useCallback(() => {
        setIsEditing(false);
    }, []);

    const borderColor = `border-${accentColor}-200`;

    if (!isOpen) return null;

    return (
        <div className={`border-t border-slate-100 pt-2`}>
            <button
                onClick={onToggle}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase w-full hover:text-slate-600 transition-colors"
            >
                <ChevronUp size={10} />
                Notes
            </button>

            <div className="mt-1.5">
                {isEditing ? (
                    <textarea
                        value={note || ''}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={handleBlur}
                        autoFocus
                        rows={3}
                        placeholder="Add notes, references, links..."
                        className={`w-full text-xs p-2 border ${borderColor} rounded resize-y focus:outline-none focus:ring-1 focus:ring-${accentColor}-400 bg-white leading-relaxed`}
                    />
                ) : (
                    <div
                        onClick={() => setIsEditing(true)}
                        className={`w-full text-xs p-2 border border-slate-200 rounded cursor-text min-h-[40px] ${hasNote ? 'bg-white' : 'bg-slate-50'} leading-relaxed whitespace-pre-wrap break-words`}
                    >
                        {hasNote ? (
                            note!.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <br />}
                                    {renderTextWithLinks(line)}
                                </React.Fragment>
                            ))
                        ) : (
                            <span className="text-slate-400 italic">Click to add notes...</span>
                        )}
                    </div>
                )}

                {hasNote && !isEditing && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                        <ExternalLink size={8} />
                        <span>Ctrl+Click to open links</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export { NoteEditor, renderTextWithLinks };
export default NoteEditor;

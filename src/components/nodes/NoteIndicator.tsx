import React, { useState } from 'react';
import { StickyNote } from 'lucide-react';

interface NoteIndicatorProps {
    note?: string;
    onClick: () => void;
}

/**
 * Small icon shown in node headers when a note exists.
 * Hover shows tooltip with note preview.
 */
const NoteIndicator: React.FC<NoteIndicatorProps> = ({ note, onClick }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const hasNote = !!note && note.trim().length > 0;

    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={`transition-all ${hasNote
                    ? 'text-yellow-300 hover:text-yellow-100 drop-shadow-[0_0_3px_rgba(253,224,71,0.6)]'
                    : 'text-yellow-400/70 hover:text-yellow-300'
                    }`}
                title={hasNote ? 'View/Edit Note' : 'Add Note'}
            >
                <StickyNote
                    size={14}
                    fill={hasNote ? 'currentColor' : 'none'}
                    strokeWidth={hasNote ? 1.5 : 2}
                />
            </button>

            {/* Tooltip */}
            {showTooltip && hasNote && (
                <div className="absolute z-50 top-full right-0 mt-1 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg pointer-events-none leading-relaxed">
                    {note!.length > 100 ? note!.slice(0, 100) + '…' : note}
                </div>
            )}
        </div>
    );
};

export default NoteIndicator;

import React from 'react';
import { Trash2, Copy, Plus } from 'lucide-react';
import type { NodeType } from '../types';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    type: 'node' | 'edge' | 'pane' | 'multi';
    onDelete?: () => void;
    onCopy?: () => void;
    onCreateNode?: (type: NodeType) => void;
    onSendToBack?: () => void;
    onBringToFront?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    onClose,
    type,
    onDelete,
    onCopy,
    onCreateNode,
    onSendToBack,
    onBringToFront,
}) => {
    const handleClick = (action: () => void) => {
        action();
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40"
                onClick={onClose}
                onContextMenu={(e) => {
                    e.preventDefault();
                    onClose();
                }}
            />

            {/* Menu */}
            <div
                className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px]"
                style={{ left: x, top: y }}
            >
                {/* Node/Edge options */}
                {(type === 'node' || type === 'edge') && (
                    <>
                        {onCopy && (
                            <button
                                onClick={() => handleClick(onCopy)}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                            >
                                <Copy size={14} />
                                Copy
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => handleClick(onDelete)}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-red-50 text-red-600"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        )}
                        {onSendToBack && (
                            <button
                                onClick={() => handleClick(onSendToBack)}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                            >
                                <span className="text-xs">▼</span>
                                Send to Back
                            </button>
                        )}
                        {onBringToFront && (
                            <button
                                onClick={() => handleClick(onBringToFront)}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                            >
                                <span className="text-xs">▲</span>
                                Bring to Front
                            </button>
                        )}
                    </>
                )}

                {/* Multi-select options */}
                {type === 'multi' && (
                    <>
                        {onCopy && (
                            <button
                                onClick={() => handleClick(onCopy)}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                            >
                                <Copy size={14} />
                                Copy All
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => handleClick(onDelete)}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-red-50 text-red-600"
                            >
                                <Trash2 size={14} />
                                Delete All
                            </button>
                        )}
                    </>
                )}

                {/* Pane (empty canvas) options */}
                {type === 'pane' && onCreateNode && (
                    <div className="group relative">
                        <button
                            className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 justify-between hover:bg-slate-50 text-slate-700"
                        >
                            <span className="flex items-center gap-2">
                                <Plus size={14} />
                                New Node
                            </span>
                            <span className="text-slate-400">▶</span>
                        </button>

                        {/* Submenu */}
                        <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[140px] hidden group-hover:block">
                            <button
                                onClick={() => handleClick(() => onCreateNode('source'))}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-blue-50 text-slate-700"
                            >
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Source Node
                            </button>
                            <button
                                onClick={() => handleClick(() => onCreateNode('process'))}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-purple-50 text-slate-700"
                            >
                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                Process Node
                            </button>
                            <button
                                onClick={() => handleClick(() => onCreateNode('factor'))}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-emerald-50 text-slate-700"
                            >
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                Factor Node
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

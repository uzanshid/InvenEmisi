import React from 'react';
import type { NodeType } from '../types';
import { Database, FileDigit, Settings, Layers, ArrowRightLeft } from 'lucide-react';

export const Sidebar = () => {
    const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-[250px] h-screen bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Workbench
            </h1>

            <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Nodes</div>

                <div
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm cursor-grab hover:border-blue-500 hover:shadow-md transition-all select-none"
                    onDragStart={(event) => onDragStart(event, 'source')}
                    draggable
                >
                    <div className="p-2 bg-blue-100 rounded-md text-blue-600">
                        <Database size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Source Node</span>
                </div>

                <div
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm cursor-grab hover:border-emerald-500 hover:shadow-md transition-all select-none"
                    onDragStart={(event) => onDragStart(event, 'factor')}
                    draggable
                >
                    <div className="p-2 bg-emerald-100 rounded-md text-emerald-600">
                        <FileDigit size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Factor Node</span>
                </div>

                <div
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm cursor-grab hover:border-purple-500 hover:shadow-md transition-all select-none"
                    onDragStart={(event) => onDragStart(event, 'process')}
                    draggable
                >
                    <div className="p-2 bg-purple-100 rounded-md text-purple-600">
                        <Settings size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Process Node</span>
                </div>
            </div>

            <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</div>

                <div
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm cursor-grab hover:border-indigo-500 hover:shadow-md transition-all select-none"
                    onDragStart={(event) => onDragStart(event, 'group')}
                    draggable
                >
                    <div className="p-2 bg-indigo-100 rounded-md text-indigo-600">
                        <Layers size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Group</span>
                </div>

                <div
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm cursor-grab hover:border-fuchsia-500 hover:shadow-md transition-all select-none"
                    onDragStart={(event) => onDragStart(event, 'passthrough')}
                    draggable
                >
                    <div className="p-2 bg-fuchsia-100 rounded-md text-fuchsia-600">
                        <ArrowRightLeft size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">PassThrough</span>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-400 space-y-1">
                    <div><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Ctrl+Z</kbd> Undo</div>
                    <div><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Ctrl+Y</kbd> Redo</div>
                    <div><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Delete</kbd> Remove</div>
                    <div><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Ctrl+Scroll</kbd> Zoom</div>
                </div>
            </div>
        </aside>
    );
};

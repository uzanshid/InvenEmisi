import React, { useState } from 'react';
import type { NodeType } from '../types';
import { Database, FileDigit, Settings, Layers, ArrowRightLeft, FileSpreadsheet, Filter, Calculator, Download, Columns, ChevronDown, ChevronRight, Ghost } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="space-y-3">
            <div
                className="flex items-center gap-2 cursor-pointer select-none group"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? (
                    <ChevronDown size={14} style={{ color: '#2cc0b4' }} />
                ) : (
                    <ChevronRight size={14} style={{ color: '#2cc0b4' }} />
                )}
                <div className="text-xs font-semibold uppercase tracking-wider transition-colors group-hover:opacity-80" style={{ color: '#2cc0b4' }}>
                    {title}
                </div>
            </div>
            {isOpen && <div className="ml-5 space-y-2">{children}</div>}
        </div>
    );
};

const NodeCard = ({
    nodeType,
    label,
    icon,
    accentColor,
    onDragStart,
}: {
    nodeType: NodeType;
    label: string;
    icon: React.ReactNode;
    accentColor: string;
    onDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}) => (
    <div
        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm cursor-grab hover:shadow-md transition-all select-none"
        style={{ '--accent': accentColor } as React.CSSProperties}
        onDragStart={(event) => onDragStart(event, nodeType)}
        onMouseEnter={e => (e.currentTarget.style.borderColor = accentColor)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
        draggable
    >
        <div className="p-2 rounded-md" style={{ background: `${accentColor}20`, color: accentColor }}>
            {icon}
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
);

export const Sidebar = () => {
    const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-[250px] h-screen border-r border-slate-200 flex flex-col gap-4 overflow-y-auto"
            style={{ background: 'linear-gradient(180deg, #f0fcfd 0%, #f5fffe 60%, #f8fff9 100%)' }}>

            {/* Header image — replaces text */}
            <div className="px-3 pt-4 pb-2">
                <img
                    src="/header.png"
                    alt="InvenEmis"
                    className="w-full object-contain"
                    style={{ maxHeight: '56px' }}
                />
            </div>

            {/* Thin brand separator */}
            <div className="mx-3 h-px" style={{ background: 'linear-gradient(to right, #12abd9, #2cc0b4, #4ed791)' }} />

            <div className="px-4 flex flex-col gap-4">
                <CollapsibleSection title="Data Nodes" defaultOpen={false}>
                    <NodeCard nodeType="source" label="Source Node" icon={<Database size={20} />} accentColor="#12abd9" onDragStart={onDragStart} />
                    <NodeCard nodeType="factor" label="Factor Node" icon={<FileDigit size={20} />} accentColor="#2cc0b4" onDragStart={onDragStart} />
                    <NodeCard nodeType="process" label="Process Node" icon={<Settings size={20} />} accentColor="#4ed791" onDragStart={onDragStart} />
                </CollapsibleSection>

                <CollapsibleSection title="Organization" defaultOpen={false}>
                    <NodeCard nodeType="groupBox" label="Group" icon={<Layers size={20} />} accentColor="#1aada8" onDragStart={onDragStart} />
                    <NodeCard nodeType="passthrough" label="PassThrough" icon={<ArrowRightLeft size={20} />} accentColor="#0d8fb5" onDragStart={onDragStart} />
                </CollapsibleSection>

                <CollapsibleSection title="Batch Processing" defaultOpen={false}>
                    <NodeCard nodeType="dataset" label="Dataset" icon={<FileSpreadsheet size={20} />} accentColor="#12abd9" onDragStart={onDragStart} />
                    <NodeCard nodeType="filter" label="Filter" icon={<Filter size={20} />} accentColor="#2cc0b4" onDragStart={onDragStart} />
                    <NodeCard nodeType="tableMath" label="TableMath" icon={<Calculator size={20} />} accentColor="#38c4a0" onDragStart={onDragStart} />
                    <NodeCard nodeType="transform" label="Transform" icon={<Columns size={20} />} accentColor="#4ed791" onDragStart={onDragStart} />
                    <NodeCard nodeType="ghost" label="Ghost" icon={<Ghost size={20} />} accentColor="#7ec8e3" onDragStart={onDragStart} />
                </CollapsibleSection>

                <CollapsibleSection title="Post Process" defaultOpen={false}>
                    <NodeCard nodeType="export" label="Export" icon={<Download size={20} />} accentColor="#2cc0b4" onDragStart={onDragStart} />
                </CollapsibleSection>
            </div>

            <div className="mt-auto px-4 pb-4 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-400 space-y-1">
                    <div><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Ctrl+Z</kbd> Undo</div>
                    <div><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Ctrl+Y</kbd> Redo</div>
                    <div><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Delete</kbd> Remove</div>
                    <div><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Ctrl+Scroll</kbd> Zoom</div>
                </div>
            </div>
        </aside>
    );
};

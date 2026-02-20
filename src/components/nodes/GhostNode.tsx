import React, { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Ghost, Minimize2, Maximize2, Link2, Unlink } from 'lucide-react';
import type { GhostNodeData } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import NoteIndicator from './NoteIndicator';
import NoteEditor from './NoteEditor';

const GhostNode: React.FC<NodeProps<GhostNodeData>> = ({ id, data, selected }) => {
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const isMinimized = !!data.isMinimized;
    const [noteOpen, setNoteOpen] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    const allNodes = useReactFlow().getNodes();

    // Find the source node being mirrored
    const sourceNode = data.sourceNodeId
        ? allNodes.find(n => n.id === data.sourceNodeId)
        : undefined;

    const isLinked = !!sourceNode;

    // Get mirrored value from source
    const getMirroredValue = () => {
        if (!sourceNode) return null;
        const sd = sourceNode.data;
        const nodeType = sd?.type;

        if (nodeType === 'source' || nodeType === 'factor') {
            return {
                value: sd.value ?? 0,
                unit: sd.unit || '',
                label: sd.label || 'Unknown',
            };
        }
        if (nodeType === 'process') {
            return {
                value: sd.calculatedValue ?? 0,
                unit: sd.resultUnit || '',
                label: sd.label || 'Unknown',
            };
        }
        // For any other node type, just show the label
        return {
            value: null,
            unit: '',
            label: sd?.label || 'Unknown',
        };
    };

    const mirrored = getMirroredValue();

    // Get available nodes to mirror (exclude self, groups, and other ghost nodes)
    const availableNodes = allNodes.filter(
        n => n.id !== id && n.data?.type !== 'groupBox' && n.data?.type !== 'ghost'
    );

    const headerBg = isLinked ? 'bg-slate-500' : 'bg-slate-400';
    const borderColor = isLinked ? 'border-slate-300' : 'border-dashed border-slate-300';

    return (
        <div
            className={`${isMinimized ? 'w-fit min-w-[120px]' : 'min-w-[200px]'} rounded-lg border-2 shadow-lg bg-slate-50 ${borderColor} ${selected ? 'ring-2 ring-slate-500 ring-offset-2' : ''}`}
            style={{ opacity: 0.9 }}
        >
            {/* Header */}
            <div className={`px-3 py-2 rounded-t-md ${headerBg} flex items-center justify-between`}>
                <div className="flex items-center gap-2 text-white flex-1">
                    <Ghost size={14} className="opacity-80" />
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="bg-transparent text-base font-bold outline-none placeholder-slate-200 w-full"
                        placeholder="Ghost"
                    />
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                    <NoteIndicator note={data.note} onClick={() => setNoteOpen(!noteOpen)} />
                    <button
                        onClick={() => updateNodeData(id, { isMinimized: !isMinimized })}
                        className="text-white/80 hover:text-white transition-colors"
                        title={isMinimized ? "Expand" : "Minimize"}
                    >
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                </div>
            </div>

            {/* Minimized summary */}
            {isMinimized && mirrored && mirrored.value !== null && (
                <div className="px-3 py-1.5 text-center">
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {String(mirrored.value)} {mirrored.unit}
                    </span>
                </div>
            )}

            {/* Body — hidden when minimized */}
            {!isMinimized && (
                <div className="p-3 space-y-3">
                    {/* Source Node Selector */}
                    {!isLinked && !showPicker && (
                        <button
                            onClick={() => setShowPicker(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-colors"
                        >
                            <Link2 size={16} />
                            <span className="text-xs font-medium">Select Node to Mirror</span>
                        </button>
                    )}

                    {/* Node picker dropdown */}
                    {showPicker && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Select Source Node</label>
                            <select
                                className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white focus:outline-none focus:border-slate-500"
                                value={data.sourceNodeId || ''}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const selectedNode = availableNodes.find(n => n.id === e.target.value);
                                        const sourceLabel = selectedNode?.data?.label || 'Ghost';
                                        updateNodeData(id, { sourceNodeId: e.target.value, label: `👻 ${sourceLabel}` });
                                        setShowPicker(false);
                                    }
                                }}
                            >
                                <option value="">Choose a node...</option>
                                {availableNodes.map(n => (
                                    <option key={n.id} value={n.id}>
                                        {n.data?.label || n.id} ({n.data?.type})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => setShowPicker(false)}
                                className="text-[10px] text-slate-400 hover:text-slate-600"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Linked info */}
                    {isLinked && mirrored && (
                        <div className="space-y-2">
                            {/* Source badge */}
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-100 rounded-md">
                                <Link2 size={12} className="text-slate-500" />
                                <span className="text-xs text-slate-600 font-medium truncate">
                                    {mirrored.label}
                                </span>
                                <button
                                    onClick={() => {
                                        updateNodeData(id, { sourceNodeId: undefined });
                                    }}
                                    className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
                                    title="Unlink"
                                >
                                    <Unlink size={12} />
                                </button>
                            </div>

                            {/* Mirrored value display */}
                            {mirrored.value !== null && (
                                <div className="px-2 py-1.5 bg-slate-100 rounded-md border border-slate-200">
                                    <div className="text-[10px] text-slate-400 font-medium uppercase">Mirrored Value</div>
                                    <div className="text-sm font-mono text-slate-700">
                                        {typeof mirrored.value === 'number'
                                            ? mirrored.value.toLocaleString('en-US', { maximumFractionDigits: 6 })
                                            : String(mirrored.value)}
                                        {mirrored.unit && (
                                            <span className="text-slate-500 text-xs ml-1">{mirrored.unit}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Change source button */}
                            <button
                                onClick={() => setShowPicker(true)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Change source...
                            </button>
                        </div>
                    )}

                    {/* Unlinked warning */}
                    {!isLinked && data.sourceNodeId && (
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-red-50 text-red-600 rounded-md text-xs">
                            <Unlink size={12} />
                            <span>Source node deleted — Unlinked</span>
                        </div>
                    )}

                    {/* Note Editor */}
                    {noteOpen && (
                        <NoteEditor
                            note={data.note}
                            onChange={(note) => updateNodeData(id, { note })}
                            isOpen={noteOpen}
                            onToggle={() => setNoteOpen(false)}
                            accentColor="slate"
                        />
                    )}
                </div>
            )}

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id={data.outputs[0]?.id}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white hover:!bg-slate-600"
                style={{ top: '50%', right: -6 }}
            />
        </div>
    );
};

export default memo(GhostNode);

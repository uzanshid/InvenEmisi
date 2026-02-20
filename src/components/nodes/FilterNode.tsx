import React, { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Filter, Eye, Minimize2, Maximize2 } from 'lucide-react';
import type { FilterNodeData } from '../../types';
import { useBatchVisualStore } from '../../store/useBatchVisualStore';
import { useAppStore } from '../../store/useAppStore';
import { useBatchDataStore } from '../../store/useBatchDataStore';
import { useCascadeRun } from '../../hooks/useCascadeRun';
import NoteIndicator from './NoteIndicator';
import NoteEditor from './NoteEditor';

const FilterNode: React.FC<NodeProps<FilterNodeData>> = ({ id, data, selected }) => {
    const openModal = useBatchVisualStore((state) => state.openModal);
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const isMinimized = !!data.isMinimized;
    const [noteOpen, setNoteOpen] = useState(false);

    useCascadeRun(id);

    const runFilter = useBatchDataStore((state: any) => state.runFilter);
    const nodeStoreData = useBatchDataStore((state: any) => state.getNodeData(id));

    const edges = useReactFlow().getEdges();
    const targetEdge = edges.find(e => e.target === id);
    const sourceNodeId = targetEdge?.source;
    const sourceNodeData = useBatchDataStore((state: any) => sourceNodeId ? state.getNodeData(sourceNodeId) : undefined);

    const availableColumns: any[] = sourceNodeData?.schema || [];
    const isConnected = !!sourceNodeId && !!sourceNodeData;

    const status = nodeStoreData?.status;
    const getStatusColor = () => {
        if (!isConnected) return 'bg-slate-400';
        if (status === 'SUCCESS') return 'bg-green-500';
        if (status === 'ERROR') return 'bg-red-500';
        if (status === 'CALCULATING') return 'bg-blue-500 animate-pulse';
        return 'bg-yellow-500';
    };

    const handleRun = () => {
        if (!sourceNodeId) {
            alert("Please connect a dataset first!");
            return;
        }

        if (data.column && data.operator && data.value !== undefined) {
            const criteria = {
                column: data.column,
                operator: data.operator,
                value: data.value,
                mode: (data as any).mode || 'value'
            };
            runFilter(id, sourceNodeId, criteria);
        }
    };

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all duration-200 ${selected ? 'border-yellow-500' : 'border-slate-200'} ${isMinimized ? 'w-fit min-w-[160px]' : 'w-[260px]'}`}>
            {/* Header - Editable Title */}
            <div className="bg-yellow-500 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white flex-1">
                    <Filter size={16} />
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="bg-transparent text-base font-bold outline-none placeholder-yellow-200 w-full"
                        placeholder="Filter"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor()} shadow-[0_0_8px_rgba(255,255,255,0.5)]`} />
                    <NoteIndicator note={data.note} onClick={() => setNoteOpen(!noteOpen)} />
                    <button onClick={() => updateNodeData(id, { isMinimized: !isMinimized })} className="text-white/80 hover:text-white transition-colors" title={isMinimized ? "Expand" : "Minimize"}>
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    <button onClick={() => openModal(id)} className="text-white/80 hover:text-white transition-colors" title="View Data">
                        <Eye size={16} />
                    </button>
                </div>
            </div>

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                id={data.inputs[0]?.id}
                className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-white hover:!bg-yellow-600"
                style={{ left: -6 }}
            />

            {/* Body - Hidden when minimized */}
            {!isMinimized && (
                <div className="p-3 space-y-3">
                    {/* Column Select */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Column</label>
                        <select
                            className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-yellow-500 bg-slate-50"
                            value={data.column || ''}
                            onChange={(e) => updateNodeData(id, { column: e.target.value })}
                        >
                            <option value="">Select column...</option>
                            {availableColumns.map((col: any) => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Operator & Mode */}
                    <div className="flex gap-2">
                        <div className="w-1/3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Op</label>
                            <select
                                className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-yellow-500 bg-slate-50"
                                value={data.operator || ''}
                                onChange={(e) => updateNodeData(id, { operator: e.target.value as any })}
                            >
                                <option value=">">&gt;</option>
                                <option value="<">&lt;</option>
                                <option value=">=">&ge;</option>
                                <option value="<=">&le;</option>
                                <option value="==">==</option>
                                <option value="!=">!=</option>
                                <option value="contains">Has</option>
                            </select>
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Value</label>
                                <button
                                    className="text-[9px] text-blue-500 hover:text-blue-700 underline"
                                    onClick={() => updateNodeData(id, { mode: (data as any).mode === 'column' ? 'value' : 'column' } as any)}
                                >
                                    {(data as any).mode === 'column' ? 'Col Ref' : 'Static'}
                                </button>
                            </div>

                            {(data as any).mode === 'column' ? (
                                <select
                                    className="w-full text-xs border border-blue-200 rounded p-1.5 focus:outline-none focus:border-blue-500 bg-blue-50"
                                    value={data.value || ''}
                                    onChange={(e) => updateNodeData(id, { value: e.target.value })}
                                >
                                    <option value="">Target Col...</option>
                                    {availableColumns.map((col: any) => (
                                        <option key={col.id} value={col.id}>{col.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-yellow-500"
                                    placeholder="Value"
                                    value={data.value || ''}
                                    onChange={(e) => updateNodeData(id, { value: e.target.value })}
                                />
                            )}
                        </div>
                    </div>

                    {/* Run Button */}
                    <button
                        onClick={handleRun}
                        className="w-full flex items-center justify-center gap-2 py-1.5 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors font-medium text-xs"
                    >
                        Apply Filter
                    </button>

                    {/* Status Stats */}
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>In: {sourceNodeData?.rowCount ?? '-'}</span>
                        <span>Out: {nodeStoreData?.rowCount ?? '-'}</span>
                    </div>

                    {/* Note Editor */}
                    {noteOpen && (
                        <NoteEditor
                            note={data.note}
                            onChange={(note) => updateNodeData(id, { note })}
                            isOpen={noteOpen}
                            onToggle={() => setNoteOpen(false)}
                            accentColor="yellow"
                        />
                    )}
                </div>
            )}

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id={data.outputs[0]?.id}
                className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-white hover:!bg-yellow-600"
                style={{ right: -6 }}
            />
        </div>
    );
};

export default memo(FilterNode);

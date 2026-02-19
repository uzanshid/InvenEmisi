import React, { memo, useState, useMemo } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { GitMerge, Eye, Minimize2, Maximize2, Play, CheckSquare, Square } from 'lucide-react';
import type { JoinNodeData } from '../../types';
import { useBatchVisualStore } from '../../store/useBatchVisualStore';
import { useBatchDataStore } from '../../store/useBatchDataStore';
import { useAppStore } from '../../store/useAppStore';
import { useCascadeRun } from '../../hooks/useCascadeRun';

const JoinNode: React.FC<NodeProps<JoinNodeData>> = ({ id, data, selected }) => {
    const openModal = useBatchVisualStore((state) => state.openModal);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const updateNodeData = useAppStore((state) => state.updateNodeData);

    useCascadeRun(id);

    const mainData = useBatchDataStore((state) => state.getNodeData(data.inputs[0]?.id));
    const lookupData = useBatchDataStore((state) => state.getNodeData(data.inputs[1]?.id));
    const nodeData = useBatchDataStore((state) => state.getNodeData(id));
    const executeJoinNode = useBatchDataStore((state) => state.executeJoinNode);

    const status = nodeData?.status;

    const getStatusColor = () => {
        if (!mainData || !lookupData) return 'bg-slate-400';
        if (status === 'SUCCESS') return 'bg-green-500';
        if (status === 'ERROR') return 'bg-red-500';
        if (status === 'CALCULATING') return 'bg-blue-500 animate-pulse';
        return 'bg-yellow-500';
    };

    // Get available columns from main and lookup data
    const mainColumns = useMemo(() => {
        return mainData?.schema?.map(col => col.name) || [];
    }, [mainData]);

    const lookupColumns = useMemo(() => {
        return lookupData?.schema?.map(col => col.name) || [];
    }, [lookupData]);

    const handleRun = () => {
        if (data.leftKey && data.rightKey && data.targetColumns && data.targetColumns.length > 0) {
            executeJoinNode(id);
        }
    };

    const toggleTargetColumn = (column: string) => {
        const current = data.targetColumns || [];
        const updated = current.includes(column)
            ? current.filter(c => c !== column)
            : [...current, column];
        updateNodeData(id, { targetColumns: updated });
    };

    const isConfigured = !!(data.leftKey && data.rightKey && data.targetColumns && data.targetColumns.length > 0);

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all duration-200 ${selected ? 'border-purple-500' : 'border-slate-200'} ${isMinimized ? 'w-fit min-w-[200px]' : 'w-[320px]'}`}>
            {/* Header */}
            <div className="bg-purple-500 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white flex-1">
                    <GitMerge size={16} />
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="bg-transparent text-sm font-semibold outline-none placeholder-purple-200 w-full"
                        placeholder="Join"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor()} shadow-[0_0_8px_rgba(255,255,255,0.5)]`} />
                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-white/80 hover:text-white transition-colors" title={isMinimized ? "Expand" : "Minimize"}>
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    <button onClick={() => openModal(id)} className="text-white/80 hover:text-white transition-colors" title="View Data">
                        <Eye size={16} />
                    </button>
                </div>
            </div>

            {/* Body */}
            {!isMinimized && (
                <div className="p-4 space-y-3">
                    {/* Status Message */}
                    {!mainData && !lookupData && (
                        <div className="text-xs text-slate-500 text-center py-2 bg-slate-50 rounded border border-slate-200">
                            Connect main data and lookup data
                        </div>
                    )}

                    {mainData && lookupData && (
                        <>
                            {/* Left Key (Main Data) */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Main Key</label>
                                <select
                                    value={data.leftKey || ''}
                                    onChange={(e) => updateNodeData(id, { leftKey: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
                                >
                                    <option value="">Select key column...</option>
                                    {mainColumns.map(col => (
                                        <option key={col} value={col}>{col}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Right Key (Lookup Data) */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Lookup Key</label>
                                <select
                                    value={data.rightKey || ''}
                                    onChange={(e) => updateNodeData(id, { rightKey: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
                                >
                                    <option value="">Select key column...</option>
                                    {lookupColumns.map(col => (
                                        <option key={col} value={col}>{col}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Target Columns */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold text-slate-600">Target Columns</label>
                                    <button
                                        onClick={() => setShowColumnPicker(!showColumnPicker)}
                                        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                                    >
                                        {showColumnPicker ? 'Hide' : 'Select'} ({data.targetColumns?.length || 0})
                                    </button>
                                </div>

                                {showColumnPicker && (
                                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded p-2 space-y-1 bg-slate-50">
                                        {lookupColumns.map(col => (
                                            <div
                                                key={col}
                                                onClick={() => toggleTargetColumn(col)}
                                                className="flex items-center gap-2 px-2 py-1 hover:bg-purple-50 rounded cursor-pointer group"
                                            >
                                                {data.targetColumns?.includes(col) ? (
                                                    <CheckSquare size={14} className="text-purple-600" />
                                                ) : (
                                                    <Square size={14} className="text-slate-300 group-hover:text-purple-400" />
                                                )}
                                                <span className="text-xs text-slate-700">{col}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!showColumnPicker && data.targetColumns && data.targetColumns.length > 0 && (
                                    <div className="text-xs text-slate-500 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                                        {data.targetColumns.slice(0, 2).join(', ')}
                                        {data.targetColumns.length > 2 && ` +${data.targetColumns.length - 2} more`}
                                    </div>
                                )}
                            </div>

                            {/* Run Button */}
                            <button
                                onClick={handleRun}
                                disabled={!isConfigured}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded font-medium text-sm transition-colors ${isConfigured
                                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                <Play size={14} />
                                Execute Join
                            </button>

                            {/* Info */}
                            {nodeData?.rowCount !== undefined && (
                                <div className="text-xs text-slate-500 text-center">
                                    {nodeData.rowCount} rows joined
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Input Handles */}
            <Handle
                type="target"
                position={Position.Left}
                id={data.inputs[0]?.id}
                className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white hover:!bg-purple-600 !top-[40%]"
                style={{ left: -6 }}
                title="Main Data"
            />
            <Handle
                type="target"
                position={Position.Left}
                id={data.inputs[1]?.id}
                className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white hover:!bg-purple-600 !top-[60%]"
                style={{ left: -6 }}
                title="Lookup Data"
            />

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id={data.outputs[0]?.id}
                className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white hover:!bg-purple-600"
                style={{ right: -6 }}
            />
        </div>
    );
};

export default memo(JoinNode);

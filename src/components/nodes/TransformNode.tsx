import React, { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Columns, Eye, Minimize2, Maximize2, Trash2, Edit3, CheckSquare, Plus, X } from 'lucide-react';
import type { TransformNodeData } from '../../types';
import { useBatchVisualStore } from '../../store/useBatchVisualStore';
import { useBatchDataStore } from '../../store/useBatchDataStore';
import { useAppStore } from '../../store/useAppStore';

interface Operation {
    type: 'delete' | 'rename' | 'select';
    column?: string;
    newName?: string;
    selectedColumns?: string[];
}

const TransformNode: React.FC<NodeProps<TransformNodeData>> = ({ id, data, selected }) => {
    const openModal = useBatchVisualStore((state) => state.openModal);
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const [isMinimized, setIsMinimized] = useState(false);
    const [newOpType, setNewOpType] = useState<'delete' | 'rename' | 'select'>('delete');

    const runTransform = useBatchDataStore((state: any) => state.runTransform);
    const nodeStoreData = useBatchDataStore((state: any) => state.getNodeData(id));

    const edges = useReactFlow().getEdges();
    const targetEdge = edges.find(e => e.target === id);
    const sourceNodeId = targetEdge?.source;
    const sourceNodeData = useBatchDataStore((state: any) => sourceNodeId ? state.getNodeData(sourceNodeId) : undefined);

    const isConnected = !!sourceNodeId && !!sourceNodeData;
    const schema = sourceNodeData?.schema || [];
    const operations: Operation[] = data.operations || [];

    // Track columns that already have operations
    const usedColumns = new Set<string>();
    operations.forEach(op => {
        if (op.column) usedColumns.add(op.column);
    });

    // Available columns for new operations (exclude already used)
    const availableColumns = schema.filter((col: any) => !usedColumns.has(col.id));

    const status = nodeStoreData?.status;
    const getStatusColor = () => {
        if (!isConnected) return 'bg-slate-400';
        if (status === 'SUCCESS') return 'bg-green-500';
        if (status === 'ERROR') return 'bg-red-500';
        if (status === 'CALCULATING') return 'bg-blue-500 animate-pulse';
        return 'bg-yellow-500';
    };

    const addOperation = (op: Operation) => {
        const newOps = [...operations, op];
        updateNodeData(id, { operations: newOps });
    };

    const removeOperation = (index: number) => {
        const newOps = operations.filter((_, i) => i !== index);
        updateNodeData(id, { operations: newOps });
    };

    const handleRun = () => {
        if (!sourceNodeId) {
            alert("Please connect a dataset first!");
            return;
        }
        runTransform(id, sourceNodeId, operations);
    };

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all duration-200 ${selected ? 'border-cyan-600' : 'border-slate-200'} ${isMinimized ? 'w-[160px]' : 'w-[280px]'}`}>
            {/* Header */}
            <div className="bg-cyan-600 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white flex-1">
                    <Columns size={16} />
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="bg-transparent text-sm font-semibold outline-none placeholder-cyan-200 w-full"
                        placeholder="Transform"
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

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                id={data.inputs[0]?.id}
                className="!w-3 !h-3 !bg-cyan-600 !border-2 !border-white hover:!bg-cyan-700"
                style={{ left: -6 }}
            />

            {/* Body */}
            {!isMinimized && (
                <div className="p-3 space-y-3">
                    {!isConnected ? (
                        <div className="p-3 bg-slate-50 rounded text-center text-slate-400 text-xs">
                            Connect a data source
                        </div>
                    ) : (
                        <>
                            {/* Operations List */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Operations</label>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                    {operations.map((op, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded text-xs">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${op.type === 'delete' ? 'bg-red-100 text-red-600' :
                                                op.type === 'rename' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-green-100 text-green-600'
                                                }`}>
                                                {op.type === 'delete' ? <Trash2 size={10} className="inline" /> :
                                                    op.type === 'rename' ? <Edit3 size={10} className="inline" /> :
                                                        <CheckSquare size={10} className="inline" />}
                                            </span>
                                            <span className="flex-1 truncate text-slate-600">
                                                {op.type === 'delete' && `Delete: ${op.column}`}
                                                {op.type === 'rename' && `${op.column} → ${op.newName}`}
                                                {op.type === 'select' && `Keep: ${op.selectedColumns?.length || 0} cols`}
                                            </span>
                                            <button onClick={() => removeOperation(idx)} className="text-slate-400 hover:text-red-500">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {operations.length === 0 && (
                                        <div className="text-[10px] text-slate-400 p-2 text-center">No operations yet</div>
                                    )}
                                </div>
                            </div>

                            {/* Add Operation */}
                            <div className="p-2 bg-cyan-50 rounded border border-cyan-100 space-y-2">
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setNewOpType('delete')}
                                        className={`flex-1 py-1 text-[10px] rounded ${newOpType === 'delete' ? 'bg-red-500 text-white' : 'bg-white text-slate-600'}`}
                                    >
                                        <Trash2 size={10} className="inline mr-0.5" /> Delete
                                    </button>
                                    <button
                                        onClick={() => setNewOpType('rename')}
                                        className={`flex-1 py-1 text-[10px] rounded ${newOpType === 'rename' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'}`}
                                    >
                                        <Edit3 size={10} className="inline mr-0.5" /> Rename
                                    </button>
                                </div>

                                {newOpType === 'delete' && (
                                    <select
                                        className="w-full text-xs p-1.5 border border-slate-200 rounded"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                addOperation({ type: 'delete', column: e.target.value });
                                                e.target.value = '';
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="">Select column to delete...</option>
                                        {availableColumns.map((col: any) => (
                                            <option key={col.id} value={col.id}>{col.name}</option>
                                        ))}
                                    </select>
                                )}

                                {newOpType === 'rename' && (
                                    <div className="flex gap-1">
                                        <select
                                            id="rename-col"
                                            className="flex-1 text-xs p-1 border border-slate-200 rounded"
                                            defaultValue=""
                                        >
                                            <option value="">Column...</option>
                                            {availableColumns.map((col: any) => (
                                                <option key={col.id} value={col.id}>{col.name}</option>
                                            ))}
                                        </select>
                                        <input
                                            id="rename-new"
                                            type="text"
                                            placeholder="New name"
                                            className="flex-1 text-xs p-1 border border-slate-200 rounded"
                                        />
                                        <button
                                            onClick={() => {
                                                const col = (document.getElementById('rename-col') as HTMLSelectElement)?.value;
                                                const newName = (document.getElementById('rename-new') as HTMLInputElement)?.value;
                                                if (col && newName) {
                                                    addOperation({ type: 'rename', column: col, newName });
                                                }
                                            }}
                                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Run Button */}
                            <button
                                onClick={handleRun}
                                disabled={status === 'CALCULATING' || operations.length === 0}
                                className="w-full flex items-center justify-center gap-2 py-1.5 bg-cyan-100 text-cyan-800 rounded hover:bg-cyan-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs"
                            >
                                {status === 'CALCULATING' ? 'Processing...' : 'Apply Transform'}
                            </button>

                            {/* Stats */}
                            <div className="pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400 font-mono">
                                <span>In: {sourceNodeData?.rowCount ?? '-'}</span>
                                <span>Out: {nodeStoreData?.rowCount ?? '-'}</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id={data.outputs[0]?.id}
                className="!w-3 !h-3 !bg-cyan-600 !border-2 !border-white hover:!bg-cyan-700"
                style={{ right: -6 }}
            />
        </div>
    );
};

export default memo(TransformNode);

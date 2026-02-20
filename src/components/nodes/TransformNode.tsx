import React, { memo, useState, useMemo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Columns, Eye, Minimize2, Maximize2, Trash2, Edit3, Plus, X, Combine, CheckSquare, Square } from 'lucide-react';
import type { TransformNodeData, HandleData } from '../../types';
import { useBatchVisualStore } from '../../store/useBatchVisualStore';
import { useBatchDataStore } from '../../store/useBatchDataStore';
import { useAppStore } from '../../store/useAppStore';
import { useCascadeRun } from '../../hooks/useCascadeRun';
import NoteIndicator from './NoteIndicator';
import NoteEditor from './NoteEditor';

interface Operation {
    type: 'delete' | 'rename' | 'select' | 'combine';
    column?: string;
    newName?: string;
    selectedColumns?: string[];
    combineInputs?: { sourceInputIndex: number; columns: string[] }[];
}

// Editable Label Component (same as TableMath)
const EditableLabel: React.FC<{ value: string; onSave: (v: string) => void }> = ({ value, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleBlur = () => {
        setIsEditing(false);
        if (editValue.trim() !== value) onSave(editValue.trim() || value);
    };

    if (isEditing) {
        return (
            <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') setIsEditing(false); }}
                autoFocus
                className="w-20 px-1 text-xs bg-slate-100 border border-slate-300 rounded outline-none focus:border-cyan-500"
            />
        );
    }

    return (
        <span
            onDoubleClick={() => { setIsEditing(true); setEditValue(value); }}
            className="text-xs text-slate-600 cursor-text hover:text-slate-900"
            title="Double-click to edit"
        >
            {value}
        </span>
    );
};

const TransformNode: React.FC<NodeProps<TransformNodeData>> = ({ id, data, selected }) => {
    const openModal = useBatchVisualStore((state) => state.openModal);
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const addNodeInput = useAppStore((state) => state.addNodeInput);
    const updateHandleLabel = useAppStore((state) => state.updateHandleLabel);
    const isMinimized = !!data.isMinimized;
    const [newOpType, setNewOpType] = useState<'delete' | 'rename' | 'combine'>('delete');
    const [noteOpen, setNoteOpen] = useState(false);

    // Combine state: track selected columns per input
    const [combineSelections, setCombineSelections] = useState<Record<number, string[]>>({});

    useCascadeRun(id);

    const runTransform = useBatchDataStore((state: any) => state.runTransform);
    const runCombineTransform = useBatchDataStore((state: any) => state.runCombineTransform);
    const nodeStoreData = useBatchDataStore((state: any) => state.getNodeData(id));

    const edges = useReactFlow().getEdges();
    const allNodes = useReactFlow().getNodes();

    // Build source map for each input handle (same pattern as TableMath)
    const inputSourceMap: Record<string, { nodeId: string; label: string; data: any; index: number }> = {};
    edges.filter(e => e.target === id).forEach((edge) => {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        if (!sourceNode) return;
        const sourceData = useBatchDataStore.getState().getNodeData(edge.source);
        const handleId = edge.targetHandle || '';
        const inputIndex = data.inputs.findIndex((inp: HandleData) => inp.id === handleId);
        if (sourceData) {
            inputSourceMap[handleId] = { nodeId: edge.source, label: sourceNode.data?.label || 'Unknown', data: sourceData, index: inputIndex };
        }
    });

    // Gather source data by input index (for combine)
    const sourceDatas = useMemo(() => {
        return (data.inputs || []).map((input: HandleData) => {
            const info = inputSourceMap[input.id];
            return info?.data || undefined;
        });
    }, [data.inputs, inputSourceMap]);

    // Primary source (first connected batch input)
    const firstConnectedInput = data.inputs.find((inp: HandleData) => inputSourceMap[inp.id]);
    const primarySourceId = firstConnectedInput ? inputSourceMap[firstConnectedInput.id]?.nodeId : undefined;
    const primarySourceData = firstConnectedInput ? inputSourceMap[firstConnectedInput.id]?.data : undefined;

    const isConnected = !!primarySourceId && !!primarySourceData;
    const connectedCount = Object.keys(inputSourceMap).length;
    const hasMultipleInputs = connectedCount >= 2;

    // Schema from primary source (for delete/rename)
    const schema = primarySourceData?.schema || [];
    const operations: Operation[] = data.operations || [];

    // Track columns that already have operations
    const usedColumns = new Set<string>();
    operations.forEach(op => {
        if (op.column) usedColumns.add(op.column);
    });
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

    const toggleCombineColumn = (inputIndex: number, colId: string) => {
        setCombineSelections(prev => {
            const current = prev[inputIndex] || [];
            const updated = current.includes(colId)
                ? current.filter(c => c !== colId)
                : [...current, colId];
            return { ...prev, [inputIndex]: updated };
        });
    };

    const addCombineOperation = () => {
        const combineInputs = Object.entries(combineSelections)
            .filter(([, cols]) => cols.length > 0)
            .map(([idx, cols]) => ({
                sourceInputIndex: parseInt(idx),
                columns: cols,
            }));
        if (combineInputs.length > 0) {
            addOperation({ type: 'combine', combineInputs });
            setCombineSelections({});
        }
    };

    const hasCombineOp = operations.some(op => op.type === 'combine');

    const handleRun = () => {
        if (hasCombineOp) {
            // Collect source node IDs in order of inputs
            const sourceNodeIds = data.inputs
                .map((inp: HandleData) => inputSourceMap[inp.id]?.nodeId)
                .filter(Boolean) as string[];
            if (sourceNodeIds.length === 0) {
                alert("Please connect datasets first!");
                return;
            }
            runCombineTransform(id, sourceNodeIds, operations);
        } else {
            if (!primarySourceId) {
                alert("Please connect a dataset first!");
                return;
            }
            runTransform(id, primarySourceId, operations);
        }
    };

    const handleAddInput = useCallback(() => {
        addNodeInput(id);
    }, [addNodeInput, id]);

    const handleLabelChange = useCallback(
        (handleId: string, newLabel: string) => {
            updateHandleLabel(id, handleId, newLabel, 'input');
        },
        [updateHandleLabel, id]
    );

    const getCombineLabel = (op: Operation) => {
        if (!op.combineInputs) return 'Combine';
        const totalCols = op.combineInputs.reduce((sum, ci) => sum + ci.columns.length, 0);
        const inputs = op.combineInputs.length;
        return `Combine: ${totalCols} cols from ${inputs} inputs`;
    };

    // Calculate handle positions (same as TableMath)
    const headerHeight = 36;

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-visible border-2 transition-all duration-200 ${selected ? 'border-cyan-600' : 'border-slate-200'} ${isMinimized ? 'w-fit min-w-[160px]' : 'w-[300px]'}`}>
            {/* Minimized: all handles stacked at center so edges stay connected */}
            {isMinimized && data.inputs.map((input: HandleData) => (
                <Handle
                    key={input.id}
                    type="target"
                    position={Position.Left}
                    id={input.id}
                    className="!w-3 !h-3 !bg-cyan-600 !border-2 !border-white hover:!bg-cyan-700"
                    style={{
                        top: headerHeight / 2,
                        left: -6
                    }}
                />
            ))}

            {/* Header */}
            <div className="bg-cyan-600 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white flex-1">
                    <Columns size={16} />
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="bg-transparent text-base font-bold outline-none placeholder-cyan-200 w-full"
                        placeholder="Transform"
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

            {/* Body */}
            {!isMinimized && (
                <div className="p-3 space-y-3">
                    {/* Inputs with inline Handles */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Inputs</label>
                        <div className="space-y-0">
                            {data.inputs.map((input: HandleData) => (
                                <div key={input.id} className="relative flex items-center gap-2 pl-2" style={{ minHeight: 24 }}>
                                    <Handle
                                        type="target"
                                        position={Position.Left}
                                        id={input.id}
                                        className="!w-3 !h-3 !bg-cyan-600 !border-2 !border-white hover:!bg-cyan-700"
                                        style={{ position: 'absolute', left: -18, top: '50%', transform: 'translateY(-50%)' }}
                                    />
                                    <EditableLabel
                                        value={input.label}
                                        onSave={(newLabel) => handleLabelChange(input.id, newLabel)}
                                    />
                                    {inputSourceMap[input.id] && (
                                        <span className="text-[9px] px-1 py-0.5 bg-green-100 text-green-600 rounded">
                                            ✓ {inputSourceMap[input.id].data?.rowCount ?? 0}r
                                        </span>
                                    )}
                                </div>
                            ))}
                            <button onClick={handleAddInput} className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-600 transition-colors pl-2" style={{ minHeight: 24 }}>
                                <Plus size={12} />
                                <span>Add Input</span>
                            </button>
                        </div>
                    </div>

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
                                                    op.type === 'combine' ? 'bg-purple-100 text-purple-600' :
                                                        'bg-green-100 text-green-600'
                                                }`}>
                                                {op.type === 'delete' ? <Trash2 size={10} className="inline" /> :
                                                    op.type === 'rename' ? <Edit3 size={10} className="inline" /> :
                                                        op.type === 'combine' ? <Combine size={10} className="inline" /> :
                                                            <CheckSquare size={10} className="inline" />}
                                            </span>
                                            <span className="flex-1 truncate text-slate-600">
                                                {op.type === 'delete' && `Delete: ${op.column}`}
                                                {op.type === 'rename' && `${op.column} → ${op.newName}`}
                                                {op.type === 'select' && `Keep: ${op.selectedColumns?.length || 0} cols`}
                                                {op.type === 'combine' && getCombineLabel(op)}
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
                                    <button
                                        onClick={() => setNewOpType('combine')}
                                        className={`flex-1 py-1 text-[10px] rounded ${newOpType === 'combine' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600'}`}
                                    >
                                        <Combine size={10} className="inline mr-0.5" /> Combine
                                    </button>
                                </div>

                                {/* Delete operation UI */}
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

                                {/* Rename operation UI — STACKED layout */}
                                {newOpType === 'rename' && (
                                    <div className="space-y-1.5">
                                        <select
                                            id={`rename-col-${id}`}
                                            className="w-full text-xs p-1.5 border border-slate-200 rounded"
                                            defaultValue=""
                                        >
                                            <option value="">Select column...</option>
                                            {availableColumns.map((col: any) => (
                                                <option key={col.id} value={col.id}>{col.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-1">
                                            <input
                                                id={`rename-new-${id}`}
                                                type="text"
                                                placeholder="New name..."
                                                className="flex-1 text-xs p-1.5 border border-slate-200 rounded"
                                            />
                                            <button
                                                onClick={() => {
                                                    const col = (document.getElementById(`rename-col-${id}`) as HTMLSelectElement)?.value;
                                                    const newName = (document.getElementById(`rename-new-${id}`) as HTMLInputElement)?.value;
                                                    if (col && newName) {
                                                        addOperation({ type: 'rename', column: col, newName });
                                                        (document.getElementById(`rename-col-${id}`) as HTMLSelectElement).value = '';
                                                        (document.getElementById(`rename-new-${id}`) as HTMLInputElement).value = '';
                                                    }
                                                }}
                                                className="px-2.5 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Combine operation UI */}
                                {newOpType === 'combine' && (
                                    <div className="space-y-2">
                                        {!hasMultipleInputs ? (
                                            <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 text-center">
                                                Connect 2+ datasets to use Combine
                                            </div>
                                        ) : (
                                            <>
                                                {data.inputs.map((input: HandleData, srcIdx: number) => {
                                                    const srcInfo = inputSourceMap[input.id];
                                                    if (!srcInfo) return null;
                                                    const cols = srcInfo.data?.schema || [];
                                                    const selectedCols = combineSelections[srcIdx] || [];

                                                    return (
                                                        <div key={srcIdx} className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-semibold text-cyan-700">{input.label}</span>
                                                                <span className="text-[9px] text-slate-400">{selectedCols.length}/{cols.length} cols</span>
                                                            </div>
                                                            <div className="max-h-28 overflow-y-auto border border-slate-200 rounded p-1.5 space-y-0.5 bg-white">
                                                                {cols.map((col: any) => (
                                                                    <div
                                                                        key={col.id}
                                                                        onClick={() => toggleCombineColumn(srcIdx, col.id)}
                                                                        className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-cyan-50 rounded cursor-pointer group"
                                                                    >
                                                                        {selectedCols.includes(col.id) ? (
                                                                            <CheckSquare size={12} className="text-cyan-600 shrink-0" />
                                                                        ) : (
                                                                            <Square size={12} className="text-slate-300 group-hover:text-cyan-400 shrink-0" />
                                                                        )}
                                                                        <span className="text-[10px] text-slate-700 truncate">{col.name}</span>
                                                                        {col.unit && <span className="text-[8px] text-slate-400 ml-auto">({col.unit})</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <button
                                                    onClick={addCombineOperation}
                                                    disabled={Object.values(combineSelections).every(cols => cols.length === 0)}
                                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Plus size={12} /> Add Combine
                                                </button>
                                            </>
                                        )}
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
                                <span>In: {primarySourceData?.rowCount ?? '-'}</span>
                                <span>Out: {nodeStoreData?.rowCount ?? '-'}</span>
                            </div>
                        </>
                    )}

                    {/* Note Editor */}
                    {noteOpen && (
                        <NoteEditor
                            note={data.note}
                            onChange={(note) => updateNodeData(id, { note })}
                            isOpen={noteOpen}
                            onToggle={() => setNoteOpen(false)}
                            accentColor="cyan"
                        />
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

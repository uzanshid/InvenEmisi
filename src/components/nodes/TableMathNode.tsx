import React, { memo, useRef, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Calculator, Eye, Plus, Minimize2, Maximize2, ChevronDown, Zap, HelpCircle } from 'lucide-react';
import type { TableMathNodeData, HandleData } from '../../types';
import { useBatchVisualStore } from '../../store/useBatchVisualStore';
import { useBatchDataStore } from '../../store/useBatchDataStore';
import { useAppStore } from '../../store/useAppStore';
import { FormulaHelpDialog } from '../FormulaHelpDialog';
import { FormulaInput } from '../FormulaInput';
import { useCascadeRun } from '../../hooks/useCascadeRun';
import NoteIndicator from './NoteIndicator';
import NoteEditor from './NoteEditor';

// Editable Label Component
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
                className="w-16 px-1 text-xs bg-slate-100 border border-slate-300 rounded outline-none focus:border-purple-500"
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

const TableMathNode: React.FC<NodeProps<TableMathNodeData>> = ({ id, data, selected }) => {
    const openModal = useBatchVisualStore((state) => state.openModal);
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const addNodeInput = useAppStore((state) => state.addNodeInput);
    const updateHandleLabel = useAppStore((state) => state.updateHandleLabel);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isMinimized = !!data.isMinimized;
    const [selectedInputIdx, setSelectedInputIdx] = useState(0);
    const [showHelp, setShowHelp] = useState(false);
    const [noteOpen, setNoteOpen] = useState(false);

    useCascadeRun(id);

    const runMath = useBatchDataStore((state: any) => state.runMath);
    const nodeStoreData = useBatchDataStore((state: any) => state.getNodeData(id));

    const edges = useReactFlow().getEdges();
    const allNodes = useReactFlow().getNodes();

    // Get all connected edges to this node
    const connectedEdges = edges.filter(e => e.target === id);

    // Separate batch sources and scalar sources
    const batchSources: Array<{ nodeId: string; label: string; data: any; handleId: string }> = [];
    const scalarSources: Array<{ nodeId: string; label: string; value: number; unit: string; type: string }> = [];

    connectedEdges.forEach(edge => {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        if (!sourceNode) return;

        const nodeType = sourceNode.data?.type;

        // Check if it's a scalar node (source, factor, process)
        if (nodeType === 'source' || nodeType === 'factor' || nodeType === 'process') {
            // For process nodes, use calculatedValue; for source/factor use value
            const scalarValue = nodeType === 'process'
                ? (parseFloat(String(sourceNode.data?.calculatedValue)) || 0)
                : (sourceNode.data?.value ?? 0);

            // For process nodes, we need to get the result unit from the calculation
            // For now, use empty string - full unit calc for process needs scalar calc engine
            const scalarUnit = nodeType === 'process'
                ? (sourceNode.data?.resultUnit || '')
                : (sourceNode.data?.unit || '');

            scalarSources.push({
                nodeId: edge.source,
                label: sourceNode.data?.label || 'Scalar',
                value: scalarValue,
                unit: scalarUnit,
                type: nodeType
            });
        } else {
            // Batch data source
            const sourceData = useBatchDataStore.getState().getNodeData(edge.source);
            batchSources.push({
                nodeId: edge.source,
                label: sourceNode.data?.label || 'Unknown',
                data: sourceData,
                handleId: edge.targetHandle || ''
            });
        }
    });

    // Build input source map for UI
    const inputSourceMap: Record<string, { nodeId: string; label: string; data: any }> = {};
    batchSources.forEach(src => {
        if (src.handleId) {
            inputSourceMap[src.handleId] = { nodeId: src.nodeId, label: src.label, data: src.data };
        }
    });

    // Get first batch source for primary data
    const firstBatchSource = batchSources[0];
    const sourceNodeData = firstBatchSource?.data;
    const isConnected = batchSources.length > 0 && !!sourceNodeData;

    // Get columns from selected input
    const selectedInput = data.inputs[selectedInputIdx];
    const selectedSourceInfo = selectedInput ? inputSourceMap[selectedInput.id] : null;
    const availableColumns: any[] = selectedSourceInfo?.data?.schema || sourceNodeData?.schema || [];

    // Get derived unit from result
    const derivedUnit = nodeStoreData?.schema?.find((s: any) => s.id === data.newColumnName)?.unit;

    const status = nodeStoreData?.status;
    const getStatusColor = () => {
        if (!isConnected) return 'bg-slate-400';
        if (status === 'SUCCESS') return 'bg-green-500';
        if (status === 'ERROR') return 'bg-red-500';
        if (status === 'CALCULATING') return 'bg-blue-500 animate-pulse';
        return 'bg-yellow-500';
    };

    const handleRun = () => {
        if (!firstBatchSource?.nodeId) {
            alert("Please connect a dataset first!");
            return;
        }

        if (data.formula && data.newColumnName) {
            // Build scalar inputs map
            const scalarInputs: Record<string, { value: number; unit: string }> = {};
            scalarSources.forEach(scalar => {
                scalarInputs[scalar.label] = { value: scalar.value, unit: scalar.unit };
            });

            runMath(id, firstBatchSource.nodeId, data.formula, data.newColumnName, scalarInputs, data.unitOverride);
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

    const insertColumn = (colName: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const currentValue = data.formula || '';
        const newValue = currentValue.slice(0, cursorPos) + `[${colName}]` + currentValue.slice(cursorPos);

        updateNodeData(id, { formula: newValue });

        setTimeout(() => {
            textarea.focus();
            const newPos = cursorPos + colName.length + 2;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const insertScalar = (label: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const currentValue = data.formula || '';
        const newValue = currentValue.slice(0, cursorPos) + `[${label}]` + currentValue.slice(cursorPos);

        updateNodeData(id, { formula: newValue });

        setTimeout(() => {
            textarea.focus();
            const newPos = cursorPos + label.length + 2;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    // Calculate handle positions
    const inputHandleSpacing = 20;
    const headerHeight = 36;

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-visible border-2 transition-all duration-200 ${selected ? 'border-purple-800' : 'border-slate-200'} ${isMinimized ? 'w-fit min-w-[180px]' : 'w-[300px]'}`}>
            {/* Input Handles - Always rendered */}
            {data.inputs.map((input: HandleData, index: number) => (
                <Handle
                    key={input.id}
                    type="target"
                    position={Position.Left}
                    id={input.id}
                    className="!w-3 !h-3 !bg-purple-900 !border-2 !border-white hover:!bg-purple-700"
                    style={{
                        top: isMinimized ? headerHeight / 2 : headerHeight + 40 + (index * inputHandleSpacing),
                        left: -6
                    }}
                />
            ))}

            {/* Header */}
            <div className="bg-purple-900 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white flex-1">
                    <Calculator size={16} />
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="bg-transparent text-base font-bold outline-none placeholder-purple-300 w-full"
                        placeholder="Table Math"
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
                    {/* Inputs Labels */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Inputs</label>
                        <div className="space-y-1.5">
                            {data.inputs.map((input: HandleData) => (
                                <div key={input.id} className="flex items-center gap-2 pl-2">
                                    <EditableLabel
                                        value={input.label}
                                        onSave={(newLabel) => handleLabelChange(input.id, newLabel)}
                                    />
                                    {inputSourceMap[input.id] && (
                                        <span className="text-[9px] px-1 py-0.5 bg-green-100 text-green-600 rounded">✓</span>
                                    )}
                                </div>
                            ))}
                            <button onClick={handleAddInput} className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-500 transition-colors pl-2">
                                <Plus size={12} />
                                <span>Add Input</span>
                            </button>
                        </div>
                    </div>

                    {/* Scalar Inputs Display */}
                    {scalarSources.length > 0 && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                <Zap size={10} /> Scalar Inputs
                            </label>
                            <div className="flex flex-wrap gap-1">
                                {scalarSources.map(scalar => (
                                    <button
                                        key={scalar.nodeId}
                                        onClick={() => insertScalar(scalar.label)}
                                        className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                                        title={`Insert [${scalar.label}] = ${scalar.value} ${scalar.unit}`}
                                    >
                                        <Plus size={10} className="inline" />
                                        {scalar.label}
                                        {scalar.unit && <span className="text-amber-500 ml-0.5">({scalar.unit})</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Column Name */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">New Column Name</label>
                        <input
                            type="text"
                            className="w-full text-xs font-medium border border-slate-200 rounded p-1.5 focus:outline-none focus:border-purple-800"
                            placeholder="e.g. Emission_Total"
                            value={data.newColumnName || ''}
                            onChange={(e) => updateNodeData(id, { newColumnName: e.target.value })}
                        />
                    </div>

                    {/* Column Picker */}
                    {batchSources.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Insert Column</label>
                                {batchSources.length > 1 && (
                                    <div className="relative">
                                        <select
                                            value={selectedInputIdx}
                                            onChange={(e) => setSelectedInputIdx(Number(e.target.value))}
                                            className="text-[10px] px-1.5 py-0.5 pr-5 bg-purple-100 text-purple-700 rounded appearance-none cursor-pointer border-0 outline-none"
                                        >
                                            {data.inputs.map((input, idx) => (
                                                <option key={input.id} value={idx}>{input.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none" />
                                    </div>
                                )}
                            </div>
                            <select
                                className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-purple-800 bg-white"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        insertColumn(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="">Select column to insert...</option>
                                {availableColumns.map((col: any) => (
                                    <option key={col.id} value={col.id}>
                                        {col.name} {col.unit ? `(${col.unit})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Formula */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Formula</label>
                            <button
                                onClick={() => setShowHelp(true)}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-purple-600 transition-colors"
                                title="Formula Help"
                            >
                                <HelpCircle size={12} />
                                <span className="text-[10px]">Help</span>
                            </button>
                        </div>
                        <FormulaInput
                            value={data.formula || ''}
                            onChange={(val) => updateNodeData(id, { formula: val })}
                            columns={availableColumns}
                            scalars={scalarSources.map(s => ({ label: s.label, unit: s.unit }))}
                            textareaRef={textareaRef}
                        />
                    </div>

                    {/* Unit Override */}
                    <div>
                        <label className="text-[10px] font-bold text-amber-500 uppercase mb-1 block">Unit (Optional)</label>
                        <input
                            type="text"
                            className={`w-full text-xs font-mono px-2 py-1 rounded focus:outline-none transition-colors ${data.unitOverride?.trim()
                                ? 'border-2 border-amber-400 bg-amber-50 text-amber-800 focus:border-amber-500'
                                : 'border border-dashed border-slate-300 bg-slate-50 text-slate-500 focus:border-amber-400'
                                }`}
                            placeholder="e.g. kg, ton/year — auto if empty"
                            value={data.unitOverride || ''}
                            onChange={(e) => updateNodeData(id, { unitOverride: e.target.value })}
                        />
                        {!data.unitOverride?.trim() && derivedUnit && (
                            <p className="text-[9px] text-slate-400 mt-0.5 italic">Auto: {derivedUnit}</p>
                        )}
                    </div>

                    {/* Run Button */}
                    <button
                        onClick={handleRun}
                        disabled={status === 'CALCULATING' || !data.formula || !data.newColumnName}
                        className="w-full flex items-center justify-center gap-2 py-1.5 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs"
                    >
                        {status === 'CALCULATING' ? 'Calculating...' : 'Run Calculation'}
                    </button>

                    {/* Result Unit Display */}
                    {status === 'SUCCESS' && (derivedUnit || data.unitOverride?.trim()) && (
                        <div className="text-center text-[10px] font-medium">
                            {data.unitOverride?.trim() ? (
                                <span className="text-amber-600">
                                    Unit: <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{data.unitOverride.trim()}</span>
                                    <span className="text-slate-400 ml-1">(manual)</span>
                                </span>
                            ) : derivedUnit ? (
                                <span className="text-green-600">
                                    Unit: <span className="font-mono bg-green-100 px-1.5 py-0.5 rounded">{derivedUnit}</span>
                                    <span className="text-slate-400 ml-1">(auto)</span>
                                </span>
                            ) : null}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>In: {sourceNodeData?.rowCount ?? '-'}</span>
                        <span>Out: {nodeStoreData?.rowCount ?? '-'}</span>
                    </div>

                    {/* Error */}
                    {status === 'ERROR' && nodeStoreData?.errorDetails && (
                        <div className="p-2 bg-red-50 text-red-600 rounded text-[10px] border border-red-100">
                            <span className="font-bold">Error:</span> {nodeStoreData.errorDetails.message}
                        </div>
                    )}

                    {/* Note Editor */}
                    {noteOpen && (
                        <NoteEditor
                            note={data.note}
                            onChange={(note) => updateNodeData(id, { note })}
                            isOpen={noteOpen}
                            onToggle={() => setNoteOpen(false)}
                            accentColor="purple"
                        />
                    )}
                </div>
            )}

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id={data.outputs[0]?.id}
                className="!w-3 !h-3 !bg-purple-900 !border-2 !border-white hover:!bg-purple-700"
                style={{ top: isMinimized ? headerHeight / 2 : '50%', right: -6 }}
            />

            {/* Formula Help Dialog */}
            <FormulaHelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </div>
    );
};

export default memo(TableMathNode);

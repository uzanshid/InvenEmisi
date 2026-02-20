import React, { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Plus, AlertCircle, Minimize2, Maximize2, HelpCircle, Play } from 'lucide-react';
import type { ProcessNodeData, HandleData } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useBatchDataStore } from '../../store/useBatchDataStore';
import { executeBatchFormula } from '../../lib/batchCalculationEngine';
import { FormulaInput } from '../FormulaInput';
import { FormulaHelpDialog } from '../FormulaHelpDialog';
import NoteIndicator from './NoteIndicator';
import NoteEditor from './NoteEditor';

interface EditableLabelProps {
    value: string;
    onSave: (newValue: string) => void;
}

const EditableLabel: React.FC<EditableLabelProps> = ({ value, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleDoubleClick = () => {
        setIsEditing(true);
        setEditValue(value);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editValue.trim() !== value) {
            onSave(editValue.trim() || value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-12 px-1 text-xs bg-slate-100 border border-slate-300 rounded outline-none focus:border-purple-500"
            />
        );
    }

    return (
        <span
            onDoubleClick={handleDoubleClick}
            className="text-xs text-slate-600 cursor-text hover:text-slate-900"
            title="Double-click to edit"
        >
            {value}
        </span>
    );
};

const ProcessNode: React.FC<NodeProps<ProcessNodeData>> = ({ id, data, selected }) => {
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const addNodeInput = useAppStore((state) => state.addNodeInput);
    const updateHandleLabel = useAppStore((state) => state.updateHandleLabel);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isMinimized = !!data.isMinimized;
    const [noteOpen, setNoteOpen] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    const hasError = data.hasCircularDependency || !!data.error;
    const isCircular = data.hasCircularDependency;

    // --- Detect connected batch & scalar sources (same pattern as TableMathNode) ---
    const edges = useReactFlow().getEdges();
    const allNodes = useReactFlow().getNodes();
    const connectedEdges = edges.filter(e => e.target === id);

    const batchSources: Array<{ nodeId: string; label: string; data: any; handleId: string }> = [];
    const scalarSources: Array<{ nodeId: string; label: string; value: number; unit: string }> = [];

    connectedEdges.forEach(edge => {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        if (!sourceNode) return;

        const nodeType = sourceNode.data?.type;
        if (nodeType === 'source' || nodeType === 'factor' || nodeType === 'process') {
            const scalarValue = nodeType === 'process'
                ? (parseFloat(String(sourceNode.data?.calculatedValue)) || 0)
                : (sourceNode.data?.value ?? 0);
            const scalarUnit = nodeType === 'process'
                ? (sourceNode.data?.resultUnit || '')
                : (sourceNode.data?.unit || '');
            scalarSources.push({
                nodeId: edge.source,
                label: sourceNode.data?.label || 'Scalar',
                value: scalarValue,
                unit: scalarUnit,
            });
        } else {
            const sourceData = useBatchDataStore.getState().getNodeData(edge.source);
            batchSources.push({
                nodeId: edge.source,
                label: sourceNode.data?.label || 'Unknown',
                data: sourceData,
                handleId: edge.targetHandle || '',
            });
        }
    });

    const hasBatchSource = batchSources.length > 0 && !!batchSources[0]?.data;
    const sourceNodeData = batchSources[0]?.data;
    const availableColumns: any[] = sourceNodeData?.schema || [];

    // --- Handlers ---
    const handleAddInput = useCallback(() => {
        addNodeInput(id);
    }, [addNodeInput, id]);

    const handleLabelChange = useCallback(
        (handleId: string, newLabel: string, handleType: 'input' | 'output') => {
            updateHandleLabel(id, handleId, newLabel, handleType);
        },
        [updateHandleLabel, id]
    );

    const insertVariable = useCallback((varName: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const bracketedName = `[${varName}]`;
        const cursorPos = textarea.selectionStart;
        const currentValue = data.formula || '';
        const newValue = currentValue.slice(0, cursorPos) + bracketedName + currentValue.slice(cursorPos);

        updateNodeData(id, { formula: newValue });

        setTimeout(() => {
            textarea.focus();
            const newPos = cursorPos + bracketedName.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    }, [data.formula, updateNodeData, id]);

    // --- Run batch formula and validate single-value output ---
    const handleRunBatchFormula = useCallback(() => {
        if (!batchSources[0]?.nodeId || !sourceNodeData) {
            return;
        }

        const formula = data.formula?.trim();
        if (!formula) return;

        setIsCalculating(true);

        setTimeout(() => {
            try {
                const schemaIds = sourceNodeData.schema.map((s: any) => s.id);
                const columnUnits: Record<string, string> = {};
                sourceNodeData.schema.forEach((col: any) => {
                    if (col.unit) columnUnits[col.id] = col.unit;
                });

                // Build scalar inputs
                const scalarInputs: Record<string, { value: number; unit: string }> = {};
                scalarSources.forEach(scalar => {
                    scalarInputs[scalar.label] = { value: scalar.value, unit: scalar.unit };
                });

                const tempColName = '__process_result__';
                const result = executeBatchFormula(
                    sourceNodeData.rawData,
                    tempColName,
                    formula,
                    schemaIds,
                    columnUnits,
                    scalarInputs
                );

                if (!result.success || !result.data) {
                    updateNodeData(id, {
                        batchResult: {
                            value: 0,
                            status: 'ERROR',
                            error: result.error?.message || 'Calculation failed',
                        },
                    });
                    setIsCalculating(false);
                    return;
                }

                // Extract computed column values
                const values = result.data.map(row => row[tempColName]);
                const uniqueValues = new Set(values.map(v => JSON.stringify(v)));

                if (uniqueValues.size > 1) {
                    // Multiple different values — not a scalar result
                    updateNodeData(id, {
                        batchResult: {
                            value: 0,
                            status: 'ERROR',
                            error: 'Formula produces multiple values. Use aggregate functions ($SUM_, $AVG_, etc.) or use TableMath Node instead.',
                        },
                    });
                } else {
                    // Single value — success
                    const scalarValue = values[0];
                    updateNodeData(id, {
                        batchResult: {
                            value: scalarValue,
                            unit: result.derivedUnit,
                            status: 'SUCCESS',
                        },
                        calculatedValue: typeof scalarValue === 'number'
                            ? scalarValue.toLocaleString('en-US', { maximumFractionDigits: 6 })
                            : String(scalarValue),
                    });
                }
            } catch (err: any) {
                updateNodeData(id, {
                    batchResult: {
                        value: 0,
                        status: 'ERROR',
                        error: err.message || 'Unexpected error',
                    },
                });
            }
            setIsCalculating(false);
        }, 50);
    }, [batchSources, sourceNodeData, scalarSources, data.formula, id, updateNodeData]);

    // --- Determine display value ---
    const displayValue = data.batchResult?.status === 'SUCCESS'
        ? data.batchResult.value
        : data.calculatedValue;
    const displayUnit = data.batchResult?.status === 'SUCCESS'
        ? data.batchResult.unit
        : undefined;
    const batchError = data.batchResult?.status === 'ERROR' ? data.batchResult.error : null;

    return (
        <div
            className={`${isMinimized ? 'w-fit min-w-[120px]' : 'min-w-[260px]'} rounded-lg border-2 shadow-lg ${isCircular
                ? 'bg-red-50 border-red-400'
                : hasError || batchError
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-purple-50 border-purple-200'
                } ${selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}
        >
            {/* Header */}
            <div className={`px-3 py-2 rounded-t-md ${isCircular ? 'bg-red-500' : hasError ? 'bg-orange-500' : 'bg-purple-500'
                } flex items-center justify-between`}>
                <input
                    type="text"
                    value={data.label}
                    onChange={(e) => updateNodeData(id, { label: e.target.value })}
                    className="flex-1 bg-transparent text-white font-bold text-base text-center outline-none placeholder-purple-200"
                    placeholder="Process Name"
                />
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

            {/* Minimized Summary */}
            {isMinimized && displayValue !== undefined && displayValue !== null && !hasError && (
                <div className="px-3 py-1.5 text-center">
                    <span className="text-xs font-mono text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                        {String(displayValue)} {displayUnit || ''}
                    </span>
                </div>
            )}

            {/* When MINIMIZED: all handles stacked at center so edges stay connected */}
            {isMinimized && data.inputs.map((input: HandleData) => (
                <Handle
                    key={input.id}
                    type="target"
                    position={Position.Left}
                    id={input.id}
                    className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white hover:!bg-purple-600"
                    style={{ top: '50%', left: -6 }}
                />
            ))}

            {/* Body - Hidden when minimized */}
            {!isMinimized && (
                <div className="p-3 space-y-3">
                    {/* Error Message (scalar engine) */}
                    {hasError && (
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${isCircular ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                            <AlertCircle size={14} />
                            <span>{isCircular ? 'Circular dependency!' : data.error}</span>
                        </div>
                    )}

                    {/* Dynamic Inputs — Handles inline with labels */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Inputs</label>
                        <div className="space-y-1.5">
                            {data.inputs.map((input: HandleData) => (
                                <div key={input.id} className="flex items-center gap-2 relative">
                                    <Handle
                                        type="target"
                                        position={Position.Left}
                                        id={input.id}
                                        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white hover:!bg-purple-600"
                                        style={{ top: 'auto', left: -6 }}
                                    />
                                    <EditableLabel
                                        value={input.label}
                                        onSave={(newLabel) => handleLabelChange(input.id, newLabel, 'input')}
                                    />
                                    {/* Show ✓ badge if connected to a batch source */}
                                    {batchSources.some(b => b.handleId === input.id) && (
                                        <span className="text-[9px] px-1 py-0.5 bg-green-100 text-green-600 rounded">✓</span>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={handleAddInput}
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-500 transition-colors"
                            >
                                <Plus size={12} />
                                <span>Add Input</span>
                            </button>
                        </div>
                    </div>

                    {/* Scalar Inputs Display */}
                    {scalarSources.length > 0 && !hasBatchSource && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Insert Variable</label>
                            <select
                                className="w-full text-xs border border-slate-200 rounded p-1 bg-white focus:outline-none focus:border-purple-400 text-slate-600"
                                value=""
                                onChange={(e) => {
                                    if (e.target.value) insertVariable(e.target.value);
                                }}
                            >
                                <option value="">Click to insert...</option>
                                {data.inputs.map((input: HandleData) => (
                                    <option key={input.id} value={input.label}>
                                        [{input.label}]
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* === BATCH MODE: Column picker & scalar badges === */}
                    {hasBatchSource && (
                        <>
                            {/* Scalar inputs as clickable badges */}
                            {scalarSources.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Scalar Inputs</label>
                                    <div className="flex flex-wrap gap-1">
                                        {scalarSources.map(scalar => (
                                            <button
                                                key={scalar.nodeId}
                                                onClick={() => insertVariable(scalar.label)}
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

                            {/* Insert Column */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Insert Column</label>
                                <select
                                    className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-purple-500 bg-white"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            insertVariable(e.target.value);
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
                        </>
                    )}

                    {/* Formula Input */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-slate-500">Formula</label>
                            <button
                                onClick={() => setShowHelp(true)}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-purple-600 transition-colors"
                                title="Formula Help"
                            >
                                <HelpCircle size={12} />
                                <span className="text-[10px]">Help</span>
                            </button>
                        </div>
                        {hasBatchSource ? (
                            <FormulaInput
                                value={data.formula || ''}
                                onChange={(val) => updateNodeData(id, { formula: val })}
                                columns={availableColumns}
                                scalars={scalarSources.map(s => ({ label: s.label, unit: s.unit }))}
                                textareaRef={textareaRef}
                                placeholder="$AVG_[column] or [A] * [B]"
                            />
                        ) : (
                            <FormulaInput
                                value={data.formula || ''}
                                onChange={(val) => updateNodeData(id, { formula: val })}
                                columns={[]}
                                scalars={data.inputs.map((input: HandleData) => ({ label: input.label, unit: '' }))}
                                textareaRef={textareaRef}
                                placeholder="[A] * [B]"
                            />
                        )}
                    </div>

                    {/* Run Calculation Button — only when batch source connected */}
                    {hasBatchSource && (
                        <button
                            onClick={handleRunBatchFormula}
                            disabled={isCalculating || !data.formula?.trim()}
                            className="w-full flex items-center justify-center gap-2 py-1.5 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs"
                        >
                            <Play size={12} />
                            {isCalculating ? 'Calculating...' : 'Run Calculation'}
                        </button>
                    )}

                    {/* Batch Result Display */}
                    {data.batchResult?.status === 'SUCCESS' && (
                        <div className="px-2 py-1.5 bg-green-50 border border-green-200 rounded-md">
                            <div className="text-xs text-green-600 font-medium">Result (Single Value)</div>
                            <div className="text-sm font-mono text-green-800">
                                {typeof data.batchResult.value === 'number'
                                    ? data.batchResult.value.toLocaleString('en-US', { maximumFractionDigits: 6 })
                                    : String(data.batchResult.value)}
                                {data.batchResult.unit && (
                                    <span className="text-green-600 text-xs ml-1">{data.batchResult.unit}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Batch Error Display */}
                    {batchError && (
                        <div className="p-2 bg-red-50 text-red-600 rounded text-[10px] border border-red-100">
                            <span className="font-bold">Error:</span> {batchError}
                        </div>
                    )}

                    {/* Result Display (scalar engine — no batch source) */}
                    {!hasBatchSource && data.calculatedValue !== undefined && data.calculatedValue !== null && !hasError && (
                        <div className="px-2 py-1.5 bg-purple-100 rounded-md">
                            <div className="text-xs text-purple-600 font-medium">Result</div>
                            <div className="text-sm font-mono text-purple-800">{String(data.calculatedValue)}</div>
                        </div>
                    )}

                    {/* Output label */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-100">
                        <span className="text-xs text-slate-500">{data.outputs[0]?.label || 'Result'}</span>
                    </div>

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

            {/* Output Handle — ALWAYS rendered, even when minimized */}
            <Handle
                type="source"
                position={Position.Right}
                id={data.outputs[0]?.id}
                className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white hover:!bg-purple-600"
                style={{ top: '50%', right: -6 }}
            />

            {/* Formula Help Dialog */}
            <FormulaHelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </div>
    );
};

export default memo(ProcessNode);

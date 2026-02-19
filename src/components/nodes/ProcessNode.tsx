import React, { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Plus, AlertCircle, Minimize2, Maximize2 } from 'lucide-react';
import type { ProcessNodeData, HandleData } from '../../types';
import { useAppStore } from '../../store/useAppStore';

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
    const [isMinimized, setIsMinimized] = useState(false);

    const hasError = data.hasCircularDependency || !!data.error;
    const isCircular = data.hasCircularDependency;

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

    return (
        <div
            className={`${isMinimized ? 'w-fit min-w-[120px]' : 'min-w-[220px]'} rounded-lg border-2 shadow-lg ${isCircular
                ? 'bg-red-50 border-red-400'
                : hasError
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
                    className="flex-1 bg-transparent text-white font-semibold text-sm text-center outline-none placeholder-purple-200"
                    placeholder="Process Name"
                />
                <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="text-white/80 hover:text-white transition-colors ml-2"
                    title={isMinimized ? "Expand" : "Minimize"}
                >
                    {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
            </div>

            {/* Minimized Summary */}
            {isMinimized && data.calculatedValue !== undefined && data.calculatedValue !== null && !hasError && (
                <div className="px-3 py-1.5 text-center">
                    <span className="text-xs font-mono text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                        {String(data.calculatedValue)}
                    </span>
                </div>
            )}

            {/* When MINIMIZED: render input handles with percentage positioning */}
            {isMinimized && data.inputs.map((input: HandleData, index: number) => (
                <Handle
                    key={input.id}
                    type="target"
                    position={Position.Left}
                    id={input.id}
                    className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white hover:!bg-purple-600"
                    style={{ top: `${((index + 1) / (data.inputs.length + 1)) * 100}%`, left: -6 }}
                />
            ))}

            {/* Body - Hidden when minimized */}
            {!isMinimized && (
                <div className="p-3 space-y-3">
                    {/* Error Message */}
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

                    {/* Insert Variable */}
                    {data.inputs.length > 0 && (
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

                    {/* Formula Input */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Formula</label>
                        <textarea
                            ref={textareaRef}
                            value={data.formula}
                            onChange={(e) => updateNodeData(id, { formula: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none resize-none font-mono"
                            placeholder="[A] * [B]"
                            rows={2}
                        />
                    </div>

                    {/* Result Display */}
                    {data.calculatedValue !== undefined && data.calculatedValue !== null && !hasError && (
                        <div className="px-2 py-1.5 bg-purple-100 rounded-md">
                            <div className="text-xs text-purple-600 font-medium">Result</div>
                            <div className="text-sm font-mono text-purple-800">{String(data.calculatedValue)}</div>
                        </div>
                    )}

                    {/* Output label */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-100">
                        <span className="text-xs text-slate-500">{data.outputs[0]?.label || 'Result'}</span>
                    </div>
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
        </div>
    );
};

export default memo(ProcessNode);

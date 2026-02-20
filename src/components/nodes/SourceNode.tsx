import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { AlertCircle, Minimize2, Maximize2 } from 'lucide-react';
import type { SourceNodeData } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import NoteIndicator from './NoteIndicator';
import NoteEditor from './NoteEditor';

// Format number with thousand separators, preserve all decimals
const formatNumber = (num: number): string => {
    if (num === 0) return '0';
    // For very small numbers, use up to 10 decimal places
    if (Math.abs(num) < 0.0001) {
        return num.toExponential(4);
    }
    return num.toLocaleString('en-US', { maximumFractionDigits: 10 });
};

// Parse number from formatted string
const parseNumber = (str: string): number => {
    // Remove commas (thousand separators), keep period as decimal
    const cleaned = str.replace(/,/g, '');
    return parseFloat(cleaned) || 0;
};

const SourceNode: React.FC<NodeProps<SourceNodeData>> = ({ id, data, selected }) => {
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const [inputValue, setInputValue] = useState(String(data.value || ''));
    const [isFocused, setIsFocused] = useState(false);
    const isMinimized = !!data.isMinimized;
    const [noteOpen, setNoteOpen] = useState(false);
    const [formulaExpr, setFormulaExpr] = useState<string | null>(null); // stores "=1/365" etc.

    const hasValue = data.value !== undefined && data.value !== null && data.value !== 0;
    const isEmpty = !hasValue;

    // Format output value for display
    const outputValue = hasValue
        ? (data.unit ? `${formatNumber(data.value)} ${data.unit}` : formatNumber(data.value))
        : null;

    const handleFocus = () => {
        setIsFocused(true);
        // If there's a stored formula, show it when editing
        if (formulaExpr) {
            setInputValue(formulaExpr);
        } else {
            setInputValue(data.value === 0 ? '' : String(data.value));
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        const rawVal = inputValue.trim();

        // Formula evaluation: if starts with "=", evaluate it
        if (rawVal.startsWith('=')) {
            try {
                const expr = rawVal.slice(1).trim();
                if (!expr) {
                    setFormulaExpr(null);
                    return;
                }
                // Safe evaluation using Function constructor for basic math
                const result = new Function(`return (${expr})`)();
                if (typeof result === 'number' && isFinite(result)) {
                    setFormulaExpr(rawVal); // store the formula
                    updateNodeData(id, { value: result });
                    setInputValue(rawVal);
                } else {
                    // Invalid result, keep old value
                    setFormulaExpr(null);
                    setInputValue(String(data.value || ''));
                }
            } catch {
                // Eval failed, keep old value
                setFormulaExpr(null);
                setInputValue(String(data.value || ''));
            }
        } else {
            setFormulaExpr(null);
            const parsed = parseNumber(rawVal);
            updateNodeData(id, { value: parsed });
            setInputValue(String(parsed || ''));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow "=" formula prefix, or normal numeric input
        if (val.startsWith('=') || val === '' || val === '-' || /^-?\d*[,.]?\d*([eE][+-]?\d*)?$/.test(val)) {
            setInputValue(val);
        }
    };

    return (
        <div
            className={`${isMinimized ? 'w-fit min-w-[120px]' : 'min-w-[200px]'} rounded-lg border-2 shadow-lg ${isEmpty ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-200'
                } ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
        >
            {/* Header */}
            <div className={`px-3 py-2 rounded-t-md ${isEmpty ? 'bg-yellow-500' : 'bg-blue-500'} flex items-center justify-between`}>
                <input
                    type="text"
                    value={data.label}
                    onChange={(e) => updateNodeData(id, { label: e.target.value })}
                    className="flex-1 bg-transparent text-white font-bold text-base text-center outline-none placeholder-blue-200"
                    placeholder="Node Name"
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
            {isMinimized && outputValue && (
                <div className="px-3 py-1.5 text-center">
                    <span className="text-xs font-mono text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        {outputValue}
                    </span>
                </div>
            )}

            {/* Body - Hidden when minimized */}
            {!isMinimized && (
                <div className="p-3 space-y-3">
                    {/* Warning */}
                    {isEmpty && (
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-yellow-100 rounded-md text-xs text-yellow-700">
                            <AlertCircle size={14} />
                            <span>Value belum diisi</span>
                        </div>
                    )}

                    {/* Value Input */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 flex justify-between">
                            <span>Value</span>
                            <span className="text-[9px] text-slate-400 italic">ketik = untuk formula</span>
                        </label>
                        <input
                            type="text"
                            value={isFocused ? inputValue : (formulaExpr ? formatNumber(data.value) : (hasValue ? formatNumber(data.value) : ''))}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            className={`w-full px-2 py-1.5 text-sm border rounded-md bg-white focus:ring-1 outline-none ${isEmpty
                                ? 'border-yellow-300 focus:border-yellow-400 focus:ring-yellow-400'
                                : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400'
                                }`}
                            placeholder="123 atau =1/365"
                        />
                        {/* Formula hint */}
                        {formulaExpr && !isFocused && (
                            <p className="text-[9px] text-blue-500 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                                {formulaExpr}
                            </p>
                        )}
                    </div>

                    {/* Unit Input */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Unit</label>
                        <input
                            type="text"
                            value={data.unit}
                            onChange={(e) => updateNodeData(id, { unit: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                            placeholder="kWh, L, kg..."
                        />
                    </div>

                    {/* Output Value Display */}
                    {outputValue && (
                        <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                            <span className="text-xs font-mono text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                {outputValue}
                            </span>
                            <span className="text-xs text-slate-500">{data.outputs[0]?.label || 'Output'}</span>
                        </div>
                    )}

                    {/* Note Editor */}
                    {noteOpen && (
                        <NoteEditor
                            note={data.note}
                            onChange={(note) => updateNodeData(id, { note })}
                            isOpen={noteOpen}
                            onToggle={() => setNoteOpen(false)}
                            accentColor="blue"
                        />
                    )}
                </div>
            )}

            {/* Output Handle — ALWAYS rendered, even when minimized */}
            <Handle
                type="source"
                position={Position.Right}
                id={data.outputs[0]?.id}
                className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white hover:!bg-blue-600"
                style={{ top: '50%', right: -6 }}
            />
        </div>
    );
};

export default memo(SourceNode);

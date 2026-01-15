import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { AlertCircle, Minimize2, Maximize2 } from 'lucide-react';
import type { SourceNodeData } from '../../types';
import { useAppStore } from '../../store/useAppStore';

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
    const [isMinimized, setIsMinimized] = useState(false);

    const hasValue = data.value !== undefined && data.value !== null && data.value !== 0;
    const isEmpty = !hasValue;

    // Format output value for display
    const outputValue = hasValue
        ? (data.unit ? `${formatNumber(data.value)} ${data.unit}` : formatNumber(data.value))
        : null;

    const handleFocus = () => {
        setIsFocused(true);
        // Show raw number without formatting when editing
        setInputValue(data.value === 0 ? '' : String(data.value));
    };

    const handleBlur = () => {
        setIsFocused(false);
        const parsed = parseNumber(inputValue);
        updateNodeData(id, { value: parsed });
        setInputValue(String(parsed || ''));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow empty, numbers, minus, decimal
        if (val === '' || /^-?\d*[,.]?\d*$/.test(val)) {
            setInputValue(val);
        }
    };

    return (
        <div
            className={`min-w-[200px] rounded-lg border-2 shadow-lg ${isEmpty ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-200'
                } ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
        >
            {/* Header */}
            <div className={`px-3 py-2 rounded-t-md ${isEmpty ? 'bg-yellow-500' : 'bg-blue-500'} flex items-center justify-between`}>
                <input
                    type="text"
                    value={data.label}
                    onChange={(e) => updateNodeData(id, { label: e.target.value })}
                    className="flex-1 bg-transparent text-white font-semibold text-sm text-center outline-none placeholder-blue-200"
                    placeholder="Node Name"
                />
                <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="text-white/80 hover:text-white transition-colors ml-2"
                    title={isMinimized ? "Expand" : "Minimize"}
                >
                    {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
            </div>

            {/* Body */}
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
                        <label className="text-xs font-medium text-slate-500">Value</label>
                        <input
                            type="text"
                            value={isFocused ? inputValue : (hasValue ? formatNumber(data.value) : '')}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            className={`w-full px-2 py-1.5 text-sm border rounded-md bg-white focus:ring-1 outline-none ${isEmpty
                                ? 'border-yellow-300 focus:border-yellow-400 focus:ring-yellow-400'
                                : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400'
                                }`}
                            placeholder="Masukkan nilai"
                        />
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

                    {/* Output Handle */}
                    <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                        {outputValue && (
                            <span className="text-xs font-mono text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                {outputValue}
                            </span>
                        )}
                        <div className="flex items-center justify-end gap-2 ml-auto">
                            <span className="text-xs text-slate-500">{data.outputs[0]?.label || 'Output'}</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={data.outputs[0]?.id}
                                className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white hover:!bg-blue-600"
                                style={{ top: 'auto', right: -6 }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(SourceNode);

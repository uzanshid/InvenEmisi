import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { AlertCircle, Search, Database, ToggleLeft, ToggleRight } from 'lucide-react';
import type { FactorNodeData } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import LookupDialog from '../LookupDialog';
import type { EmissionFactor } from '../../data/emissionFactorDb';

// Format number
const formatNumber = (num: number): string => {
    if (num === 0) return '0';
    if (Math.abs(num) < 0.0001) {
        return num.toExponential(4);
    }
    return num.toLocaleString('en-US', { maximumFractionDigits: 10 });
};

// Parse number from formatted string
const parseNumber = (str: string): number => {
    const cleaned = str.replace(/,/g, '');
    return parseFloat(cleaned) || 0;
};

const FactorNode: React.FC<NodeProps<FactorNodeData>> = ({ id, data, selected }) => {
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const [inputValue, setInputValue] = useState(String(data.value || ''));
    const [isFocused, setIsFocused] = useState(false);
    const [isLookupOpen, setIsLookupOpen] = useState(false);

    const mode = data.mode || 'MANUAL_OVERRIDE';
    const isDbMode = mode === 'LOCKED_DB';
    const hasValue = data.value !== undefined && data.value !== null && data.value !== 0;
    const isEmpty = !hasValue;

    const outputValue = hasValue
        ? (data.unit ? `${formatNumber(data.value)} ${data.unit}` : formatNumber(data.value))
        : null;

    const handleFocus = () => {
        if (isDbMode) return;
        setIsFocused(true);
        setInputValue(data.value === 0 ? '' : String(data.value));
    };

    const handleBlur = () => {
        setIsFocused(false);
        const parsed = parseNumber(inputValue);
        updateNodeData(id, { value: parsed });
        setInputValue(String(parsed || ''));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isDbMode) return;
        const val = e.target.value;
        if (val === '' || /^-?\d*[,.]?\d*$/.test(val)) {
            setInputValue(val);
        }
    };

    const handleSelectFactor = (factor: EmissionFactor) => {
        updateNodeData(id, {
            mode: 'LOCKED_DB',
            dbRefId: factor.id,
            dbLabel: `${factor.fuel} - ${factor.pollutant}`,
            value: factor.value,
            unit: factor.unit,
            label: `${factor.fuel} (${factor.pollutant})`,
        });
        setInputValue(String(factor.value));
    };

    const toggleMode = () => {
        updateNodeData(id, {
            mode: isDbMode ? 'MANUAL_OVERRIDE' : 'LOCKED_DB',
        });
    };

    // Colors based on mode
    const borderColor = isDbMode ? 'border-emerald-400' : (isEmpty ? 'border-yellow-300' : 'border-orange-300');
    const bgColor = isDbMode ? 'bg-emerald-50' : (isEmpty ? 'bg-yellow-50' : 'bg-orange-50');
    const headerBg = isDbMode ? 'bg-emerald-500' : (isEmpty ? 'bg-yellow-500' : 'bg-orange-500');

    return (
        <>
            <div
                className={`min-w-[220px] rounded-lg border-2 shadow-lg ${bgColor} ${borderColor} ${selected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                    }`}
            >
                {/* Header */}
                <div className={`px-3 py-2 rounded-t-md ${headerBg}`}>
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="w-full bg-transparent text-white font-semibold text-sm text-center outline-none placeholder-white/60"
                        placeholder="Factor Name"
                        readOnly={isDbMode}
                    />
                </div>

                {/* Body */}
                <div className="p-3 space-y-3">
                    {/* Mode Toggle */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setIsLookupOpen(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md text-xs font-medium transition-colors"
                        >
                            <Search size={12} />
                            Cari Faktor
                        </button>
                        <button
                            onClick={toggleMode}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${isDbMode
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}
                            title={isDbMode ? 'Mode: Database (klik untuk override manual)' : 'Mode: Manual (klik untuk lock)'}
                        >
                            {isDbMode ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            {isDbMode ? 'DB' : 'Manual'}
                        </button>
                    </div>

                    {/* DB Reference Badge */}
                    {isDbMode && data.dbLabel && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-100 rounded-md text-xs text-emerald-700">
                            <Database size={12} />
                            <span className="truncate">{data.dbLabel}</span>
                        </div>
                    )}

                    {/* Warning for empty */}
                    {isEmpty && !isDbMode && (
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
                            readOnly={isDbMode}
                            className={`w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 outline-none ${isDbMode
                                    ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-600'
                                    : isEmpty
                                        ? 'bg-white border-yellow-300 focus:border-yellow-400 focus:ring-yellow-400'
                                        : 'bg-white border-slate-200 focus:border-orange-400 focus:ring-orange-400'
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
                            readOnly={isDbMode}
                            className={`w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 outline-none ${isDbMode
                                    ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-600'
                                    : 'bg-white border-slate-200 focus:border-emerald-400 focus:ring-emerald-400'
                                }`}
                            placeholder="g/GJ, kg/kWh..."
                        />
                    </div>

                    {/* Output Handle */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        {outputValue && (
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${isDbMode ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                {outputValue}
                            </span>
                        )}
                        <div className="flex items-center justify-end gap-2 ml-auto">
                            <span className="text-xs text-slate-500">{data.outputs[0]?.label || 'Output'}</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={data.outputs[0]?.id}
                                className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white hover:!bg-emerald-600"
                                style={{ top: 'auto', right: -6 }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Lookup Dialog */}
            <LookupDialog
                isOpen={isLookupOpen}
                onClose={() => setIsLookupOpen(false)}
                onSelect={handleSelectFactor}
            />
        </>
    );
};

export default memo(FactorNode);

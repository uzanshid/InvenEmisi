import React, { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { FileSpreadsheet, Eye, Settings, Minimize2, Maximize2, Edit3 } from 'lucide-react';
import type { DatasetNodeData } from '../../types';
import { useBatchVisualStore } from '../../store/useBatchVisualStore';
import { useBatchDataStore } from '../../store/useBatchDataStore';
import { useAppStore } from '../../store/useAppStore';

const DatasetNode: React.FC<NodeProps<DatasetNodeData>> = ({ id, data, selected }) => {
    const openModal = useBatchVisualStore((state) => state.openModal);
    const { setNodes } = useReactFlow();
    const [isMinimized, setIsMinimized] = useState(false);
    const [showUnitConfig, setShowUnitConfig] = useState(false);
    const updateNodeData = useAppStore((state) => state.updateNodeData);

    const ingestFile = useBatchDataStore((state) => state.ingestFile);
    const nodeData = useBatchDataStore((state) => state.getNodeData(id));
    const setColumnUnit = useBatchDataStore((state) => state.setColumnUnit);

    const status = nodeData?.status;
    const getStatusColor = () => {
        if (!nodeData || !data.fileName) return 'bg-slate-400';
        if (status === 'SUCCESS') return 'bg-green-500';
        if (status === 'ERROR') return 'bg-red-500';
        if (status === 'PARSING') return 'bg-blue-500 animate-pulse';
        return 'bg-yellow-500';
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await ingestFile(id, file);
                const storedData = useBatchDataStore.getState().getNodeData(id);
                setNodes((nodes) => nodes.map((n) => {
                    if (n.id === id) {
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                fileName: file.name,
                                rowCount: storedData?.rowCount || 0
                            }
                        };
                    }
                    return n;
                }));
            } catch (error) {
                console.error("Ingestion failed", error);
            }
        }
    };

    const handleUnitChange = (columnId: string, unit: string) => {
        setColumnUnit(id, columnId, unit);
    };

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all duration-200 ${selected ? 'border-orange-500' : 'border-slate-200'} ${isMinimized ? 'w-fit min-w-[180px]' : 'w-[280px]'}`}>
            {/* Header - Editable Title */}
            <div className="bg-orange-500 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white flex-1">
                    <FileSpreadsheet size={16} />
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="bg-transparent text-sm font-semibold outline-none placeholder-orange-200 w-full"
                        placeholder="Dataset"
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

            {/* Body - Hidden when minimized */}
            {!isMinimized && (
                <div className="p-4">
                    {!data.fileName ? (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {status === 'PARSING' ? (
                                    <span className="text-sm text-blue-500 font-medium animate-pulse">Parsing...</span>
                                ) : (
                                    <>
                                        <span className="text-sm text-slate-500 font-medium">Click to Upload</span>
                                        <span className="text-xs text-slate-400 mt-1">CSV or XLSX</span>
                                    </>
                                )}
                            </div>
                            <input type="file" className="hidden" accept=".csv, .xlsx" onChange={handleFileChange} />
                        </label>
                    ) : (
                        <div className="space-y-3">
                            {/* File Info */}
                            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-100">
                                <div className={`p-2 rounded ${status === 'SUCCESS' ? 'bg-green-100 text-green-600' : status === 'ERROR' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <FileSpreadsheet size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate" title={data.fileName}>
                                        {data.fileName}
                                    </p>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                                        Rows: {nodeData?.rowCount || data.rowCount || 0}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setShowUnitConfig(!showUnitConfig)}
                                        className={`p-1 rounded transition-colors ${showUnitConfig ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                                        title="Configure Units"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <label className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                                        <Settings size={14} />
                                        <input type="file" className="hidden" accept=".csv, .xlsx" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>

                            {/* Unit Configuration Panel */}
                            {showUnitConfig && nodeData?.schema && nodeData.schema.length > 0 && (
                                <div className="p-2 bg-orange-50 rounded border border-orange-100 space-y-1.5 max-h-48 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                                    <p className="text-[10px] font-bold text-orange-600 uppercase flex justify-between items-center">
                                        <span>Column Units</span>
                                        <span className="text-[9px] font-normal text-orange-400 italic">blank = unitless</span>
                                    </p>
                                    {nodeData.schema.map(col => (
                                        <div key={col.id} className="flex items-center gap-2">
                                            <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${col.type === 'number' ? 'bg-blue-100 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                                                {col.type === 'number' ? 'NUM' : 'TXT'}
                                            </span>
                                            <span className="text-xs text-slate-600 truncate flex-1" title={col.name}>
                                                {col.name.length > 12 ? col.name.slice(0, 12) + '…' : col.name}
                                            </span>
                                            <input
                                                type="text"
                                                value={col.unit || ''}
                                                onChange={(e) => handleUnitChange(col.id, e.target.value)}
                                                placeholder="—"
                                                className={`w-16 text-[10px] px-1.5 py-0.5 rounded focus:outline-none transition-colors ${col.unit
                                                    ? 'border border-orange-300 bg-orange-50 text-orange-700 focus:border-orange-500'
                                                    : 'border border-dashed border-slate-200 bg-white text-slate-400 focus:border-orange-400'
                                                    }`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id={data.outputs[0]?.id}
                className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white hover:!bg-orange-600"
                style={{ right: -6 }}
            />
        </div>
    );
};

export default memo(DatasetNode);

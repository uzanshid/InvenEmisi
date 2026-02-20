import React, { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Download, Eye, FileSpreadsheet, Minimize2, Maximize2, Check, AlertCircle } from 'lucide-react';
import type { ExportNodeData } from '../../types';
import { useBatchVisualStore } from '../../store/useBatchVisualStore';
import { useBatchDataStore } from '../../store/useBatchDataStore';
import type { ColumnMetadata } from '../../store/useBatchDataStore';
import { useAppStore } from '../../store/useAppStore';
import { utils, writeFile } from 'xlsx';
import NoteIndicator from './NoteIndicator';
import NoteEditor from './NoteEditor';

const ExportNode: React.FC<NodeProps<ExportNodeData>> = ({ id, data, selected }) => {
    const openModal = useBatchVisualStore((state) => state.openModal);
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const isMinimized = !!data.isMinimized;
    const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [noteOpen, setNoteOpen] = useState(false);

    // Get connected source node
    const edges = useReactFlow().getEdges();
    const targetEdge = edges.find(e => e.target === id);
    const sourceNodeId = targetEdge?.source;
    const sourceNodeData = useBatchDataStore((state: any) => sourceNodeId ? state.getNodeData(sourceNodeId) : undefined);

    const isConnected = !!sourceNodeId && !!sourceNodeData;
    const schema: ColumnMetadata[] = sourceNodeData?.schema || [];
    const rowCount = sourceNodeData?.rowCount || 0;

    const getStatusColor = () => {
        if (!isConnected) return 'bg-slate-400';
        if (sourceNodeData?.status === 'SUCCESS') return 'bg-green-500';
        if (sourceNodeData?.status === 'ERROR') return 'bg-red-500';
        return 'bg-yellow-500';
    };

    const handleExport = () => {
        if (!sourceNodeData?.rawData || sourceNodeData.rawData.length === 0) {
            setExportStatus('error');
            setTimeout(() => setExportStatus('idle'), 2000);
            return;
        }

        try {
            const ws = utils.json_to_sheet(sourceNodeData.rawData);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, 'Data');

            const fileName = `${data.label || 'export'}_${new Date().toISOString().slice(0, 10)}`;

            if (data.exportFormat === 'csv') {
                writeFile(wb, `${fileName}.csv`);
            } else {
                writeFile(wb, `${fileName}.xlsx`);
            }

            setExportStatus('success');
            setTimeout(() => setExportStatus('idle'), 2000);
        } catch (error) {
            console.error('Export failed:', error);
            setExportStatus('error');
            setTimeout(() => setExportStatus('idle'), 2000);
        }
    };

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all duration-200 ${selected ? 'border-emerald-600' : 'border-slate-200'} ${isMinimized ? 'w-fit min-w-[160px]' : 'w-[280px]'}`}>
            {/* Header */}
            <div className="bg-emerald-600 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white flex-1">
                    <Download size={16} />
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="bg-transparent text-base font-bold outline-none placeholder-emerald-200 w-full"
                        placeholder="Export"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor()} shadow-[0_0_8px_rgba(255,255,255,0.5)]`} />
                    <NoteIndicator note={data.note} onClick={() => setNoteOpen(!noteOpen)} />
                    <button onClick={() => updateNodeData(id, { isMinimized: !isMinimized })} className="text-white/80 hover:text-white transition-colors" title={isMinimized ? "Expand" : "Minimize"}>
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    <button onClick={() => openModal(sourceNodeId || id)} className="text-white/80 hover:text-white transition-colors" title="View Data">
                        <Eye size={16} />
                    </button>
                </div>
            </div>

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                id={data.inputs[0]?.id}
                className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white hover:!bg-emerald-700"
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
                            {/* Data Summary */}
                            <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileSpreadsheet size={14} className="text-emerald-600" />
                                    <span className="text-xs font-medium text-emerald-700">Data Summary</span>
                                </div>
                                <div className="text-xs text-slate-600 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Rows:</span>
                                        <span className="font-mono">{rowCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Columns:</span>
                                        <span className="font-mono">{schema.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Column Units */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Column Units</label>
                                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-50 rounded border border-slate-100">
                                    {schema.map(col => (
                                        <div key={col.id} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 truncate flex-1" title={col.name}>
                                                {col.name.length > 18 ? col.name.slice(0, 18) + '...' : col.name}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${col.unit ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                                {col.unit || 'unitless'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Export Format */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Export Format</label>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={() => updateNodeData(id, { exportFormat: 'xlsx' })}
                                        className={`flex-1 py-1.5 text-xs rounded transition-colors ${data.exportFormat === 'xlsx' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        Excel (.xlsx)
                                    </button>
                                    <button
                                        onClick={() => updateNodeData(id, { exportFormat: 'csv' })}
                                        className={`flex-1 py-1.5 text-xs rounded transition-colors ${data.exportFormat === 'csv' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        CSV
                                    </button>
                                </div>
                            </div>

                            {/* Export Button */}
                            <button
                                onClick={handleExport}
                                disabled={!isConnected || rowCount === 0}
                                className={`w-full flex items-center justify-center gap-2 py-2 rounded transition-colors font-medium text-xs ${exportStatus === 'success'
                                    ? 'bg-green-500 text-white'
                                    : exportStatus === 'error'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                            >
                                {exportStatus === 'success' ? (
                                    <><Check size={14} /> Exported!</>
                                ) : exportStatus === 'error' ? (
                                    <><AlertCircle size={14} /> Failed</>
                                ) : (
                                    <><Download size={14} /> Export Data</>
                                )}
                            </button>
                        </>
                    )}

                    {/* Note Editor */}
                    {noteOpen && (
                        <NoteEditor
                            note={data.note}
                            onChange={(note) => updateNodeData(id, { note })}
                            isOpen={noteOpen}
                            onToggle={() => setNoteOpen(false)}
                            accentColor="emerald"
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default memo(ExportNode);

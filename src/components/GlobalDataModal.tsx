import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Table } from 'lucide-react';
import { useBatchVisualStore } from '../store/useBatchVisualStore';
import { useBatchDataStore } from '../store/useBatchDataStore';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

// Register AG Grid Modules (Required for v33+)
ModuleRegistry.registerModules([AllCommunityModule]);

// Note: CSS imports might still be needed or might be included in modules dependent on setup.
// Keeping them for safety unless they cause conflicts.
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

export const GlobalDataModal = () => {
    const { isModalOpen, activeNodeId, closeModal } = useBatchVisualStore();

    const activeNodeData = useBatchDataStore((state) =>
        activeNodeId ? state.getNodeData(activeNodeId) : undefined
    );

    const [colDefs, setColDefs] = useState<any[]>([]);

    useEffect(() => {
        if (activeNodeData?.schema) {
            const defs = activeNodeData.schema.map(col => ({
                field: col.id,
                headerName: col.name,
                filter: true,
                sortable: true,
                resizable: true,
                width: 150
            }));
            setColDefs(defs);
        }
    }, [activeNodeData?.schema]);

    if (!isModalOpen) return null;

    return (
        <Dialog.Root open={isModalOpen} onOpenChange={closeModal}>
            <Dialog.Portal>
                {/* Backdrop */}
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm animate-in fade-in duration-200" />

                {/* Content */}
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[80vh] bg-white rounded-xl shadow-2xl z-[101] flex flex-col animate-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <Dialog.Title className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Table className="text-blue-600" size={20} />
                            Data Preview
                            {activeNodeId && (
                                <span className="text-xs font-normal text-slate-400 ml-2 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                                    Node: {activeNodeId}
                                </span>
                            )}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Body */}
                    <div className="flex-1 p-0 overflow-hidden bg-slate-50 flex flex-col">
                        {!activeNodeData ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <p>No data available for this node.</p>
                            </div>
                        ) : activeNodeData.status === 'PARSING' ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-blue-500">
                                <p className="animate-pulse">Loading data...</p>
                            </div>
                        ) : activeNodeData.status === 'ERROR' ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-red-500">
                                <p>Error loading data: {activeNodeData.errorDetails?.message}</p>
                            </div>
                        ) : (
                            <div
                                className="ag-theme-quartz w-full h-full"
                                style={{ height: '100%', width: '100%' }}
                                onWheel={(e) => {
                                    // Stop the scroll event from propagating to the canvas behind the modal
                                    e.stopPropagation();
                                }}
                            >
                                <AgGridReact
                                    rowData={activeNodeData.rawData}
                                    columnDefs={colDefs || []}
                                    pagination={true}
                                    paginationPageSize={100}
                                    rowSelection={'multiple'}
                                />
                            </div>
                        )}
                        {activeNodeData && (
                            <div className="px-4 py-2 bg-white border-t border-slate-200 text-xs text-slate-500 flex justify-between">
                                <span>Total Rows: {activeNodeData.rowCount}</span>
                                <span>Status: {activeNodeData.status}</span>
                            </div>
                        )}
                    </div>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

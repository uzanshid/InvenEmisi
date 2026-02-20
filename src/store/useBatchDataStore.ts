import { create } from 'zustand';
import Papa from 'papaparse';
import { executeBatchFormula } from '../lib/batchCalculationEngine';
import { read, utils } from 'xlsx';
import { useAppStore } from './useAppStore';

export interface ColumnMetadata {
    id: string;
    name: string;
    type: 'string' | 'number' | 'date';
    unit?: string;
}

export interface BatchNodeData {
    rawData: any[];
    schema: ColumnMetadata[];
    status: 'IDLE' | 'PARSING' | 'CALCULATING' | 'ERROR' | 'SUCCESS';
    errorDetails?: {
        rowIndex: number;
        message: string;
    };
    rowCount: number;
}

interface BatchDataStore {
    nodes: Record<string, BatchNodeData>;

    // Actions
    ingestFile: (nodeId: string, file: File) => Promise<void>;
    getNodeData: (nodeId: string) => BatchNodeData | undefined;
    runMath: (nodeId: string, sourceNodeId: string, formula: string, newColName: string, scalarInputs?: Record<string, { value: number, unit: string }>, unitOverride?: string) => void;
    runFilter: (nodeId: string, sourceNodeId: string, criteria: any) => void;
    setColumnUnit: (nodeId: string, columnId: string, unit: string) => void;
    runTransform: (nodeId: string, sourceNodeId: string, operations: any[]) => void;
    runCombineTransform: (nodeId: string, sourceNodeIds: string[], operations: any[]) => void;
}

export const useBatchDataStore = create<BatchDataStore>((set, get) => ({
    nodes: {},

    getNodeData: (nodeId) => {
        // First check if this node has direct batch data
        const directData = get().nodes[nodeId];
        if (directData) return directData;

        // If no direct data, check if this is a Ghost node and resolve to source
        const appNodes = useAppStore.getState().nodes;
        const node = appNodes.find(n => n.id === nodeId);
        if (node?.data?.type === 'ghost' && node.data.sourceNodeId) {
            // Follow the Ghost chain (handles Ghost→Ghost→Source)
            const visited = new Set<string>();
            let currentId: string | undefined = node.data.sourceNodeId;
            while (currentId && !visited.has(currentId)) {
                visited.add(currentId);
                const data = get().nodes[currentId];
                if (data) return data;
                // Check if source is also a Ghost
                const srcNode = appNodes.find(n => n.id === currentId);
                if (srcNode?.data?.type === 'ghost' && srcNode.data.sourceNodeId) {
                    currentId = srcNode.data.sourceNodeId;
                } else {
                    break;
                }
            }
        }
        return undefined;
    },

    ingestFile: async (nodeId, file) => {
        set((state) => ({
            nodes: {
                ...state.nodes,
                [nodeId]: {
                    ...state.nodes[nodeId],
                    status: 'PARSING',
                    rawData: [],
                    schema: [],
                    rowCount: 0
                }
            }
        }));

        return new Promise((resolve, reject) => {
            if (file.name.endsWith('.xlsx')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = e.target?.result;
                        const workbook = read(data, { type: 'binary' });
                        const sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[sheetName];
                        const rows = utils.sheet_to_json(sheet);

                        if (rows.length === 0) {
                            throw new Error('File is empty');
                        }

                        const headers = Object.keys(rows[0] as object);
                        const schema: ColumnMetadata[] = headers.map(field => ({
                            id: field,
                            name: field,
                            type: isNaN(Number((rows[0] as any)[field])) ? 'string' : 'number',
                            unit: undefined
                        }));

                        set((state) => ({
                            nodes: {
                                ...state.nodes,
                                [nodeId]: {
                                    rawData: rows,
                                    schema: schema,
                                    status: 'SUCCESS',
                                    rowCount: rows.length
                                }
                            }
                        }));
                        resolve();
                    } catch (error: any) {
                        set((state) => ({
                            nodes: {
                                ...state.nodes,
                                [nodeId]: {
                                    ...state.nodes[nodeId],
                                    status: 'ERROR',
                                    errorDetails: { rowIndex: -1, message: error.message }
                                }
                            }
                        }));
                        reject(error);
                    }
                };
                reader.readAsBinaryString(file);
                return;
            }

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                worker: true,
                complete: (results) => {
                    const rows = results.data;
                    const meta = results.meta;

                    if (rows.length === 0) {
                        set((state) => ({
                            nodes: {
                                ...state.nodes,
                                [nodeId]: {
                                    rawData: [],
                                    schema: [],
                                    status: 'ERROR',
                                    errorDetails: { rowIndex: -1, message: 'File is empty' },
                                    rowCount: 0
                                }
                            }
                        }));
                        resolve();
                        return;
                    }

                    const schema: ColumnMetadata[] = meta.fields ? meta.fields.map(field => ({
                        id: field,
                        name: field,
                        type: isNaN(Number((rows[0] as any)[field])) ? 'string' : 'number',
                        unit: undefined
                    })) : [];

                    set((state) => ({
                        nodes: {
                            ...state.nodes,
                            [nodeId]: {
                                rawData: rows,
                                schema: schema,
                                status: 'SUCCESS',
                                rowCount: rows.length
                            }
                        }
                    }));
                    resolve();
                },
                error: (error) => {
                    set((state) => ({
                        nodes: {
                            ...state.nodes,
                            [nodeId]: {
                                ...state.nodes[nodeId],
                                status: 'ERROR',
                                errorDetails: { rowIndex: -1, message: error.message }
                            }
                        }
                    }));
                    reject(error);
                }
            });
        });
    },

    runMath: (nodeId, sourceNodeId, formula, newColName, scalarInputs = {}, unitOverride) => {
        const sourceNode = get().getNodeData(sourceNodeId);

        if (!sourceNode || !sourceNode.rawData || sourceNode.rawData.length === 0) {
            console.error("Source node data not found for math:", sourceNodeId);
            set((state) => ({
                nodes: {
                    ...state.nodes,
                    [nodeId]: {
                        rawData: [],
                        schema: [],
                        status: 'ERROR',
                        errorDetails: { rowIndex: -1, message: 'No source data connected' },
                        rowCount: 0
                    }
                }
            }));
            return;
        }

        set((state) => ({
            nodes: {
                ...state.nodes,
                [nodeId]: {
                    rawData: [],
                    schema: sourceNode.schema,
                    status: 'CALCULATING',
                    rowCount: 0
                }
            }
        }));

        setTimeout(() => {
            const schemaIds = sourceNode.schema.map(s => s.id);
            // Build columnUnits map from schema
            const columnUnits: Record<string, string> = {};
            sourceNode.schema.forEach(col => {
                if (col.unit) columnUnits[col.id] = col.unit;
            });

            const result = executeBatchFormula(sourceNode.rawData, newColName, formula, schemaIds, columnUnits, scalarInputs);

            if (result.success && result.data) {
                const newSchema = [
                    ...sourceNode.schema,
                    { id: newColName, name: newColName, type: 'number', unit: unitOverride?.trim() || result.derivedUnit }
                ] as ColumnMetadata[];

                set((state) => ({
                    nodes: {
                        ...state.nodes,
                        [nodeId]: {
                            rawData: result.data!,
                            schema: newSchema,
                            status: 'SUCCESS',
                            rowCount: result.data!.length
                        }
                    }
                }));
            } else {
                set((state) => ({
                    nodes: {
                        ...state.nodes,
                        [nodeId]: {
                            rawData: [],
                            schema: [],
                            status: 'ERROR',
                            errorDetails: result.error,
                            rowCount: 0
                        }
                    }
                }));
            }
        }, 100);
    },

    runFilter: (nodeId, sourceNodeId, criteria) => {
        const sourceNode = get().getNodeData(sourceNodeId);

        if (!sourceNode || !sourceNode.rawData || sourceNode.rawData.length === 0) {
            console.error("Source node data not found:", sourceNodeId);
            set((state) => ({
                nodes: {
                    ...state.nodes,
                    [nodeId]: {
                        rawData: [],
                        schema: [],
                        status: 'ERROR',
                        errorDetails: { rowIndex: -1, message: 'No source data connected' },
                        rowCount: 0
                    }
                }
            }));
            return;
        }

        set((state) => ({
            nodes: {
                ...state.nodes,
                [nodeId]: {
                    rawData: [],
                    schema: sourceNode.schema,
                    status: 'CALCULATING',
                    rowCount: 0
                }
            }
        }));

        setTimeout(() => {
            try {
                const { column, operator, value, mode } = criteria;

                const filtered = sourceNode.rawData.filter(row => {
                    const rowVal = row[column];
                    let compareVal: any = value;

                    if (mode === 'column') {
                        compareVal = row[value];
                    }

                    const numRowVal = Number(rowVal);
                    const numCompareVal = Number(compareVal);
                    const isNum = !isNaN(numRowVal) && !isNaN(numCompareVal);

                    const a = isNum ? numRowVal : rowVal;
                    const b = isNum ? numCompareVal : compareVal;

                    switch (operator) {
                        case '>': return a > b;
                        case '<': return a < b;
                        case '>=': return a >= b;
                        case '<=': return a <= b;
                        case '==': return a == b;
                        case '!=': return a != b;
                        case 'contains': return String(a).toLowerCase().includes(String(b).toLowerCase());
                        default: return true;
                    }
                });

                set((state) => ({
                    nodes: {
                        ...state.nodes,
                        [nodeId]: {
                            rawData: filtered,
                            schema: sourceNode.schema,
                            rowCount: filtered.length,
                            status: 'SUCCESS'
                        }
                    }
                }));

            } catch (error: any) {
                set((state) => ({
                    nodes: {
                        ...state.nodes,
                        [nodeId]: {
                            rawData: [],
                            schema: [],
                            status: 'ERROR',
                            errorDetails: { rowIndex: -1, message: "Filter failed: " + error.message },
                            rowCount: 0
                        }
                    }
                }));
            }
        }, 100);
    },

    setColumnUnit: (nodeId, columnId, unit) => {
        const node = get().nodes[nodeId];
        if (!node) return;

        const updatedSchema = node.schema.map(col =>
            col.id === columnId ? { ...col, unit } : col
        );

        set((state) => ({
            nodes: {
                ...state.nodes,
                [nodeId]: {
                    ...node,
                    schema: updatedSchema
                }
            }
        }));
    },

    runTransform: (nodeId, sourceNodeId, operations) => {
        const sourceNode = get().getNodeData(sourceNodeId);
        if (!sourceNode) {
            console.error('Transform: Source node not found');
            return;
        }

        set((state) => ({
            nodes: {
                ...state.nodes,
                [nodeId]: {
                    rawData: [],
                    schema: [],
                    status: 'CALCULATING',
                    rowCount: 0
                }
            }
        }));

        setTimeout(() => {
            try {
                let transformedData = [...sourceNode.rawData];
                let transformedSchema = [...sourceNode.schema];

                // Apply operations sequentially
                for (const op of operations) {
                    switch (op.type) {
                        case 'delete':
                            if (op.column) {
                                // Remove column from data
                                transformedData = transformedData.map(row => {
                                    const newRow = { ...row };
                                    delete newRow[op.column];
                                    return newRow;
                                });
                                // Remove from schema
                                transformedSchema = transformedSchema.filter(col => col.id !== op.column);
                            }
                            break;
                        case 'rename':
                            if (op.column && op.newName) {
                                // Rename in data
                                transformedData = transformedData.map(row => {
                                    const newRow = { ...row };
                                    if (op.column in newRow) {
                                        newRow[op.newName] = newRow[op.column];
                                        delete newRow[op.column];
                                    }
                                    return newRow;
                                });
                                // Rename in schema - PRESERVE UNIT!
                                transformedSchema = transformedSchema.map(col =>
                                    col.id === op.column
                                        ? { ...col, id: op.newName, name: op.newName }
                                        : col
                                );
                            }
                            break;
                        case 'select':
                            if (op.selectedColumns && op.selectedColumns.length > 0) {
                                // Keep only selected columns
                                transformedData = transformedData.map(row => {
                                    const newRow: any = {};
                                    op.selectedColumns.forEach((col: string) => {
                                        if (col in row) newRow[col] = row[col];
                                    });
                                    return newRow;
                                });
                                transformedSchema = transformedSchema.filter(col =>
                                    op.selectedColumns.includes(col.id)
                                );
                            }
                            break;
                    }
                }

                set((state) => ({
                    nodes: {
                        ...state.nodes,
                        [nodeId]: {
                            rawData: transformedData,
                            schema: transformedSchema,
                            rowCount: transformedData.length,
                            status: 'SUCCESS'
                        }
                    }
                }));

            } catch (error: any) {
                set((state) => ({
                    nodes: {
                        ...state.nodes,
                        [nodeId]: {
                            rawData: [],
                            schema: [],
                            status: 'ERROR',
                            errorDetails: { rowIndex: -1, message: "Transform failed: " + error.message },
                            rowCount: 0
                        }
                    }
                }));
            }
        }, 100);
    },

    runCombineTransform: (nodeId, sourceNodeIds, operations) => {
        // Validate all sources exist
        const sources = sourceNodeIds.map(sid => get().getNodeData(sid)).filter((s): s is BatchNodeData => !!s);
        if (sources.length === 0) {
            console.error('CombineTransform: No valid source nodes found');
            return;
        }

        set((state) => ({
            nodes: {
                ...state.nodes,
                [nodeId]: {
                    rawData: [],
                    schema: [],
                    status: 'CALCULATING',
                    rowCount: 0
                }
            }
        }));

        setTimeout(() => {
            try {
                // Find the combine operation
                const combineOp = operations.find((op: any) => op.type === 'combine');
                const otherOps = operations.filter((op: any) => op.type !== 'combine');

                let combinedData: any[] = [];
                let combinedSchema: any[] = [];

                if (combineOp && combineOp.combineInputs && combineOp.combineInputs.length > 0) {
                    // Determine max row count across all sources
                    const maxRows = Math.max(...sources.map(s => s.rawData.length));

                    // Build combined schema from selected columns per input
                    for (const ci of combineOp.combineInputs) {
                        const srcIndex = ci.sourceInputIndex;
                        if (srcIndex >= 0 && srcIndex < sources.length) {
                            const srcSchema = sources[srcIndex].schema || [];
                            for (const colId of ci.columns) {
                                const colMeta = srcSchema.find((c: any) => c.id === colId);
                                if (colMeta && !combinedSchema.find((c: any) => c.id === colMeta.id)) {
                                    combinedSchema.push({ ...colMeta });
                                }
                            }
                        }
                    }

                    // Build combined data row-by-row
                    for (let i = 0; i < maxRows; i++) {
                        const row: any = {};
                        for (const ci of combineOp.combineInputs) {
                            const srcIndex = ci.sourceInputIndex;
                            if (srcIndex >= 0 && srcIndex < sources.length) {
                                const srcRow = sources[srcIndex].rawData[i];
                                for (const colId of ci.columns) {
                                    row[colId] = srcRow ? srcRow[colId] : null;
                                }
                            }
                        }
                        combinedData.push(row);
                    }
                } else {
                    // No combine op — fallback to first source
                    if (sources.length > 0) {
                        combinedData = [...sources[0].rawData];
                        combinedSchema = [...sources[0].schema];
                    }
                }

                // Apply remaining operations (delete, rename, select)
                for (const op of otherOps) {
                    switch (op.type) {
                        case 'delete':
                            if (op.column) {
                                combinedData = combinedData.map((row: any) => {
                                    const newRow = { ...row };
                                    delete newRow[op.column];
                                    return newRow;
                                });
                                combinedSchema = combinedSchema.filter((col: any) => col.id !== op.column);
                            }
                            break;
                        case 'rename':
                            if (op.column && op.newName) {
                                combinedData = combinedData.map((row: any) => {
                                    const newRow = { ...row };
                                    if (op.column in newRow) {
                                        newRow[op.newName] = newRow[op.column];
                                        delete newRow[op.column];
                                    }
                                    return newRow;
                                });
                                combinedSchema = combinedSchema.map((col: any) =>
                                    col.id === op.column
                                        ? { ...col, id: op.newName, name: op.newName }
                                        : col
                                );
                            }
                            break;
                        case 'select':
                            if (op.selectedColumns && op.selectedColumns.length > 0) {
                                combinedData = combinedData.map((row: any) => {
                                    const newRow: any = {};
                                    op.selectedColumns.forEach((col: string) => {
                                        if (col in row) newRow[col] = row[col];
                                    });
                                    return newRow;
                                });
                                combinedSchema = combinedSchema.filter((col: any) =>
                                    op.selectedColumns.includes(col.id)
                                );
                            }
                            break;
                    }
                }

                set((state) => ({
                    nodes: {
                        ...state.nodes,
                        [nodeId]: {
                            rawData: combinedData,
                            schema: combinedSchema,
                            rowCount: combinedData.length,
                            status: 'SUCCESS'
                        }
                    }
                }));

            } catch (error: any) {
                set((state) => ({
                    nodes: {
                        ...state.nodes,
                        [nodeId]: {
                            rawData: [],
                            schema: [],
                            status: 'ERROR',
                            errorDetails: { rowIndex: -1, message: "Combine transform failed: " + error.message },
                            rowCount: 0
                        }
                    }
                }));
            }
        }, 100);
    }
}));


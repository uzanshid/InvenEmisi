import type { Node, Edge, XYPosition, Connection, OnNodesChange, OnEdgesChange } from 'reactflow';

export type NodeType = 'source' | 'process' | 'factor' | 'groupBox' | 'passthrough' | 'dataset' | 'filter' | 'tableMath' | 'export' | 'transform' | 'ghost';

export interface HandleData {
    id: string;
    label: string;
}

// Base node data
export interface BaseNodeData {
    label: string;
    // Phase 10: Workspace Notes
    note?: string;
    // Visual state (persisted)
    isMinimized?: boolean;
    // Calculation results
    calculatedValue?: string | number | null;
    error?: string;
    hasCircularDependency?: boolean;
}

// Source Node: Value + Unit, Output only
export interface SourceNodeData extends BaseNodeData {
    type: 'source';
    value: number;
    unit: string;
    outputs: HandleData[];
}

// Factor Node mode
export type FactorMode = 'LOCKED_DB' | 'MANUAL_OVERRIDE';

// Factor Node: Value + Unit, Output only
export interface FactorNodeData extends BaseNodeData {
    type: 'factor';
    mode: FactorMode;
    dbRefId?: string;
    dbLabel?: string;
    value: number;
    unit: string;
    outputs: HandleData[];
}

// Process Node: Dynamic inputs, Formula
export interface ProcessNodeData extends BaseNodeData {
    type: 'process';
    formula: string;
    resultUnit?: string;  // Calculated unit from formula
    inputs: HandleData[];
    outputs: HandleData[];
    // Batch formula result (when connected to dataset nodes)
    batchResult?: {
        value: number | string;
        unit?: string;
        status: 'SUCCESS' | 'ERROR';
        error?: string;
    };
}

// Group Node: Container for organizing nodes
export interface GroupNodeData {
    type: 'groupBox';
    label: string;
    color?: string;
}

// PassThrough Node: Bridge for data flow in/out of groups
export interface PassThroughNodeData extends BaseNodeData {
    type: 'passthrough';
    inputs: HandleData[];
    outputs: HandleData[];
}

// --- BATCH NODES (Phase 7) ---

// Dataset Node: Import CSV/XLSX
export interface DatasetNodeData extends BaseNodeData {
    type: 'dataset';
    fileName?: string;
    rowCount?: number;
    outputs: HandleData[];
}

// Filter Node: Filter rows
export interface FilterNodeData extends BaseNodeData {
    type: 'filter';
    column?: string;
    operator?: '>' | '<' | '==' | '>=' | '<=' | '!=';
    value?: string | number;
    inputs: HandleData[];
    outputs: HandleData[];
}

// Table Math Node: Add calculated column
export interface TableMathNodeData extends BaseNodeData {
    type: 'tableMath';
    newColumnName?: string;
    formula?: string;
    unitOverride?: string;
    status?: 'idle' | 'processing' | 'done' | 'error';
    inputs: HandleData[];
    outputs: HandleData[];
}

// Export Node: Final output with unit check and export
export interface ExportNodeData extends BaseNodeData {
    type: 'export';
    exportFormat?: 'csv' | 'xlsx';
    inputs: HandleData[];
}

// Transform Node: Column operations (delete, rename, select, combine)
export interface TransformNodeData extends BaseNodeData {
    type: 'transform';
    operations?: {
        type: 'delete' | 'rename' | 'select' | 'combine';
        column?: string;
        newName?: string;
        selectedColumns?: string[];
        // For combine operations
        combineInputs?: {
            sourceInputIndex: number;
            columns: string[];
        }[];
    }[];
    inputs: HandleData[];
    outputs: HandleData[];
}

// Ghost Node: Visual duplicate of another node (Phase 9 replacement for Join)
export interface GhostNodeData extends BaseNodeData {
    type: 'ghost';
    sourceNodeId?: string;   // ID of the original node being mirrored
    outputs: HandleData[];
}

export type NodeData = SourceNodeData | FactorNodeData | ProcessNodeData | GroupNodeData | PassThroughNodeData | DatasetNodeData | FilterNodeData | TableMathNodeData | ExportNodeData | TransformNodeData | GhostNodeData;

export interface AppState {
    nodes: Node<NodeData>[];
    edges: Edge[];
    clipboard: Node<NodeData>[];
    // Node actions
    addNode: (type: NodeType, pos: XYPosition) => void;
    updateNodeData: <T extends NodeData>(id: string, data: Partial<T>) => void;
    deleteNodes: (nodeIds: string[]) => void;
    copyNodes: (nodeIds: string[]) => void;
    pasteNodes: (pos: XYPosition) => void;
    // Calculation actions
    runCalculations: () => void;
    // Process node handle actions
    addNodeInput: (nodeId: string) => void;
    addNodeOutput: (nodeId: string) => void;
    updateHandleLabel: (nodeId: string, handleId: string, label: string, handleType: 'input' | 'output') => void;
    setNodeZIndex: (nodeId: string, zIndex: number) => void;
    // ReactFlow callbacks
    onConnect: (connection: Connection) => void;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
}

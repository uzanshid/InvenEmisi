import type { Node, Edge, XYPosition, Connection, OnNodesChange, OnEdgesChange } from 'reactflow';

export type NodeType = 'source' | 'process' | 'factor' | 'group' | 'passthrough';

export interface HandleData {
    id: string;
    label: string;
}

// Base node data
export interface BaseNodeData {
    label: string;
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
    inputs: HandleData[];
    outputs: HandleData[];
}

// Group Node: Container for organizing nodes
export interface GroupNodeData {
    type: 'group';
    label: string;
    color?: string;
}

// PassThrough Node: Bridge for data flow in/out of groups
export interface PassThroughNodeData extends BaseNodeData {
    type: 'passthrough';
    inputs: HandleData[];
    outputs: HandleData[];
}

export type NodeData = SourceNodeData | FactorNodeData | ProcessNodeData | GroupNodeData | PassThroughNodeData;

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

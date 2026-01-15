import { create } from 'zustand';
import { temporal } from 'zundo';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import type { Node } from 'reactflow';
import type { AppState, NodeType, NodeData, HandleData, SourceNodeData, FactorNodeData, ProcessNodeData, GroupNodeData, PassThroughNodeData } from '../types';
import { runCalculations as executeCalculations } from '../lib/calculationEngine';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createNodeData = (type: NodeType): NodeData => {
    const baseLabel = type === 'passthrough' ? 'Pass' : `${type.charAt(0).toUpperCase() + type.slice(1)} Node`;

    switch (type) {
        case 'source':
            return {
                label: baseLabel,
                type: 'source',
                value: 0,
                unit: '',
                outputs: [{ id: generateId(), label: 'Output' }],
            } as SourceNodeData;
        case 'factor':
            return {
                label: baseLabel,
                type: 'factor',
                mode: 'MANUAL_OVERRIDE',
                value: 0,
                unit: '',
                outputs: [{ id: generateId(), label: 'Output' }],
            } as FactorNodeData;
        case 'process':
            return {
                label: baseLabel,
                type: 'process',
                formula: '',
                inputs: [{ id: generateId(), label: 'A' }],
                outputs: [{ id: generateId(), label: 'Result' }],
            } as ProcessNodeData;
        case 'group':
            return {
                label: baseLabel,
                type: 'group',
                color: '#6366f1',
                zIndex: -1,
            } as GroupNodeData & { zIndex?: number };
        case 'passthrough':
            return {
                label: baseLabel,
                type: 'passthrough',
                inputs: [{ id: generateId(), label: 'In' }],
                outputs: [{ id: generateId(), label: 'Out' }],
            } as PassThroughNodeData;
        case 'dataset':
            return {
                label: baseLabel,
                type: 'dataset',
                outputs: [{ id: generateId(), label: 'Output' }],
            } as any; // Cast to any temporarily to avoid deep type issues until types are fully propagated
        case 'filter':
            return {
                label: baseLabel,
                type: 'filter',
                operator: '>',
                inputs: [{ id: generateId(), label: 'In' }],
                outputs: [{ id: generateId(), label: 'Out' }],
            } as any;
        case 'tableMath':
            return {
                label: baseLabel,
                type: 'tableMath',
                status: 'idle',
                inputs: [{ id: generateId(), label: 'In' }],
                outputs: [{ id: generateId(), label: 'Out' }],
            } as any;
        case 'export':
            return {
                label: 'Export',
                type: 'export',
                exportFormat: 'xlsx',
                inputs: [{ id: generateId(), label: 'Data' }],
            } as any;
        case 'transform':
            return {
                label: 'Transform',
                type: 'transform',
                operations: [],
                inputs: [{ id: generateId(), label: 'In' }],
                outputs: [{ id: generateId(), label: 'Out' }],
            } as any;
        default:
            throw new Error(`Unknown node type: ${type}`);
    }
};

export const useAppStore = create<AppState>()(
    temporal(
        (set, get) => ({
            nodes: [],
            edges: [],
            clipboard: [],

            addNode: (type: NodeType, pos) => {
                const id = generateId();
                const nodeData = createNodeData(type);

                const newNode: Node<NodeData> = {
                    id,
                    type,
                    position: pos,
                    data: nodeData,
                };

                set((state) => ({
                    nodes: [...state.nodes, newNode],
                }));

                // Trigger calculation after adding node
                setTimeout(() => get().runCalculations(), 0);
            },

            updateNodeData: (id, data) => {
                set((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
                    ),
                }));

                // Trigger calculation after updating node data
                setTimeout(() => get().runCalculations(), 0);
            },

            deleteNodes: (nodeIds) => {
                set((state) => ({
                    nodes: state.nodes.filter((node) => !nodeIds.includes(node.id)),
                    edges: state.edges.filter(
                        (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
                    ),
                }));

                setTimeout(() => get().runCalculations(), 0);
            },

            copyNodes: (nodeIds) => {
                const nodes = get().nodes.filter((node) => nodeIds.includes(node.id));
                set({ clipboard: nodes });
            },

            pasteNodes: (pos) => {
                const clipboard = get().clipboard;
                if (clipboard.length === 0) return;

                const firstNode = clipboard[0];
                const offsetX = pos.x - firstNode.position.x;
                const offsetY = pos.y - firstNode.position.y;

                const newNodes = clipboard.map((node) => ({
                    ...node,
                    id: generateId(),
                    position: {
                        x: node.position.x + offsetX,
                        y: node.position.y + offsetY,
                    },
                    selected: false,
                }));

                set((state) => ({
                    nodes: [...state.nodes, ...newNodes],
                }));

                setTimeout(() => get().runCalculations(), 0);
            },

            runCalculations: () => {
                const { nodes, edges } = get();
                const { results, circularNodes } = executeCalculations(nodes, edges);

                set((state) => ({
                    nodes: state.nodes.map((node) => {
                        const result = results.get(node.id);
                        const hasCircular = circularNodes.has(node.id);

                        return {
                            ...node,
                            data: {
                                ...node.data,
                                calculatedValue: result?.value ?? null,
                                error: result?.error,
                                hasCircularDependency: hasCircular,
                                // Store resultUnit for process nodes
                                ...(node.data.type === 'process' && result?.resultUnit
                                    ? { resultUnit: result.resultUnit }
                                    : {}),
                            },
                        };
                    }),
                }));
            },

            addNodeInput: (nodeId) => {
                set((state) => ({
                    nodes: state.nodes.map((node) => {
                        if (node.id !== nodeId) return node;

                        // Support both process and tableMath nodes
                        if (node.data.type !== 'process' && node.data.type !== 'tableMath') return node;

                        const currentInputs = 'inputs' in node.data ? node.data.inputs : [];
                        const newInput: HandleData = {
                            id: generateId(),
                            label: String.fromCharCode(65 + currentInputs.length), // A, B, C...
                        };
                        return {
                            ...node,
                            data: { ...node.data, inputs: [...currentInputs, newInput] },
                        };
                    }),
                }));
            },

            addNodeOutput: (nodeId) => {
                set((state) => ({
                    nodes: state.nodes.map((node) => {
                        if (node.id !== nodeId) return node;
                        const currentOutputs = 'outputs' in node.data ? node.data.outputs : [];
                        const newOutput: HandleData = {
                            id: generateId(),
                            label: `Output ${currentOutputs.length + 1}`,
                        };
                        return {
                            ...node,
                            data: { ...node.data, outputs: [...currentOutputs, newOutput] },
                        };
                    }),
                }));
            },

            updateHandleLabel: (nodeId, handleId, label, handleType) => {
                set((state) => ({
                    nodes: state.nodes.map((node) => {
                        if (node.id !== nodeId) return node;

                        const updateHandles = (handles: HandleData[]) =>
                            handles.map((h) => (h.id === handleId ? { ...h, label } : h));

                        if (handleType === 'input' && 'inputs' in node.data) {
                            return { ...node, data: { ...node.data, inputs: updateHandles(node.data.inputs) } };
                        }
                        if (handleType === 'output' && 'outputs' in node.data) {
                            return { ...node, data: { ...node.data, outputs: updateHandles(node.data.outputs) } };
                        }
                        return node;
                    }),
                }));

                setTimeout(() => get().runCalculations(), 0);
            },

            setNodeZIndex: (nodeId, zIndex) => {
                set((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === nodeId ? { ...node, zIndex } : node
                    ),
                }));
            },

            onConnect: (connection) => {
                set((state) => {
                    if (connection.source === connection.target) return state;

                    const targetNode = state.nodes.find(n => n.id === connection.target);
                    const sourceNode = state.nodes.find(n => n.id === connection.source);

                    // Check if target node is process or tableMath and needs auto-input
                    if (targetNode && (targetNode.data.type === 'process' || targetNode.data.type === 'tableMath')) {
                        const inputs = 'inputs' in targetNode.data ? targetNode.data.inputs : [];

                        // If targetHandle is undefined or doesn't exist in inputs, auto-add new input
                        const handleExists = inputs.some((h: any) => h.id === connection.targetHandle);

                        if (!connection.targetHandle || !handleExists) {
                            // Auto-add new input with source node's label
                            const sourceLabel = sourceNode?.data?.label || String.fromCharCode(65 + inputs.length);
                            const newInputId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            const newInput = { id: newInputId, label: sourceLabel };

                            // Update node with new input
                            const updatedNodes = state.nodes.map(n => {
                                if (n.id === connection.target) {
                                    return {
                                        ...n,
                                        data: { ...n.data, inputs: [...inputs, newInput] }
                                    };
                                }
                                return n;
                            });

                            // Create connection to new input
                            const newConnection = { ...connection, targetHandle: newInputId };
                            return {
                                nodes: updatedNodes,
                                edges: addEdge(newConnection, state.edges)
                            };
                        }
                    }

                    // Standard connection logic
                    const targetHandleHasConnection = state.edges.some(
                        (edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle
                    );
                    if (targetHandleHasConnection) return state;

                    const sourceAlreadyConnectedToTarget = state.edges.some(
                        (edge) => edge.source === connection.source && edge.target === connection.target
                    );
                    if (sourceAlreadyConnectedToTarget) return state;

                    // Auto-rename input handle to match source node label
                    if (targetNode && sourceNode && 'inputs' in targetNode.data) {
                        const inputs = targetNode.data.inputs as any[];
                        const targetInput = inputs.find((h: any) => h.id === connection.targetHandle);

                        if (targetInput && sourceNode.data?.label) {
                            const updatedInputs = inputs.map((h: any) =>
                                h.id === connection.targetHandle
                                    ? { ...h, label: sourceNode.data.label }
                                    : h
                            );

                            const updatedNodes = state.nodes.map(n =>
                                n.id === connection.target
                                    ? { ...n, data: { ...n.data, inputs: updatedInputs } }
                                    : n
                            );

                            return {
                                nodes: updatedNodes,
                                edges: addEdge(connection, state.edges)
                            };
                        }
                    }

                    return { edges: addEdge(connection, state.edges) };
                });

                // Trigger calculation after connecting
                setTimeout(() => get().runCalculations(), 0);
            },

            onNodesChange: (changes) => {
                set((state) => ({
                    nodes: applyNodeChanges(changes, state.nodes),
                }));
            },

            onEdgesChange: (changes) => {
                set((state) => ({
                    edges: applyEdgeChanges(changes, state.edges),
                }));

                // Trigger calculation after edge changes
                setTimeout(() => get().runCalculations(), 0);
            },
        }),
        {
            limit: 50,
        }
    )
);

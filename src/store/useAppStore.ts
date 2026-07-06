import { create } from 'zustand';
import { temporal } from 'zundo';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import type { Node } from 'reactflow';
import type { AppState, NodeType, NodeData, HandleData, SnapLine } from '../types';
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
        case 'groupBox':
            return {
                label: baseLabel,
                type: 'groupBox',
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
                inputs: [
                    { id: generateId(), label: 'Input 1' },
                    { id: generateId(), label: 'Input 2' }
                ],
                outputs: [{ id: generateId(), label: 'Out' }],
            } as any;
        case 'ghost':
            return {
                label: 'Ghost',
                type: 'ghost',
                outputs: [{ id: generateId(), label: 'Output' }],
            } as any;
        case 'text':
            return {
                type: 'text',
                text: '',
            } as any;
        default:
            throw new Error(`Unknown node type: ${type}`);
    }
};

let isShiftDown = false;
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', e => {
        if (e.key === 'Shift') isShiftDown = true;
    });
    window.addEventListener('keyup', e => {
        if (e.key === 'Shift') isShiftDown = false;
    });
}

export const useAppStore = create<AppState>()(
    temporal(
        (set, get) => ({
            nodes: [],
            edges: [],
            clipboard: [],
            snapLines: [],
            setSnapLines: (lines) => set({ snapLines: lines }),

            alignNodes: (alignType) => {
                set((state) => {
                    const selectedNodes = state.nodes.filter(n => n.selected);
                    if (selectedNodes.length < 2) return state;

                    // Helper to get absolute position for calculating global bounds
                    const getAbsPos = (node: typeof selectedNodes[0]) => {
                        let x = node.position.x;
                        let y = node.position.y;
                        let currId = node.parentNode;
                        while (currId) {
                            const p = state.nodes.find(n => n.id === currId);
                            if (p) {
                                x += p.position.x;
                                y += p.position.y;
                                currId = p.parentNode;
                            } else break;
                        }
                        return { x, y };
                    };

                    const absBounds = selectedNodes.map(n => {
                        const abs = getAbsPos(n);
                        return { id: n.id, absX: abs.x, absY: abs.y, w: n.width || 150, h: n.height || 50 };
                    });

                    const minX = Math.min(...absBounds.map(n => n.absX));
                    const maxX = Math.max(...absBounds.map(n => n.absX + n.w));
                    const minY = Math.min(...absBounds.map(n => n.absY));
                    const maxY = Math.max(...absBounds.map(n => n.absY + n.h));

                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;

                    const newNodes = state.nodes.map(n => {
                        if (!n.selected) return n;

                        const b = absBounds.find(ab => ab.id === n.id)!;
                        let targetAbsX = b.absX;
                        let targetAbsY = b.absY;

                        switch (alignType) {
                            case 'left': targetAbsX = minX; break;
                            case 'right': targetAbsX = maxX - b.w; break;
                            case 'center-h': targetAbsX = centerX - b.w / 2; break;
                            case 'top': targetAbsY = minY; break;
                            case 'bottom': targetAbsY = maxY - b.h; break;
                            case 'center-v': targetAbsY = centerY - b.h / 2; break;
                        }

                        // Convert target absolute coordinates back to relative coordinates by calculating the difference
                        const diffX = targetAbsX - b.absX;
                        const diffY = targetAbsY - b.absY;

                        return {
                            ...n,
                            position: { x: n.position.x + diffX, y: n.position.y + diffY }
                        };
                    });

                    return { nodes: newNodes };
                });
            },

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
                get().runCalculations();
            },

            updateNodeData: (id, data) => {
                set((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
                    ),
                }));

                // Trigger calculation after updating node data
                get().runCalculations();
            },

            toggleNodeLock: (id: string, isLocked: boolean) => {
                set((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === id ? { ...node, draggable: !isLocked, selectable: true } : node
                    ),
                }));
            },

            deleteNodes: (nodeIds) => {
                set((state) => ({
                    nodes: state.nodes.filter((node) => !nodeIds.includes(node.id)),
                    edges: state.edges.filter(
                        (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
                    ),
                }));

                get().runCalculations();
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

                get().runCalculations();
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
                        if (node.data.type !== 'process' && node.data.type !== 'tableMath' && node.data.type !== 'transform') return node;

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

                get().runCalculations();
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
                    if (targetNode && (targetNode.data.type === 'process' || targetNode.data.type === 'tableMath' || targetNode.data.type === 'transform')) {
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
                get().runCalculations();
            },

            onNodesChange: (changes) => {
                set((state) => {
                    let processedChanges = changes;
                    let newSnapLines: SnapLine[] = [];
                    const snapThreshold = 15;
                    
                    const getAbsFromRelative = (x: number, y: number, parentId?: string): { x: number, y: number } => {
                        let absX = x;
                        let absY = y;
                        let currParent = parentId;
                        while (currParent) {
                            const p = state.nodes.find(n => n.id === currParent);
                            if (p) {
                                absX += p.position.x;
                                absY += p.position.y;
                                currParent = p.parentNode;
                            } else break;
                        }
                        return { x: absX, y: absY };
                    };
                    
                    const draggingChangesCount = changes.filter(c => c.type === 'position' && c.dragging).length;

                    if (isShiftDown) {
                        processedChanges = changes.map(change => {
                            if (change.type === 'position' && change.dragging && change.position) {
                                const originalNode = state.nodes.find(n => n.id === change.id);
                                if (originalNode && originalNode.position) {
                                    const dx = Math.abs(change.position.x - originalNode.position.x);
                                    const dy = Math.abs(change.position.y - originalNode.position.y);
                                    if (dx > dy) {
                                        return { ...change, position: { x: change.position.x, y: originalNode.position.y } };
                                    } else {
                                        return { ...change, position: { x: originalNode.position.x, y: change.position.y } };
                                    }
                                }
                            }
                            return change;
                        });
                    } else if (draggingChangesCount === 1) {
                        // Smart snapping logic (HANYA AKTIF JIKA SINGLE DRAG)
                        processedChanges = changes.map(change => {
                            if (change.type === 'position' && change.dragging && change.position) {
                                const draggedNode = state.nodes.find(n => n.id === change.id);
                                if (!draggedNode) return change;

                                let snappedX = change.position.x;
                                let snappedY = change.position.y;
                                let snapped = false;

                                const draggedW = draggedNode.width || 150;
                                const draggedH = draggedNode.height || 50;

                                // Snap only with siblings (same parentNode context)
                                const siblings = state.nodes.filter(n => n.id !== change.id && n.parentNode === draggedNode.parentNode);

                                // 1. Parent Boundaries Snapping
                                if (draggedNode.parentNode) {
                                    const parent = state.nodes.find(n => n.id === draggedNode.parentNode);
                                    if (parent) {
                                        const pW = (parent.style?.width as number) || parent.width || 300;
                                        const pH = (parent.style?.height as number) || parent.height || 200;
                                        
                                        if (Math.abs(change.position.x) < snapThreshold) {
                                            snappedX = 0; newSnapLines.push({ type: 'alignment', x: getAbsFromRelative(0, 0, parent.id).x }); snapped = true;
                                        } else if (Math.abs(change.position.x + draggedW - pW) < snapThreshold) {
                                            snappedX = pW - draggedW; newSnapLines.push({ type: 'alignment', x: getAbsFromRelative(pW, 0, parent.id).x }); snapped = true;
                                        }
                                        
                                        if (Math.abs(change.position.y) < snapThreshold) {
                                            snappedY = 0; newSnapLines.push({ type: 'alignment', y: getAbsFromRelative(0, 0, parent.id).y }); snapped = true;
                                        } else if (Math.abs(change.position.y + draggedH - pH) < snapThreshold) {
                                            snappedY = pH - draggedH; newSnapLines.push({ type: 'alignment', y: getAbsFromRelative(0, pH, parent.id).y }); snapped = true;
                                        }
                                    }
                                }

                                // 2. Sibling Alignment Snapping
                                for (const sibling of siblings) {
                                    const sibX = sibling.position.x;
                                    const sibY = sibling.position.y;
                                    const sibW = sibling.width || 150;
                                    const sibH = sibling.height || 50;

                                    const absSib = getAbsFromRelative(sibX, sibY, draggedNode.parentNode);
                                    const absSibCenter = getAbsFromRelative(sibX + sibW/2, sibY + sibH/2, draggedNode.parentNode);
                                    const absSibRight = getAbsFromRelative(sibX + sibW, sibY + sibH, draggedNode.parentNode);

                                    // X-Axis Alignment
                                    if (Math.abs(change.position.x - sibX) < snapThreshold) {
                                        snappedX = sibX; newSnapLines.push({ type: 'alignment', x: absSib.x }); snapped = true;
                                    } else if (Math.abs((change.position.x + draggedW/2) - (sibX + sibW/2)) < snapThreshold) {
                                        snappedX = sibX + sibW/2 - draggedW/2; newSnapLines.push({ type: 'alignment', x: absSibCenter.x }); snapped = true;
                                    } else if (Math.abs((change.position.x + draggedW) - (sibX + sibW)) < snapThreshold) {
                                        snappedX = sibX + sibW - draggedW; newSnapLines.push({ type: 'alignment', x: absSibRight.x }); snapped = true;
                                    }

                                    // Y-Axis Alignment
                                    if (Math.abs(change.position.y - sibY) < snapThreshold) {
                                        snappedY = sibY; newSnapLines.push({ type: 'alignment', y: absSib.y }); snapped = true;
                                    } else if (Math.abs((change.position.y + draggedH/2) - (sibY + sibH/2)) < snapThreshold) {
                                        snappedY = sibY + sibH/2 - draggedH/2; newSnapLines.push({ type: 'alignment', y: absSibCenter.y }); snapped = true;
                                    } else if (Math.abs((change.position.y + draggedH) - (sibY + sibH)) < snapThreshold) {
                                        snappedY = sibY + sibH - draggedH; newSnapLines.push({ type: 'alignment', y: absSibRight.y }); snapped = true;
                                    }
                                }

                                // 3. Smart Spacing Snapping
                                const rowSiblings = siblings.filter(s => {
                                    const sY = s.position.y;
                                    const sH = s.height || 50;
                                    return Math.max(change.position.y, sY) < Math.min(change.position.y + draggedH, sY + sH);
                                });
                                if (rowSiblings.length >= 2) {
                                    let edges = rowSiblings.flatMap(s => [
                                        { x: s.position.x, type: 'left', node: s },
                                        { x: s.position.x + (s.width || 150), type: 'right', node: s }
                                    ]).sort((a,b) => a.x - b.x);
                                    
                                    const adjacentGaps: { gap: number, leftX: number, rightX: number, nodeL: any, nodeR: any }[] = [];
                                    for (let i=0; i<edges.length-1; i++) {
                                        if (edges[i].type === 'right' && edges[i+1].type === 'left' && edges[i].node.id !== edges[i+1].node.id) {
                                            const gap = edges[i+1].x - edges[i].x;
                                            if (gap > 0 && gap < 500) {
                                                adjacentGaps.push({ gap, leftX: edges[i].x, rightX: edges[i+1].x, nodeL: edges[i].node, nodeR: edges[i+1].node });
                                            }
                                        }
                                    }

                                    for (const sib of rowSiblings) {
                                        const sibL = sib.position.x;
                                        const sibR = sib.position.x + (sib.width || 150);
                                        for (const ag of adjacentGaps) {
                                            if (ag.nodeL.id === sib.id || ag.nodeR.id === sib.id) continue;
                                            if (Math.abs((change.position.x - sibR) - ag.gap) < snapThreshold) {
                                                snappedX = sibR + ag.gap;
                                                const a1 = getAbsFromRelative(ag.leftX, change.position.y + draggedH/2, draggedNode.parentNode);
                                                newSnapLines.push({ type: 'spacing', startX: a1.x, endX: a1.x + ag.gap, startY: a1.y, endY: a1.y, gap: Math.round(ag.gap) });
                                                const a2 = getAbsFromRelative(sibR, change.position.y + draggedH/2, draggedNode.parentNode);
                                                newSnapLines.push({ type: 'spacing', startX: a2.x, endX: a2.x + ag.gap, startY: a2.y, endY: a2.y, gap: Math.round(ag.gap) });
                                                snapped = true; break;
                                            }
                                            if (Math.abs((sibL - (change.position.x + draggedW)) - ag.gap) < snapThreshold) {
                                                snappedX = sibL - ag.gap - draggedW;
                                                const a1 = getAbsFromRelative(ag.leftX, change.position.y + draggedH/2, draggedNode.parentNode);
                                                newSnapLines.push({ type: 'spacing', startX: a1.x, endX: a1.x + ag.gap, startY: a1.y, endY: a1.y, gap: Math.round(ag.gap) });
                                                const a2 = getAbsFromRelative(snappedX + draggedW, change.position.y + draggedH/2, draggedNode.parentNode);
                                                newSnapLines.push({ type: 'spacing', startX: a2.x, endX: a2.x + ag.gap, startY: a2.y, endY: a2.y, gap: Math.round(ag.gap) });
                                                snapped = true; break;
                                            }
                                        }
                                    }
                                }

                                const colSiblings = siblings.filter(s => {
                                    const sX = s.position.x;
                                    const sW = s.width || 150;
                                    return Math.max(change.position.x, sX) < Math.min(change.position.x + draggedW, sX + sW);
                                });
                                if (colSiblings.length >= 2) {
                                    let edges = colSiblings.flatMap(s => [
                                        { y: s.position.y, type: 'top', node: s },
                                        { y: s.position.y + (s.height || 50), type: 'bottom', node: s }
                                    ]).sort((a,b) => a.y - b.y);
                                    
                                    const adjacentGaps: { gap: number, topY: number, botY: number, nodeT: any, nodeB: any }[] = [];
                                    for (let i=0; i<edges.length-1; i++) {
                                        if (edges[i].type === 'bottom' && edges[i+1].type === 'top' && edges[i].node.id !== edges[i+1].node.id) {
                                            const gap = edges[i+1].y - edges[i].y;
                                            if (gap > 0 && gap < 500) {
                                                adjacentGaps.push({ gap, topY: edges[i].y, botY: edges[i+1].y, nodeT: edges[i].node, nodeB: edges[i+1].node });
                                            }
                                        }
                                    }

                                    for (const sib of colSiblings) {
                                        const sibT = sib.position.y;
                                        const sibB = sib.position.y + (sib.height || 50);
                                        for (const ag of adjacentGaps) {
                                            if (ag.nodeT.id === sib.id || ag.nodeB.id === sib.id) continue;
                                            if (Math.abs((change.position.y - sibB) - ag.gap) < snapThreshold) {
                                                snappedY = sibB + ag.gap;
                                                const a1 = getAbsFromRelative(change.position.x + draggedW/2, ag.topY, draggedNode.parentNode);
                                                newSnapLines.push({ type: 'spacing', startX: a1.x, endX: a1.x, startY: a1.y, endY: a1.y + ag.gap, gap: Math.round(ag.gap) });
                                                const a2 = getAbsFromRelative(change.position.x + draggedW/2, sibB, draggedNode.parentNode);
                                                newSnapLines.push({ type: 'spacing', startX: a2.x, endX: a2.x, startY: a2.y, endY: a2.y + ag.gap, gap: Math.round(ag.gap) });
                                                snapped = true; break;
                                            }
                                            if (Math.abs((sibT - (change.position.y + draggedH)) - ag.gap) < snapThreshold) {
                                                snappedY = sibT - ag.gap - draggedH;
                                                const a1 = getAbsFromRelative(change.position.x + draggedW/2, ag.topY, draggedNode.parentNode);
                                                newSnapLines.push({ type: 'spacing', startX: a1.x, endX: a1.x, startY: a1.y, endY: a1.y + ag.gap, gap: Math.round(ag.gap) });
                                                const a2 = getAbsFromRelative(change.position.x + draggedW/2, snappedY + draggedH, draggedNode.parentNode);
                                                newSnapLines.push({ type: 'spacing', startX: a2.x, endX: a2.x, startY: a2.y, endY: a2.y + ag.gap, gap: Math.round(ag.gap) });
                                                snapped = true; break;
                                            }
                                        }
                                    }
                                }

                                if (snapped) {
                                    return { ...change, position: { x: snappedX, y: snappedY } };
                                }
                            }
                            return change;
                        });
                    }

                    const newNodes = applyNodeChanges(processedChanges, state.nodes);

                    // Handle drag end events to assign or remove parentNode
                    const dragEndChanges = processedChanges.filter((c: any) => c.type === 'position' && !c.dragging);
                    
                    if (dragEndChanges.length > 0) {
                        const groups = newNodes.filter(n => n.type === 'groupBox');
                        
                        // Helper for absolute position supporting nested parents
                        const getAbsolutePosition = (nodeId: string): { x: number, y: number } => {
                            let curr = newNodes.find(n => n.id === nodeId);
                            let x = curr?.position.x || 0;
                            let y = curr?.position.y || 0;
                            while (curr?.parentNode) {
                                curr = newNodes.find(n => n.id === curr!.parentNode);
                                if (curr) {
                                    x += curr.position.x;
                                    y += curr.position.y;
                                }
                            }
                            return { x, y };
                        };

                        dragEndChanges.forEach((change: any) => {
                            const node = newNodes.find(n => n.id === change.id);
                            if (!node || node.type === 'groupBox') return;

                            const { x: absoluteX, y: absoluteY } = getAbsolutePosition(node.id);
                            const nodeCenterX = absoluteX + (node.width || 100) / 2;
                            const nodeCenterY = absoluteY + (node.height || 50) / 2;

                            // Find which group bounds the node falls into
                            const intersectingGroups = groups.filter(g => {
                                const { x: gX, y: gY } = getAbsolutePosition(g.id);
                                const gW = (g.style?.width as number) || g.width || 300;
                                const gH = (g.style?.height as number) || g.height || 200;

                                return (
                                    nodeCenterX >= gX && nodeCenterX <= gX + gW &&
                                    nodeCenterY >= gY && nodeCenterY <= gY + gH
                                );
                            });

                            // Pick top-most group by zIndex
                            intersectingGroups.sort((a, b) => ((b.zIndex as number) || 0) - ((a.zIndex as number) || 0));
                            const targetGroup = intersectingGroups[0];

                            if (targetGroup && node.parentNode !== targetGroup.id) {
                                // Prevent circular nesting (just in case, though groups aren't draggable into here, better safe)
                                let isCircular = false;
                                let currGroup = targetGroup;
                                while (currGroup.parentNode) {
                                    if (currGroup.parentNode === node.id) {
                                        isCircular = true;
                                        break;
                                    }
                                    const next = newNodes.find(n => n.id === currGroup.parentNode);
                                    if (!next) break;
                                    currGroup = next;
                                }

                                if (!isCircular) {
                                    node.parentNode = targetGroup.id;
                                    node.extent = undefined;
                                    const targetAbs = getAbsolutePosition(targetGroup.id);
                                    node.position = { x: absoluteX - targetAbs.x, y: absoluteY - targetAbs.y };
                                }
                            } else if (!targetGroup && node.parentNode) {
                                node.parentNode = undefined;
                                node.extent = undefined;
                                node.position = { x: absoluteX, y: absoluteY };
                            }
                        });
                    }

                    const isDragging = changes.some(c => c.type === 'position' && c.dragging);
                    const isDragEnd = changes.some(c => c.type === 'position' && !c.dragging); // Fix: removed && c.position so it triggers reliably on mouse up
                    
                    let nextSnapLines = state.snapLines;
                    if (isDragging) nextSnapLines = newSnapLines;
                    else if (isDragEnd) nextSnapLines = [];

                    return { nodes: newNodes, snapLines: nextSnapLines };
                });
            },

            onEdgesChange: (changes) => {
                set((state) => ({
                    edges: applyEdgeChanges(changes, state.edges),
                }));

                // Trigger calculation after edge changes
                get().runCalculations();
            },
        }),
        {
            limit: 50,
        }
    )
);

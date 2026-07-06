import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    useStore,
    SelectionMode,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '../store/useAppStore';
import type { NodeType } from '../types';
import { useShallow } from 'zustand/react/shallow';
import SourceNode from './nodes/SourceNode';
import FactorNode from './nodes/FactorNode';
import ProcessNode from './nodes/ProcessNode';
import GroupNode from './nodes/GroupNode';
import PassThroughNode from './nodes/PassThroughNode';
import DatasetNode from './nodes/DatasetNode';
import FilterNode from './nodes/FilterNode';
import TableMathNode from './nodes/TableMathNode';
import ExportNode from './nodes/ExportNode';
import TransformNode from './nodes/TransformNode';
import GhostNode from './nodes/GhostNode';
import TextNode from './nodes/TextNode';
import { ContextMenu } from './ContextMenu';
import { GlobalDataModal } from './GlobalDataModal';
import { Toolbar } from './Toolbar';
import { downloadProjectFile } from '../lib/projectSerializer';

interface ContextMenuState {
    x: number;
    y: number;
    type: 'node' | 'edge' | 'pane' | 'multi';
    nodeId?: string;
    nodeType?: string;
    edgeId?: string;
}

const selector = (state: any) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    addNode: state.addNode,
    deleteNodes: state.deleteNodes,
    copyNodes: state.copyNodes,
    pasteNodes: state.pasteNodes,
    setNodeZIndex: state.setNodeZIndex,
    toggleNodeLock: state.toggleNodeLock,
    alignNodes: state.alignNodes,
});

const SnapLinesOverlay = () => {
    const snapLines = useAppStore(s => s.snapLines);
    const transform = useStore(s => s.transform);

    if (!snapLines || snapLines.length === 0) return null;
    const strokeW = 1 / transform[2];
    const fontSize = 10 / transform[2];
    const tickLen = 10 / transform[2];

    return (
        <svg style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000,
        }}>
            <g transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`}>
                {snapLines.map((line, i) => {
                    if (line.type === 'alignment') {
                        if (line.x !== undefined) {
                            return <line key={`ax-${i}`} x1={line.x} y1={-99999} x2={line.x} y2={99999} stroke="#ef4444" strokeWidth={strokeW} strokeDasharray={`${5 * strokeW},${5 * strokeW}`} />
                        }
                        if (line.y !== undefined) {
                            return <line key={`ay-${i}`} x1={-99999} y1={line.y} x2={99999} y2={line.y} stroke="#ef4444" strokeWidth={strokeW} strokeDasharray={`${5 * strokeW},${5 * strokeW}`} />
                        }
                    } else if (line.type === 'spacing') {
                        const { startX = 0, endX = 0, startY = 0, endY = 0, gap = 0 } = line;
                        const isHorizontal = startY === endY;
                        
                        return (
                            <g key={`sp-${i}`}>
                                <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#3b82f6" strokeWidth={strokeW} />
                                {isHorizontal ? (
                                    <>
                                        <line x1={startX} y1={startY - tickLen/2} x2={startX} y2={startY + tickLen/2} stroke="#3b82f6" strokeWidth={strokeW} />
                                        <line x1={endX} y1={startY - tickLen/2} x2={endX} y2={startY + tickLen/2} stroke="#3b82f6" strokeWidth={strokeW} />
                                        <rect x={(startX + endX)/2 - fontSize*1.5} y={startY - fontSize*0.6} width={fontSize*3} height={fontSize*1.2} fill="#3b82f6" rx={2/transform[2]} />
                                        <text x={(startX + endX)/2} y={startY} fontSize={fontSize} fill="white" textAnchor="middle" dominantBaseline="central" fontWeight="bold">{gap}px</text>
                                    </>
                                ) : (
                                    <>
                                        <line x1={startX - tickLen/2} y1={startY} x2={startX + tickLen/2} y2={startY} stroke="#3b82f6" strokeWidth={strokeW} />
                                        <line x1={startX - tickLen/2} y1={endY} x2={startX + tickLen/2} y2={endY} stroke="#3b82f6" strokeWidth={strokeW} />
                                        <rect x={startX - fontSize*1.5} y={(startY + endY)/2 - fontSize*0.6} width={fontSize*3} height={fontSize*1.2} fill="#3b82f6" rx={2/transform[2]} />
                                        <text x={startX} y={(startY + endY)/2} fontSize={fontSize} fill="white" textAnchor="middle" dominantBaseline="central" fontWeight="bold">{gap}px</text>
                                    </>
                                )}
                            </g>
                        );
                    }
                    return null;
                })}
            </g>
        </svg>
    );
};

const CanvasMain = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode,
        deleteNodes, copyNodes, pasteNodes, setNodeZIndex, toggleNodeLock, alignNodes
    } = useAppStore(useShallow(selector));
    const { deleteElements, getNodes, getEdges, screenToFlowPosition } = useReactFlow();
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const nodeTypes = useMemo(() => ({
        source: SourceNode,
        factor: FactorNode,
        process: ProcessNode,
        groupBox: GroupNode,
        passthrough: PassThroughNode,
        dataset: DatasetNode,
        filter: FilterNode,
        tableMath: TableMathNode,
        export: ExportNode,
        transform: TransformNode,
        ghost: GhostNode,
        text: TextNode,
    }), []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const active = document.activeElement;
            const isEditing = active instanceof HTMLInputElement ||
                active instanceof HTMLTextAreaElement ||
                (active instanceof HTMLElement && active.isContentEditable);

            if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
                if (isEditing) return;
                event.preventDefault();
                useAppStore.temporal.getState().undo();
            }
            if (event.ctrlKey && (event.key === 'y' || (event.shiftKey && event.key === 'z') || event.key === 'Z')) {
                if (isEditing) return;
                event.preventDefault();
                useAppStore.temporal.getState().redo();
            }
            if (event.key === 'Delete' || event.key === 'Backspace') {
                if (isEditing) return;

                const selectedNodes = getNodes().filter((node) => node.selected);
                const selectedEdges = getEdges().filter((edge) => edge.selected);
                if (selectedNodes.length > 0 || selectedEdges.length > 0) {
                    deleteElements({ nodes: selectedNodes, edges: selectedEdges });
                }
            }
            if (event.ctrlKey && event.key === 'c') {
                if (isEditing) return;
                const selectedNodes = getNodes().filter((node) => node.selected);
                if (selectedNodes.length > 0) {
                    copyNodes(selectedNodes.map((n) => n.id));
                }
            }
            if (event.ctrlKey && event.key === 'v') {
                if (isEditing) return;
                const rect = reactFlowWrapper.current?.getBoundingClientRect();
                if (rect) {
                    const pos = screenToFlowPosition({ x: rect.width / 2, y: rect.height / 2 });
                    pasteNodes(pos);
                }
            }
            if (event.ctrlKey && event.key === 's') {
                event.preventDefault();
                downloadProjectFile();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteElements, getNodes, getEdges, copyNodes, pasteNodes, screenToFlowPosition]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow') as NodeType;
            if (!type) return;

            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            addNode(type, position);
        },
        [addNode, screenToFlowPosition]
    );

    // Context menu handlers
    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();
            const selectedNodes = getNodes().filter((n) => n.selected);

            if (selectedNodes.length > 1 && selectedNodes.some((n) => n.id === node.id)) {
                setContextMenu({ x: event.clientX, y: event.clientY, type: 'multi' });
            } else {
                setContextMenu({
                    x: event.clientX,
                    y: event.clientY,
                    type: 'node',
                    nodeId: node.id,
                    nodeType: node.type
                });
            }
        },
        [getNodes]
    );

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY, type: 'edge', edgeId: edge.id });
        },
        []
    );

    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY, type: 'pane' });
        },
        []
    );

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleDelete = useCallback(() => {
        if (!contextMenu) return;

        if (contextMenu.type === 'node' && contextMenu.nodeId) {
            deleteNodes([contextMenu.nodeId]);
        } else if (contextMenu.type === 'multi') {
            const selectedNodes = getNodes().filter((n) => n.selected);
            deleteNodes(selectedNodes.map((n) => n.id));
        }
    }, [contextMenu, deleteNodes, getNodes]);

    const handleCopy = useCallback(() => {
        if (!contextMenu) return;

        if (contextMenu.type === 'node' && contextMenu.nodeId) {
            copyNodes([contextMenu.nodeId]);
        } else if (contextMenu.type === 'multi') {
            const selectedNodes = getNodes().filter((n) => n.selected);
            copyNodes(selectedNodes.map((n) => n.id));
        }
    }, [contextMenu, copyNodes, getNodes]);

    const handleCreateNode = useCallback((type: NodeType) => {
        if (!contextMenu) return;
        const pos = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y });
        addNode(type, pos);
    }, [contextMenu, addNode, screenToFlowPosition]);

    const handleSendToBack = useCallback(() => {
        if (!contextMenu || !contextMenu.nodeId) return;
        setNodeZIndex(contextMenu.nodeId, -10);
    }, [contextMenu, setNodeZIndex]);

    const handleBringToFront = useCallback(() => {
        if (!contextMenu || !contextMenu.nodeId) return;
        setNodeZIndex(contextMenu.nodeId, 10);
    }, [contextMenu, setNodeZIndex]);

    const handleLockNode = useCallback(() => {
        if (!contextMenu || !contextMenu.nodeId) return;
        toggleNodeLock(contextMenu.nodeId, true);
    }, [contextMenu, toggleNodeLock]);

    const handleUnlockNode = useCallback(() => {
        if (!contextMenu || !contextMenu.nodeId) return;
        toggleNodeLock(contextMenu.nodeId, false);
    }, [contextMenu, toggleNodeLock]);

    const contextMenuNode = contextMenu?.nodeId ? nodes.find((n: Node) => n.id === contextMenu.nodeId) : undefined;
    const isNodeLocked = contextMenuNode ? contextMenuNode.draggable === false : false;

    return (
        <div className="flex-1 h-full w-full bg-slate-50 flex flex-col" ref={reactFlowWrapper}>
            <Toolbar />
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeDragStart={() => useAppStore.temporal.getState().pause()}
                    onNodeDragStop={() => {
                        useAppStore.temporal.getState().resume();
                        // Force temporal to record the final dragged state
                        useAppStore.setState(state => ({ nodes: [...state.nodes] }));
                    }}
                    onNodeContextMenu={onNodeContextMenu}
                    onEdgeContextMenu={onEdgeContextMenu}
                    onPaneContextMenu={onPaneContextMenu}
                    onPaneClick={closeContextMenu}
                    deleteKeyCode={null}
                    selectionMode={SelectionMode.Partial}
                    selectionOnDrag
                    panOnScroll
                    zoomOnScroll={false}
                    zoomActivationKeyCode="Control"
                    multiSelectionKeyCode="Shift"
                    minZoom={0.05}
                    fitView
                >
                    <SnapLinesOverlay />
                    <Background color="#94a3b8" gap={16} size={1} />
                    <Controls className="!bg-white !border-slate-200 !shadow-sm [&>button]:!border-slate-100 [&>button]:!text-slate-600 hover:[&>button]:!bg-slate-50" />
                    <MiniMap
                        className="!bg-white !border-slate-200 !shadow-sm !rounded-lg overflow-hidden"
                        maskColor="rgba(241, 245, 249, 0.7)"
                        pannable
                        zoomable
                        nodeColor={(node) => {
                            switch (node.type) {
                                case 'source': return '#3b82f6';
                                case 'factor': return '#10b981';
                                case 'process': return '#8b5cf6';
                                case 'groupBox': return '#6366f1';
                                case 'passthrough': return '#a855f7';
                                case 'dataset': return '#f97316';
                                case 'filter': return '#eab308';
                                case 'tableMath': return '#581c87';
                                case 'transform': return '#0891b2';
                                case 'ghost': return '#64748b';
                                case 'text': return 'transparent';
                                default: return '#cbd5e1';
                            }
                        }}
                    />
                </ReactFlow>

                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        type={contextMenu.type}
                        onClose={closeContextMenu}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                        onCreateNode={handleCreateNode}
                        onSendToBack={contextMenu.type === 'node' ? handleSendToBack : undefined}
                        onBringToFront={contextMenu.type === 'node' ? handleBringToFront : undefined}
                        onLock={contextMenu.type === 'node' ? handleLockNode : undefined}
                        onUnlock={contextMenu.type === 'node' ? handleUnlockNode : undefined}
                        nodeLocked={isNodeLocked}
                        onAlign={contextMenu.type === 'multi' ? alignNodes : undefined}
                    />
                )}
                <GlobalDataModal />
            </div>
        </div>
    );
};

export const Canvas = () => {
    return (
        <ReactFlowProvider>
            <CanvasMain />
        </ReactFlowProvider>
    );
};

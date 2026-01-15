import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
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
import { ContextMenu } from './ContextMenu';
import { GlobalDataModal } from './GlobalDataModal';

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
});

const CanvasMain = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode,
        deleteNodes, copyNodes, pasteNodes, setNodeZIndex
    } = useAppStore(useShallow(selector));
    const { deleteElements, getNodes, getEdges, screenToFlowPosition } = useReactFlow();
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const nodeTypes = useMemo(() => ({
        source: SourceNode,
        factor: FactorNode,
        process: ProcessNode,
        group: GroupNode,
        passthrough: PassThroughNode,
        dataset: DatasetNode,
        filter: FilterNode,
        tableMath: TableMathNode,
        export: ExportNode,
        transform: TransformNode,
    }), []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                useAppStore.temporal.getState().undo();
            }
            if (event.ctrlKey && (event.key === 'y' || (event.shiftKey && event.key === 'z') || event.key === 'Z')) {
                event.preventDefault();
                useAppStore.temporal.getState().redo();
            }
            if (event.key === 'Delete') {
                const selectedNodes = getNodes().filter((node) => node.selected);
                const selectedEdges = getEdges().filter((edge) => edge.selected);
                if (selectedNodes.length > 0 || selectedEdges.length > 0) {
                    deleteElements({ nodes: selectedNodes, edges: selectedEdges });
                }
            }
            if (event.ctrlKey && event.key === 'c') {
                const selectedNodes = getNodes().filter((node) => node.selected);
                if (selectedNodes.length > 0) {
                    copyNodes(selectedNodes.map((n) => n.id));
                }
            }
            if (event.ctrlKey && event.key === 'v') {
                const rect = reactFlowWrapper.current?.getBoundingClientRect();
                if (rect) {
                    const pos = screenToFlowPosition({ x: rect.width / 2, y: rect.height / 2 });
                    pasteNodes(pos);
                }
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

    return (
        <div className="flex-1 h-full w-full bg-slate-50" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeContextMenu={onNodeContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
                onPaneClick={closeContextMenu}
                deleteKeyCode={['Backspace', 'Delete']}
                selectionMode={SelectionMode.Partial}
                selectionOnDrag
                panOnScroll
                zoomOnScroll={false}
                zoomActivationKeyCode="Control"
                fitView
            >
                <Background color="#94a3b8" gap={16} size={1} />
                <Controls className="!bg-white !border-slate-200 !shadow-sm [&>button]:!border-slate-100 [&>button]:!text-slate-600 hover:[&>button]:!bg-slate-50" />
                <MiniMap
                    className="!bg-white !border-slate-200 !shadow-sm !rounded-lg overflow-hidden"
                    maskColor="rgba(241, 245, 249, 0.7)"
                    nodeColor={(node) => {
                        switch (node.type) {
                            case 'source': return '#3b82f6';
                            case 'factor': return '#10b981';
                            case 'process': return '#8b5cf6';
                            case 'group': return '#6366f1';
                            case 'passthrough': return '#a855f7';
                            case 'dataset': return '#f97316';
                            case 'filter': return '#eab308';
                            case 'tableMath': return '#581c87';
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
                />
            )}
            <GlobalDataModal />
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

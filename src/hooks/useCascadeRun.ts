import { useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import { useBatchDataStore } from '../store/useBatchDataStore';

/**
 * Hook that watches for a batch node's calculation to complete (SUCCESS),
 * then automatically triggers downstream batch nodes to re-run.
 * 
 * This creates a cascade effect: Run Node A → auto-runs Node B → auto-runs Node C...
 */
export function useCascadeRun(nodeId: string) {
    const { getEdges, getNodes } = useReactFlow();
    const prevStatusRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        // Subscribe to batch data store changes
        const unsub = useBatchDataStore.subscribe((state) => {
            const nodeData = state.nodes[nodeId];
            const currentStatus = nodeData?.status;
            const prevStatus = prevStatusRef.current;

            // Detect transition to SUCCESS
            if (prevStatus === 'CALCULATING' && currentStatus === 'SUCCESS') {
                // Small delay to let React re-render, then cascade
                setTimeout(() => triggerDownstream(nodeId, getEdges, getNodes), 200);
            }

            prevStatusRef.current = currentStatus;
        });

        return unsub;
    }, [nodeId, getEdges, getNodes]);
}

/**
 * Find downstream batch-processing nodes and trigger their runs.
 */
function triggerDownstream(
    nodeId: string,
    getEdges: () => any[],
    getNodes: () => any[]
) {
    const edges = getEdges();
    const allNodes = getNodes();

    // Find edges where this node is the source
    const downstreamEdges = edges.filter(e => e.source === nodeId);

    for (const edge of downstreamEdges) {
        const targetNode = allNodes.find(n => n.id === edge.target);
        if (!targetNode) continue;

        const nodeType = targetNode.data?.type || targetNode.type;

        // Only cascade to batch-processing nodes
        if (nodeType === 'tableMath' || nodeType === 'filter' || nodeType === 'transform' || nodeType === 'join') {
            runNodeByType(targetNode, edges, allNodes);
        }
    }
}

/**
 * Programmatically run a batch node based on its type.
 */
function runNodeByType(node: any, edges: any[], allNodes: any[]) {
    const { runMath, runFilter, runTransform, executeJoinNode } = useBatchDataStore.getState();
    const data = node.data;

    // Find source node for this target
    const incomingEdge = edges.find(e => e.target === node.id);
    if (!incomingEdge) return;

    const sourceNodeId = incomingEdge.source;
    const nodeType = data?.type || node.type;

    if (nodeType === 'tableMath') {
        if (!data.formula || !data.newColumnName) return;

        // Build scalar inputs from connected scalar sources
        const connectedEdges = edges.filter(e => e.target === node.id);
        const scalarInputs: Record<string, { value: number; unit: string }> = {};
        let batchSourceId = '';

        for (const ce of connectedEdges) {
            const srcNode = allNodes.find(n => n.id === ce.source);
            if (!srcNode) continue;

            const srcType = srcNode.data?.type || srcNode.type;

            if (srcType === 'source' || srcType === 'factor' || srcType === 'process') {
                // Scalar source
                const scalarValue = srcType === 'process'
                    ? (parseFloat(String(srcNode.data?.calculatedValue)) || 0)
                    : (srcNode.data?.value ?? 0);
                const scalarUnit = srcType === 'process'
                    ? (srcNode.data?.resultUnit || '')
                    : (srcNode.data?.unit || '');
                scalarInputs[srcNode.data?.label || 'Scalar'] = { value: scalarValue, unit: scalarUnit };
            } else {
                // Batch source – use first one found
                if (!batchSourceId) batchSourceId = ce.source;
            }
        }

        if (batchSourceId) {
            runMath(node.id, batchSourceId, data.formula, data.newColumnName, scalarInputs, data.unitOverride);
        }
    } else if (nodeType === 'filter') {
        if (data.column && data.operator && data.value !== undefined) {
            const criteria = {
                column: data.column,
                operator: data.operator,
                value: data.value,
                mode: data.mode || 'value'
            };
            runFilter(node.id, sourceNodeId, criteria);
        }
    } else if (nodeType === 'transform') {
        if (data.operations && data.operations.length > 0) {
            runTransform(node.id, sourceNodeId, data.operations);
        }
    } else if (nodeType === 'join') {
        executeJoinNode(node.id);
    }
}

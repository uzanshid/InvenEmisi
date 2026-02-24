import { useAppStore } from '../store/useAppStore';
import { useBatchDataStore } from '../store/useBatchDataStore';


export const generateAIReportPayload = (exportNodeId: string) => {
    const { nodes, edges } = useAppStore.getState();
    const batchDataStore = useBatchDataStore.getState();

    // 1. Trace-back to find all ancestors
    const ancestors = new Set<string>();
    const queue = [exportNodeId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const incomingEdges = edges.filter(e => e.target === currentId);
        for (const edge of incomingEdges) {
            if (!ancestors.has(edge.source)) {
                ancestors.add(edge.source);
                queue.push(edge.source);
            }
        }
    }

    // Include the nodes based on ancestors set
    const subgraphNodes = nodes.filter(n => ancestors.has(n.id));

    // 2. Topological Sort
    // Calculate in-degree for subgraph nodes
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};

    subgraphNodes.forEach(n => {
        inDegree[n.id] = 0;
        adjList[n.id] = [];
    });

    // Only consider edges within the subgraph
    edges.forEach(e => {
        if (ancestors.has(e.source) && ancestors.has(e.target)) {
            adjList[e.source].push(e.target);
            inDegree[e.target] = (inDegree[e.target] || 0) + 1;
        }
    });

    const topoQueue: string[] = [];
    Object.keys(inDegree).forEach(id => {
        if (inDegree[id] === 0) {
            topoQueue.push(id);
        }
    });

    const sortedNodeIds: string[] = [];
    while (topoQueue.length > 0) {
        const current = topoQueue.shift()!;
        sortedNodeIds.push(current);

        adjList[current].forEach(neighbor => {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                topoQueue.push(neighbor);
            }
        });
    }

    // 3. Calculation Pipeline Construction & Ghost Node Bypassing
    const calculation_pipeline: any[] = [];
    let step_order = 1;

    // Filter out UI-only routing nodes: 'ghost', 'passthrough', 'groupBox'
    const ignoredTypes = ['ghost', 'passthrough', 'groupBox'];

    sortedNodeIds.forEach(id => {
        const node = subgraphNodes.find(n => n.id === id);
        if (!node || ignoredTypes.includes(node.data.type)) {
            return;
        }

        // Extract formula/operation depending on type
        let operation = '';
        if (node.data.type === 'process') {
            operation = (node.data as any).formula || '';
        } else if (node.data.type === 'tableMath') {
            operation = (node.data as any).formula || '';
        } else if (node.data.type === 'filter') {
            operation = `${(node.data as any).column} ${(node.data as any).operator} ${(node.data as any).value}`;
        } else if (node.data.type === 'transform') {
            const ops = (node.data as any).operations || [];
            operation = ops.map((o: any) => o.type).join(', ');
        } else if (node.data.type === 'factor') {
            operation = `Factor Value: ${(node.data as any).value} ${(node.data as any).unit}`;
        } else if (node.data.type === 'source') {
            operation = `Source Value: ${(node.data as any).value} ${(node.data as any).unit}`;
        }

        calculation_pipeline.push({
            step_order: step_order++,
            node_title: node.data.label || 'Unnamed Node',
            node_type: node.data.type,
            formula: operation,
            user_notes: (node.data as any).note || ''
        });
    });

    // 4. Tabular Data Injection
    // The node exactly before the export node is the one providing tabular data
    // Assuming the export node only has 1 incoming edge typically
    const targetEdge = edges.find(e => e.target === exportNodeId);
    const sourceNodeIdBeforeExport = targetEdge?.source;

    let final_tabular_results = {};

    if (sourceNodeIdBeforeExport) {
        const sourceData = batchDataStore.getNodeData(sourceNodeIdBeforeExport);
        const appSourceNode = nodes.find(n => n.id === sourceNodeIdBeforeExport);
        if (sourceData && sourceData.rawData) {
            // newly calculated columns: find any columns created by operations in the pipeline
            // for simplicity, we can just say the columns of the immediate preceding node not in the initial dataset
            // OR we just use the last TableMath node's generated columns in the pipeline.
            const newly_calculated_columns: string[] = [];

            // To find newly calculated columns, let's look at all tableMath nodes
            subgraphNodes.forEach(n => {
                if (n.data.type === 'tableMath' && (n.data as any).newColumnName) {
                    newly_calculated_columns.push((n.data as any).newColumnName);
                }
            });

            final_tabular_results = {
                node_source: appSourceNode?.data.label || 'Unknown',
                newly_calculated_columns: newly_calculated_columns,
                data_rows: sourceData.rawData
            };
        }
    }

    // 5. Final JSON
    const payload = {
        _ai_system_context: "Anda adalah Ahli Inventarisasi Emisi (IE) dan Auditor Lingkungan berstandar internasional. Data ini dihasilkan dari 'InvenEmisi', sebuah aplikasi perhitungan emisi berbasis Visual Node. Setiap langkah merepresentasikan sumber data, faktor emisi, atau transformasi matematika.",
        _ai_task_instruction: "Buatlah Laporan Inventarisasi Emisi naratif dan profesional. 1. Gunakan 'calculation_pipeline' untuk menjelaskan metodologi dan rumus yang digunakan. 2. Perhatikan 'user_notes' untuk justifikasi asumsi. 3. Analisis 'final_tabular_results' menggunakan Python/Data Analysis tool Anda, fokus pada 'newly_calculated_columns' untuk menyajikan hasil emisi total dan insight utama. Jangan sebutkan ID Node teknis.",
        project_metadata: {
            title: "InvenEmisi Project",
            export_date: new Date().toISOString()
        },
        calculation_pipeline: calculation_pipeline,
        final_tabular_results: final_tabular_results
    };

    return payload;
};

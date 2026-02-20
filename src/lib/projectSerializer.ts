import { useAppStore } from '../store/useAppStore';
import { useBatchDataStore } from '../store/useBatchDataStore';
import { useProjectStore } from '../store/useProjectStore';

// ------- Schema version -------
const SCHEMA_VERSION = '1.0';

// ------- Interfaces -------
export interface ProjectFile {
    meta: {
        projectName: string;
        version: string;
        lastModified: string;
    };
    graph: {
        nodes: any[];
        edges: any[];
    };
    batchData: {
        nodes: Record<string, any>;
    };
}

// ------- Serialize -------
export function serializeProject(): ProjectFile {
    const { nodes, edges } = useAppStore.getState();
    const batchNodes = useBatchDataStore.getState().nodes;
    const { projectName } = useProjectStore.getState();

    return {
        meta: {
            projectName,
            version: SCHEMA_VERSION,
            lastModified: new Date().toISOString(),
        },
        graph: {
            nodes: JSON.parse(JSON.stringify(nodes)), // deep clone to strip reactflow internals
            edges: JSON.parse(JSON.stringify(edges)),
        },
        batchData: {
            nodes: JSON.parse(JSON.stringify(batchNodes)),
        },
    };
}

// ------- Validate -------
function validateProjectFile(data: any): data is ProjectFile {
    if (!data || typeof data !== 'object') return false;
    if (!data.meta || typeof data.meta.projectName !== 'string') return false;
    if (!data.meta.version || typeof data.meta.version !== 'string') return false;
    if (!data.graph || !Array.isArray(data.graph.nodes) || !Array.isArray(data.graph.edges)) return false;
    if (!data.batchData || typeof data.batchData.nodes !== 'object') return false;
    return true;
}

// ------- Deserialize / Hydrate -------
export function deserializeProject(data: any): { success: boolean; error?: string } {
    if (!validateProjectFile(data)) {
        return { success: false, error: 'Invalid project file: missing or malformed required fields.' };
    }

    try {
        // Hydrate visual graph store
        useAppStore.setState({
            nodes: data.graph.nodes,
            edges: data.graph.edges,
            clipboard: [],
        });

        // Hydrate batch data store
        useBatchDataStore.setState({
            nodes: data.batchData.nodes,
        });

        // Hydrate project metadata
        useProjectStore.setState({
            projectName: data.meta.projectName,
            lastModified: data.meta.lastModified,
        });

        return { success: true };
    } catch (err: any) {
        return { success: false, error: `Hydration failed: ${err.message || err}` };
    }
}

// ------- Download -------
export function downloadProjectFile(projectName?: string): void {
    const project = serializeProject();
    const name = (projectName || project.meta.projectName || 'project')
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .replace(/\s+/g, '_');

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.inven`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Update last modified
    useProjectStore.setState({ lastModified: project.meta.lastModified });

    // Add to recent projects
    useProjectStore.getState().addRecentProject(project.meta.projectName);
}

// ------- Import -------
export function importProjectFile(file: File): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                const result = deserializeProject(data);

                if (result.success) {
                    // Add to recent projects
                    useProjectStore.getState().addRecentProject(data.meta.projectName);
                }

                resolve(result);
            } catch (err: any) {
                resolve({ success: false, error: `Failed to parse file: ${err.message || err}` });
            }
        };
        reader.onerror = () => {
            resolve({ success: false, error: 'Failed to read file.' });
        };
        reader.readAsText(file);
    });
}

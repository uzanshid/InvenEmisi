import { create } from 'zustand';

const STORAGE_KEY = 'invenemisi_recent_projects';
const MAX_RECENT = 10;

export interface RecentProject {
    name: string;
    date: string;
}

interface ProjectState {
    projectName: string;
    lastModified: string | null;
    version: string;
    showWelcome: boolean;
    recentProjects: RecentProject[];

    // Actions
    setProjectName: (name: string) => void;
    setShowWelcome: (show: boolean) => void;
    addRecentProject: (name: string) => void;
    loadRecentProjects: () => void;
    resetProject: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projectName: 'Untitled Project',
    lastModified: null,
    version: '1.0',
    showWelcome: true,
    recentProjects: [],

    setProjectName: (name) => set({ projectName: name }),

    setShowWelcome: (show) => set({ showWelcome: show }),

    addRecentProject: (name) => {
        const current = get().recentProjects;
        // Remove duplicate if exists
        const filtered = current.filter(p => p.name !== name);
        const updated = [
            { name, date: new Date().toISOString() },
            ...filtered,
        ].slice(0, MAX_RECENT);

        set({ recentProjects: updated });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch { /* localStorage full or unavailable */ }
    },

    loadRecentProjects: () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as RecentProject[];
                set({ recentProjects: parsed });
            }
        } catch { /* ignore */ }
    },

    resetProject: () => set({
        projectName: 'Untitled Project',
        lastModified: null,
    }),
}));

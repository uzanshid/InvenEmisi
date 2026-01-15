import { create } from 'zustand';

interface BatchVisualState {
    isModalOpen: boolean;
    activeNodeId: string | null;

    openModal: (nodeId: string) => void;
    closeModal: () => void;
}

export const useBatchVisualStore = create<BatchVisualState>((set) => ({
    isModalOpen: false,
    activeNodeId: null,

    openModal: (nodeId) => set({ isModalOpen: true, activeNodeId: nodeId }),
    closeModal: () => set({ isModalOpen: false, activeNodeId: null }),
}));

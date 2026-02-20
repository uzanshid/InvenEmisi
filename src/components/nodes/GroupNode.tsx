import React, { memo, useCallback, useRef } from 'react';
import type { NodeProps } from 'reactflow';
import { Layers } from 'lucide-react';
import type { GroupNodeData } from '../../types';
import { useAppStore } from '../../store/useAppStore';

/**
 * A single resize corner dot.
 * Uses pure DOM mouse events to resize the node — no React Flow NodeResizer needed.
 */
const CornerHandle: React.FC<{
    position: 'nw' | 'ne' | 'sw' | 'se';
    color: string;
    nodeId: string;
}> = ({ position, color, nodeId }) => {
    const handleRef = useRef<HTMLDivElement>(null);

    const cursorMap = { nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize' };
    const posStyle: React.CSSProperties = {
        position: 'absolute',
        width: 10, height: 10,
        backgroundColor: color,
        border: '2px solid white',
        borderRadius: 3,
        zIndex: 20,
        cursor: cursorMap[position],
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        ...(position[0] === 'n' ? { top: -5 } : { bottom: -5 }),
        ...(position[1] === 'w' ? { left: -5 } : { right: -5 }),
    };

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const el = handleRef.current;
        if (!el) return;

        // Capture pointer for smooth dragging
        el.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;

        // Read current node dimensions from store
        const store = useAppStore.getState();
        const node = store.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const startW = (node.style?.width as number) || node.width || 300;
        const startH = (node.style?.height as number) || node.height || 200;
        const startPosX = node.position.x;
        const startPosY = node.position.y;

        // Detect zoom from viewport transform
        const viewport = el.closest('.react-flow__viewport') as HTMLElement | null;
        const zoom = viewport
            ? parseFloat(viewport.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || '1')
            : 1;

        const onPointerMove = (ev: PointerEvent) => {
            const dx = (ev.clientX - startX) / zoom;
            const dy = (ev.clientY - startY) / zoom;

            let newW = startW;
            let newH = startH;
            let newX = startPosX;
            let newY = startPosY;

            if (position[1] === 'e') newW = Math.max(200, startW + dx);
            if (position[1] === 'w') { newW = Math.max(200, startW - dx); newX = startPosX + startW - newW; }
            if (position[0] === 's') newH = Math.max(150, startH + dy);
            if (position[0] === 'n') { newH = Math.max(150, startH - dy); newY = startPosY + startH - newH; }

            // Directly update the zustand store
            useAppStore.setState((state) => ({
                nodes: state.nodes.map(n =>
                    n.id === nodeId
                        ? { ...n, position: { x: newX, y: newY }, style: { ...n.style, width: newW, height: newH } }
                        : n
                ),
            }));
        };

        const onPointerUp = () => {
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
        };

        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
    }, [nodeId, position]);

    return <div ref={handleRef} style={posStyle} onPointerDown={onPointerDown} />;
};

const GroupNode: React.FC<NodeProps<GroupNodeData>> = ({ id, data, selected }) => {
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const color = data.color || '#6366f1';

    return (
        <div
            className="w-full h-full rounded-xl"
            style={{
                border: `2px dashed ${color}`,
                backgroundColor: `${color}10`,
                minWidth: 200,
                minHeight: 150,
                position: 'relative',
            }}
            tabIndex={-1}
        >
            {/* Corner resize dots — only when selected */}
            {selected && (
                <>
                    <CornerHandle position="nw" color={color} nodeId={id} />
                    <CornerHandle position="ne" color={color} nodeId={id} />
                    <CornerHandle position="sw" color={color} nodeId={id} />
                    <CornerHandle position="se" color={color} nodeId={id} />
                </>
            )}

            {/* Header bar */}
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-t-[10px]"
                style={{ backgroundColor: `${color}20` }}
            >
                <Layers size={16} style={{ color }} />
                <input
                    type="text"
                    value={data.label}
                    onChange={(e) => updateNodeData(id, { label: e.target.value })}
                    className="flex-1 bg-transparent text-base font-bold outline-none"
                    style={{ color }}
                    placeholder="Group Name"
                />
                <input
                    type="color"
                    value={color}
                    onChange={(e) => updateNodeData(id, { color: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0"
                    title="Pick color"
                />
            </div>
        </div>
    );
};

export default memo(GroupNode);

import React, { memo } from 'react';
import { NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Layers } from 'lucide-react';
import type { GroupNodeData } from '../../types';
import { useAppStore } from '../../store/useAppStore';

const GroupNode: React.FC<NodeProps<GroupNodeData>> = ({ id, data, selected }) => {
    const updateNodeData = useAppStore((state) => state.updateNodeData);
    const color = data.color || '#6366f1'; // Default indigo

    return (
        <>
            <NodeResizer
                minWidth={200}
                minHeight={150}
                isVisible={selected}
                lineClassName="!border-indigo-400"
                handleClassName="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
            />
            <div
                className="w-full h-full rounded-xl border-2 border-dashed"
                style={{
                    borderColor: color,
                    backgroundColor: `${color}10`,
                    minWidth: 200,
                    minHeight: 150,
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <Layers size={16} style={{ color }} />
                    <input
                        type="text"
                        value={data.label}
                        onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        className="flex-1 bg-transparent text-sm font-semibold outline-none"
                        style={{ color }}
                        placeholder="Group Name"
                    />
                    {/* Color picker */}
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => updateNodeData(id, { color: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border-0"
                        title="Pick color"
                    />
                </div>
            </div>
        </>
    );
};

export default memo(GroupNode);

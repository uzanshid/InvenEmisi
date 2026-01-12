import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { ArrowRight } from 'lucide-react';
import type { PassThroughNodeData } from '../../types';
import { useAppStore } from '../../store/useAppStore';

const PassThroughNode: React.FC<NodeProps<PassThroughNodeData>> = ({ id, data, selected }) => {
    const updateNodeData = useAppStore((state) => state.updateNodeData);

    // Display calculated value if available
    const displayValue = data.calculatedValue
        ? String(data.calculatedValue)
        : '—';

    return (
        <div
            className={`px-4 py-2 rounded-full border-2 bg-white shadow-md flex items-center gap-2 min-w-[100px] ${selected ? 'ring-2 ring-purple-500 ring-offset-2 border-purple-400' : 'border-slate-300'
                }`}
        >
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                id={data.inputs[0]?.id}
                className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white hover:!bg-purple-600"
                style={{ left: -6 }}
            />

            {/* Content */}
            <input
                type="text"
                value={data.label}
                onChange={(e) => updateNodeData(id, { label: e.target.value })}
                className="w-16 bg-transparent text-xs font-medium text-slate-600 outline-none text-center"
                placeholder="Pass"
            />
            <ArrowRight size={14} className="text-purple-400" />
            <span className="text-xs font-mono text-purple-600 truncate max-w-[60px]">
                {displayValue}
            </span>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id={data.outputs[0]?.id}
                className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white hover:!bg-purple-600"
                style={{ right: -6 }}
            />
        </div>
    );
};

export default memo(PassThroughNode);

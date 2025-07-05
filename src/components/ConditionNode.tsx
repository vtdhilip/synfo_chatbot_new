// src/components/ConditionNode.tsx

import { Handle, Position, NodeProps } from 'reactflow';
import { GitFork } from 'lucide-react'; // A fitting icon for branching

const ConditionNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-white border-2 border-amber-500 rounded-lg shadow-lg w-64">
      {/* Node Header */}
      <div className="bg-amber-500 text-white p-2 rounded-t-lg flex items-center">
        <GitFork className="w-4 h-4 mr-2" />
        <span className="text-sm font-bold">Condition: If/Else</span>
      </div>

      {/* Node Body */}
      <div className="p-3">
        <p className="text-gray-800 text-sm">
          If user message contains:
        </p>
        <p className="text-gray-900 text-sm font-semibold bg-amber-100 p-1 rounded mt-1">
          "{data.keyword || '...'}"
        </p>
      </div>

      {/* One input handle on the left */}
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      
      {/* Two output handles on the right */}
      <Handle
        type="source"
        position={Position.Right}
        id="true" // Unique ID for the 'true' path
        style={{ top: '35%' }}
        className="!bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false" // Unique ID for the 'false' path
        style={{ top: '65%' }}
        className="!bg-red-500"
      />
    </div>
  );
};

export default ConditionNode;
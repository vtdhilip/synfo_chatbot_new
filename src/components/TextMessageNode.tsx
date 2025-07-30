// src/components/TextMessageNode.tsx

import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquareText } from 'lucide-react'; // Using an icon from lucide-react

// NodeProps is a type from React Flow that contains all the properties of a node
const TextMessageNode = ({ data }: NodeProps) => {
  return (
    // This is the main container for our custom node
    <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg w-64">
      {/* Node Header */}
      <div className="bg-blue-500 text-white p-2 rounded-t-lg flex items-center">
        <MessageSquareText className="w-4 h-4 mr-2" />
        <span className="text-sm font-bold">Send Message</span>
      </div>

      {/* Node Body */}
      <div className="p-3">
        <p className="text-gray-700 text-sm">{data.label}</p>
      </div>

      {/* Connection Handles */}
      {/* These are the dots where you can connect edges from/to */}
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
};

export default TextMessageNode;
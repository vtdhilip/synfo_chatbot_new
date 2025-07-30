import { Handle, Position, NodeProps } from 'reactflow';
import { HelpCircle } from 'lucide-react'; // Icon for asking a question

const QuestionNode = ({ data }: NodeProps) => {
  return (
    // Main container for the custom node
    <div className="bg-white border-2 border-purple-500 rounded-lg shadow-lg w-64">
      {/* Node Header */}
      <div className="bg-purple-500 text-white p-2 rounded-t-lg flex items-center">
        <HelpCircle className="w-4 h-4 mr-2" />
        <span className="text-sm font-bold">Ask a Question</span>
      </div>

      {/* Node Body */}
      <div className="p-3">
        <p className="text-gray-700 text-sm">{data.label || 'Enter your question...'}</p>
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
};

export default QuestionNode;
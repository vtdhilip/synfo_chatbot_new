import { Handle, Position, NodeProps } from 'reactflow';
import { MessageCircleQuestion } from 'lucide-react';

const ButtonQuestionNode = ({ data }: NodeProps) => {
  // Safely get the buttons array, default to empty if it doesn't exist
  const buttons = data.buttons || [];

  return (
    <div className="bg-white border-2 border-teal-500 rounded-lg shadow-lg w-64">
      {/* Node Header */}
      <div className="bg-teal-500 text-white p-2 rounded-t-lg flex items-center">
        <MessageCircleQuestion className="w-4 h-4 mr-2" />
        <span className="text-sm font-bold">Ask with Buttons</span>
      </div>

      {/* Node Body */}
      <div className="p-3">
        <p className="text-gray-700 text-sm mb-2">{data.label || 'Enter your question...'}</p>
        
        {/* Display the buttons defined for this node */}
        <div className="flex flex-wrap gap-2">
          {buttons.map((buttonText: string, index: number) => (
            <div key={index} className="bg-teal-100 text-teal-800 text-xs font-semibold px-2 py-1 rounded-full">
              {buttonText}
            </div>
          ))}
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      {/* This node's logic branches based on the user's text reply, so it often won't need a source handle, but we include one for linear flows. */}
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
};
export default ButtonQuestionNode;
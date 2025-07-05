
// src/components/ChatFlowEditor.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  MarkerType, // Import MarkerType for arrowheads
} from 'reactflow';

import 'reactflow/dist/style.css';
import TextMessageNode from './TextMessageNode';
import ConditionNode from './ConditionNode';
import QuestionNode from './QuestionNode';
import ButtonQuestionNode from './ButtonQuestionNode';
import { BrainCircuit, MessageSquareText, GitFork, HelpCircle, MessageCircleQuestion } from 'lucide-react';

interface ChatFlowEditorProps {
  clientId: string | null;
  initialFlow?: { nodes: Node[], edges: Edge[] };
}

let id_counter = 2;
const getNextId = () => `${id_counter++}`;

// --- n8n-style Edge Configuration ---
// Define default options for all edges to make them thicker, curved, and animated
const defaultEdgeOptions = {
  style: { strokeWidth: 3, stroke: '#9ca3af' }, // Thicker, gray lines
  type: 'smoothstep', // Curved lines
  animated: true, // Animated flow
  markerEnd: {
    type: MarkerType.ArrowClosed, // Add an arrowhead
    color: '#9ca3af',
  },
};

const ChatFlowEditor: React.FC<ChatFlowEditorProps> = ({ clientId, initialFlow }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    // ... (useEffect logic remains the same)
    const startNode: Node = { id: '1', type: 'input', data: { label: 'Start Flow' }, position: { x: 250, y: 5 } };
    if (initialFlow && initialFlow.nodes) {
        setNodes(initialFlow.nodes);
        setEdges(initialFlow.edges);
        id_counter = initialFlow.nodes.reduce((maxId, node) => Math.max(maxId, parseInt(node.id, 10) || 0), 0) + 2;
    } else {
        setNodes([startNode]);
        setEdges([]);
    }
    setSelectedNode(null);
  }, [clientId, initialFlow, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({
    textMessage: TextMessageNode,
    condition: ConditionNode,
    question: QuestionNode,
    buttonQuestion: ButtonQuestionNode,
  }), []);

  const updateNodeData = (nodeId: string, newData: object) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
    setSelectedNode((node) => node ? { ...node, data: { ...node.data, ...newData } } : null);
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onAddNode = (type: string) => {
    // ... (onAddNode logic remains the same)
    let newNodeData: object;
    switch (type) {
      case 'question': newNodeData = { label: 'Ask a question...' }; break;
      case 'condition': newNodeData = { keyword: 'example' }; break;
      case 'buttonQuestion': newNodeData = { label: 'Ask with buttons...', buttons: ['Option 1', 'Option 2'] }; break;
      default: newNodeData = { label: 'New text message...' };
    }
    const newNode: Node = {
      id: getNextId(), type, data: newNodeData,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    setNodes((nds) => nds.concat(newNode));
  };
  
  const onSave = async () => {
    // ... (onSave logic remains the same)
    if (!clientId) return alert("No client selected.");
    try {
      await updateDoc(doc(db, 'clients', clientId), { flow: { nodes, edges } });
      alert(`Flow saved successfully!`);
    } catch (error) {
      console.error("Error saving flow:", error);
      alert("Failed to save flow.");
    }
  };

  if (!clientId) {
    return (
        <div className="text-center p-10 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
            <BrainCircuit className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Client Selected</h3>
            <p className="mt-1 text-sm text-gray-500">Please select a client from the list to view or edit their chatflow.</p>
        </div>
    );
  }

  return (
    // Use modern gray tones for the container
    <div className="flex h-[80vh] bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex-grow rounded-l-lg relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges])}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedNode(null)}
          fitView
          defaultEdgeOptions={defaultEdgeOptions} // 👈 Pass the new edge styles here
        >
          <Background color="#e2e8f0" gap={16} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>

      {/* Use modern gray tones for the sidebar */}
      <div className="w-72 p-4 border-l border-gray-200 flex flex-col bg-slate-50">
        {/* ... (Sidebar JSX remains the same) ... */}
        <h3 className="text-lg font-semibold text-center text-gray-800 mb-4">Editor Controls</h3>
        <div className="flex flex-col space-y-2">
            <button onClick={() => onAddNode('textMessage')} className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                <MessageSquareText className="w-4 h-4 mr-2" /> Add Message
            </button>
            <button onClick={() => onAddNode('question')} className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                <HelpCircle className="w-4 h-4 mr-2" /> Add Question
            </button>
            <button onClick={() => onAddNode('buttonQuestion')} className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                <MessageCircleQuestion className="w-4 h-4 mr-2" /> Add Button Question
            </button>
            <button onClick={() => onAddNode('condition')} className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                <GitFork className="w-4 h-4 mr-2" /> Add Condition
            </button>
        </div>
        <hr className="my-4" />
        <div className="flex-grow overflow-y-auto pr-2">
            {selectedNode ? (
                <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-700">Edit: {selectedNode.type}</h4>
            
            {(selectedNode.type === 'textMessage' || selectedNode.type === 'question') && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Text:</label>
                <textarea
                  value={selectedNode.data.label}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {selectedNode.type === 'condition' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Keyword:</label>
                <input
                  type="text"
                  value={selectedNode.data.keyword}
                  onChange={(e) => updateNodeData(selectedNode.id, { keyword: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {selectedNode.type === 'buttonQuestion' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Question Text:</label>
                <textarea
                  value={selectedNode.data.label}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <label className="block text-sm font-medium text-gray-600 mb-1">Buttons (one per line):</label>
                <textarea
                  value={(selectedNode.data.buttons || []).join('\n')}
                  onChange={(e) => updateNodeData(selectedNode.id, { buttons: e.target.value.split('\n') })}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

                </div>
            ) : (
                <div className="text-center text-sm text-gray-500 mt-10">
                    <p>Click a node on the canvas to edit its properties here.</p>
                </div>
            )}
        </div>
        <button onClick={onSave} className="mt-4 w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Save Flow
        </button>
      </div>
    </div>
  );
};

export default ChatFlowEditor;
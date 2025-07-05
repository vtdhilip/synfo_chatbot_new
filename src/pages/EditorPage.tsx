// src/pages/EditorPage.tsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // 👈 1. Import 'updateDoc'
import { db } from '../firebase';
import { type Account } from './Index';
import ChatFlowEditor from '../components/ChatFlowEditor'; // Using relative paths
import InstaDMeditor from '../components/InstaDMeditor'; // Using relative paths
import { ArrowLeft } from 'lucide-react';
import { Node, Edge } from 'reactflow'; // Import Node/Edge types for the 'onSave' prop

const EditorPage = () => {
  // 2. Consolidate into a single useParams call
  const { accountId, flowType } = useParams<{ accountId: string; flowType: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  // This useEffect fetches the account data
  useEffect(() => {
    if (!accountId) return;
    const fetchAccount = async () => {
      setLoading(true);
      const accountDocRef = doc(db, 'clients', accountId);
      const docSnap = await getDoc(accountDocRef);
      if (docSnap.exists()) {
        setAccount({ ...docSnap.data(), id: docSnap.id } as Account);
      } else {
        console.error("No such account found!");
      }
      setLoading(false);
    };
    fetchAccount();
  }, [accountId]);

  // This function saves data for ANY type of editor
  const handleSave = async (dataToSave: object) => {
    if (!accountId || !flowType) return;
    
    // The field name in Firestore will be e.g., 'dmAutomation', 'commentFlow'
    const fieldName = `${flowType}Automation`; 

    try {
      const accountDocRef = doc(db, 'clients', accountId);
      await updateDoc(accountDocRef, { [fieldName]: dataToSave });
      alert(`${flowType} automation saved successfully!`);
    } catch (error) {
      console.error("Error saving automation:", error);
      alert("Failed to save automation.");
    }
  };

  if (loading) {
    return <div className="text-center p-10">Loading Editor...</div>;
  }
  if (!account) {
    return <div className="text-center p-10">Account not found.</div>;
  }

  // Determine which flow data to pass to the advanced editor
  const initialFlowData = account[`${flowType}Flow` as keyof Account] as { nodes: Node[], edges: Edge[] } | undefined;
  const platformName = flowType ? flowType.charAt(0).toUpperCase() + flowType.slice(1) : 'Flow';

  return (
    <div className="container mx-auto p-8">
      <Link to={`/dashboard/${accountId}`} className="inline-flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-4">
        {platformName} Automation for {account.clientName}
      </h1>

      {/* Conditionally render the correct editor */}
      {flowType === 'dm' ? (
        <InstaDMeditor 
          account={account} 
          onSave={handleSave} 
        />
      ) : (
        <ChatFlowEditor
          clientId={account.id}
          initialFlow={initialFlowData}
          // 3. Add explicit types to the 'onSave' prop function
         
        />
      )}
    </div>
  );
};

export default EditorPage;
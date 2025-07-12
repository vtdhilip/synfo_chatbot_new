// src/pages/EditorPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft } from 'lucide-react';
import { Account, SimpleKeywordAutomation, CommentAutomation } from '../types';
import SimpleDmEditor from '../components/InstaDMeditor';
import CommentAutomationEditor from '../components/CommentAutomationEditor';

// Union type for all possible automation data structures
type AutomationData = SimpleKeywordAutomation | CommentAutomation;

const EditorPage: React.FC = () => {
  const { accountId, automationType, automationId } = useParams<{ accountId: string; automationType: 'dm' | 'comment'; automationId?: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    const accountDocRef = doc(db, 'clients', accountId);
    
    const unsubscribe = onSnapshot(accountDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAccount({ ...docSnap.data(), id: docSnap.id } as Account);
      } else {
        console.error("No such account found!");
        setAccount(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [accountId]);

  // Consolidated function to handle saving any type of automation data
  const handleSaveAutomation = async (dataToSave: AutomationData) => {
    if (!accountId || !account) return;

    const fieldName = automationType === 'dm' ? 'dmAutomations' : 'commentAutomations';
    const currentAutomations = account[fieldName] || [];

    const isEditing = currentAutomations.some((auto: AutomationData) => auto.id === dataToSave.id);
    let updatedAutomations;

    if (isEditing) {
      // Update existing automation
      updatedAutomations = currentAutomations.map((auto: AutomationData) => 
        auto.id === dataToSave.id ? dataToSave : auto
      );
    } else {
      // Add new automation
      updatedAutomations = [...currentAutomations, dataToSave];
    }

    try {
      await updateDoc(doc(db, 'clients', accountId), {
        [fieldName]: updatedAutomations
      });
      // Navigate back to the list page after saving
      navigate(`/automations/${accountId}/${automationType}`);
    } catch (error) {
      console.error(`Error saving ${automationType} automation:`, error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-700">Loading editor...</div>;
  }

  if (!account) {
    return <div className="p-8 text-center text-red-600">Account not found.</div>;
  }

  const editorTitle = automationId 
    ? `Edit ${automationType === 'dm' ? 'DM' : 'Comment'} Automation`
    : `New ${automationType === 'dm' ? 'DM' : 'Comment'} Automation`;

  const automationToEdit = automationId 
    ? (account[automationType === 'dm' ? 'dmAutomations' : 'commentAutomations'] || []).find((a: AutomationData) => a.id === automationId) 
    : undefined;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to={`/automations/${accountId}/${automationType}`} className="inline-flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Automation List
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{editorTitle}</h1>
        <p className="text-gray-500">for {account.clientName}</p>
      </div>
      
      {automationType === 'dm' && (
        <SimpleDmEditor
          account={account}
          existingAutomation={automationToEdit as SimpleKeywordAutomation | undefined}
          onSave={handleSaveAutomation as (data: SimpleKeywordAutomation) => Promise<void>}
        />
      )}
      
      {automationType === 'comment' && (
        <CommentAutomationEditor
          account={account}
          existingAutomation={automationToEdit as CommentAutomation | undefined}
          onSave={handleSaveAutomation as (data: CommentAutomation) => Promise<void>}
        />
      )}
    </div>
  );
};

export default EditorPage;

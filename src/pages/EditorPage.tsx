// src/pages/EditorPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Account, SimpleKeywordAutomation, CommentAutomation, StoryAutomation } from '../types';
import SimpleDmEditor from '../components/InstaDMeditor';
import CommentAutomationEditor from '../components/CommentAutomationEditor';
import StoryAutomationEditor from '../components/StoryAutomationEditor';

type AutomationData = SimpleKeywordAutomation | CommentAutomation | StoryAutomation;
type AutomationType = 'dm' | 'comment' | 'story';
type AutomationFieldName = 'dmAutomations' | 'commentAutomations' | 'storyAutomations';


const EditorPage: React.FC = () => {
  const { accountId, automationType, automationId } = useParams<{ accountId: string; automationType: AutomationType; automationId?: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
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

  const handleSaveAutomation = async (dataToSave: AutomationData) => {
    if (!accountId || !account || !automationType) return;

    const fieldName: AutomationFieldName = `${automationType}Automations`;
    
    const currentAutomations: AutomationData[] = account[fieldName] || [];
    const isEditing = currentAutomations.some(auto => auto.id === dataToSave.id);
    const updatedAutomations = isEditing
      ? currentAutomations.map(auto => auto.id === dataToSave.id ? dataToSave : auto)
      : [...currentAutomations, dataToSave];

    try {
      await updateDoc(doc(db, 'clients', accountId), { [fieldName]: updatedAutomations });
      navigate(`/automations/${accountId}/${automationType}`);
    } catch (error) {
      console.error(`Error saving ${automationType} automation:`, error);
    }
  };
  
  const getPageInfo = () => {
    const typeName = automationType === 'dm' ? 'DM' : automationType === 'comment' ? 'Comment' : 'Story Reply';
    return {
      title: automationId ? `Edit ${typeName} Automation` : `New ${typeName} Automation`
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading Editor...</p>
      </div>
    );
  }

  if (!account || !automationType) {
    return <div className="p-8 text-center text-red-600">Account or Automation Type not found.</div>;
  }

  const { title } = getPageInfo();

  // FIX: Use a switch statement to safely find the automation to edit.
  // This resolves both TypeScript errors.
  let automationToEdit: AutomationData | undefined;
  if (automationId) {
    switch (automationType) {
      case 'dm':
        // TypeScript knows `a` is SimpleKeywordAutomation here
        automationToEdit = (account.dmAutomations || []).find(a => a.id === automationId);
        break;
      case 'comment':
        // TypeScript knows `a` is CommentAutomation here
        automationToEdit = (account.commentAutomations || []).find(a => a.id === automationId);
        break;
      case 'story':
        // TypeScript knows `a` is StoryAutomation here
        automationToEdit = (account.storyAutomations || []).find(a => a.id === automationId);
        break;
      default:
        automationToEdit = undefined;
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="mb-6">
          <Link to={`/automations/${accountId}/${automationType}`} className="inline-flex items-center text-sm font-semibold text-brand hover:text-brand-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Automation List
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-md text-slate-500">for {account.clientName}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
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
          {automationType === 'story' && (
            <StoryAutomationEditor
              account={account}
              existingAutomation={automationToEdit as StoryAutomation | undefined}
              onSave={handleSaveAutomation as (data: StoryAutomation) => Promise<void>}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
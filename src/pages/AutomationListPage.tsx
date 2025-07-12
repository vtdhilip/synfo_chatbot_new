// src/pages/AutomationListPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Account, CommentAutomation, SimpleKeywordAutomation } from '../types';
import { ArrowLeft, Plus, Edit, Trash2, ToggleLeft, ToggleRight, MessageSquare, AtSign, MessageCircle } from 'lucide-react';

type Automation = CommentAutomation | SimpleKeywordAutomation;

const AutomationListPage: React.FC = () => {
  // FIX: Added 'story' to the possible automation types
  const { accountId, automationType } = useParams<{ accountId: string; automationType: 'dm' | 'comment' | 'story' }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  // FIX: Updated logic to handle all automation types correctly
  const getPageConfig = () => {
    switch (automationType) {
      case 'dm':
        return {
          fieldName: 'dmAutomations',
          title: 'DM Automations',
          icon: <MessageSquare className="w-8 h-8 mr-3 text-pink-500" />
        };
      case 'comment':
        return {
          fieldName: 'commentAutomations',
          title: 'Comment Automations',
          icon: <AtSign className="w-8 h-8 mr-3 text-indigo-500" />
        };
      case 'story':
        return {
          fieldName: 'storyAutomations',
          title: 'Story Reply Automations',
          icon: <MessageCircle className="w-8 h-8 mr-3 text-blue-500" />
        };
      default:
        return {
          fieldName: '',
          title: 'Automations',
          icon: <div/>
        };
    }
  };
  
  const { fieldName, title: pageTitle, icon: pageIcon } = getPageConfig();

  useEffect(() => {
    if (!accountId || !fieldName) {
        setLoading(false);
        return;
    };
    const accountDocRef = doc(db, 'clients', accountId);

    const unsubscribe = onSnapshot(accountDocRef, (docSnap: DocumentSnapshot) => {
      if (docSnap.exists()) {
        const accountData = { ...docSnap.data(), id: docSnap.id } as Account;
        setAccount(accountData);
        setAutomations((accountData as any)[fieldName] || []);
        setLoading(false);
      } else {
        console.error("Account not found!");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [accountId, fieldName]);

  const handleToggle = async (automationId: string, currentState: boolean) => {
    if (!account || !fieldName) return;
    const updatedAutomations = automations.map(auto => 
      auto.id === automationId ? { ...auto, enabled: !currentState } : auto
    );
    
    await updateDoc(doc(db, 'clients', account.id), {
      [fieldName]: updatedAutomations
    });
  };
  
  const handleDelete = async (automationId: string) => {
    if (!account || !fieldName || !window.confirm("Are you sure you want to delete this automation?")) return;
    const updatedAutomations = automations.filter(auto => auto.id !== automationId);

    await updateDoc(doc(db, 'clients', account.id), {
      [fieldName]: updatedAutomations
    });
  };

  if (loading) {
    return <div className="p-8 text-center">Loading automations...</div>;
  }
  
  // FIX: Add a specific "Coming Soon" view for story automations
  if (automationType === 'story') {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
             <Link to={`/dashboard/${accountId}`} className="inline-flex items-center text-blue-600 hover:underline mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Link>
            <div className="flex justify-center items-center mb-4">
              {pageIcon}
              <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
            </div>
            <p className="text-gray-600">This feature is coming soon!</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to={`/dashboard/${accountId}`} className="inline-flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          {pageIcon}
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
        </div>
        <button
          onClick={() => navigate(`/editor/${accountId}/${automationType}`)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2 -ml-1" />
          Add New Automation
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {automations.length > 0 ? automations.map((automation) => (
            <li key={automation.id} className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{automation.name}</p>
                <p className="text-sm text-gray-500">
                  {automation.type === 'comment_automation' 
                    ? `Trigger: On post comments` 
                    : `Trigger: Keywords like "${(automation as SimpleKeywordAutomation).keywords[0]}"`}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button onClick={() => handleToggle(automation.id, automation.enabled)} title={automation.enabled ? 'Disable' : 'Enable'}>
                  {automation.enabled 
                    ? <ToggleRight className="w-10 h-10 text-green-500" /> 
                    : <ToggleLeft className="w-10 h-10 text-gray-400" />}
                </button>
                <button onClick={() => navigate(`/editor/${accountId}/${automationType}/${automation.id}`)} className="p-2 text-gray-500 hover:text-blue-600">
                  <Edit className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(automation.id)} className="p-2 text-gray-500 hover:text-red-600">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </li>
          )) : (
            <p className="p-6 text-center text-gray-500">No automations created yet.</p>
          )}
        </ul>
      </div>
    </div>
  );
};

export default AutomationListPage;

// src/pages/AutomationListPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Account, CommentAutomation, SimpleKeywordAutomation, StoryAutomation } from '../types';
import { ArrowLeft, Plus, Edit, Trash2, ToggleLeft, ToggleRight, MessageSquare, AtSign, MessageCircle, Layers } from 'lucide-react';

type Automation = CommentAutomation | SimpleKeywordAutomation | StoryAutomation;

const AutomationListPage: React.FC = () => {
  const { accountId, automationType } = useParams<{ accountId: string; automationType: 'dm' | 'comment' | 'story' }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  const isMounted = useRef(true);

  // REDESIGNED: getPageConfig now returns more styled components and a cohesive color scheme.
  const getPageConfig = () => {
    const iconBaseClasses = "w-7 h-7";
    const iconWrapperBaseClasses = "w-14 h-14 mr-4 rounded-xl flex items-center justify-center";

    switch (automationType) {
      case 'dm':
        return {
          fieldName: 'dmAutomations',
          title: 'DM Automations',
          description: "Engage users who send you direct messages with keywords.",
          icon: (
            <div className={`${iconWrapperBaseClasses} bg-brand-100 text-brand-600`}>
              <MessageSquare className={iconBaseClasses} />
            </div>
          )
        };
      case 'comment':
        return {
          fieldName: 'commentAutomations',
          title: 'Comment Automations',
          description: "Automatically reply to comments on your posts.",
          icon: (
            <div className={`${iconWrapperBaseClasses} bg-indigo-100 text-indigo-600`}>
              <AtSign className={iconBaseClasses} />
            </div>
          )
        };
      case 'story':
        return {
          fieldName: 'storyAutomations',
          title: 'Story Reply Automations',
          description: "Send automated replies to users who react to your stories.",
          icon: (
            <div className={`${iconWrapperBaseClasses} bg-sky-100 text-sky-600`}>
              <MessageCircle className={iconBaseClasses} />
            </div>
          )
        };
      default:
        return {
          fieldName: '',
          title: 'Automations',
          description: "Manage your automations.",
          icon: <div />
        };
    }
  };
  
  const { fieldName, title: pageTitle, description: pageDescription, icon: pageIcon } = getPageConfig();

  useEffect(() => {
    isMounted.current = true;
    if (!accountId || !fieldName) {
        if (isMounted.current) setLoading(false);
        return;
    };
    const accountDocRef = doc(db, 'clients', accountId);

    const unsubscribe = onSnapshot(accountDocRef, (docSnap: DocumentSnapshot) => {
      if (!isMounted.current) return;
      if (docSnap.exists()) {
        const accountData = { ...docSnap.data(), id: docSnap.id } as Account;
        setAccount(accountData);
        setAutomations((accountData as any)[fieldName] || []);
      } else {
        console.error("Account not found!");
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      isMounted.current = false;
    };
  }, [accountId, fieldName]);

  const handleToggle = async (automationId: string, currentState: boolean) => {
    if (!account || !fieldName) return;
    const updatedAutomations = automations.map(auto => 
      auto.id === automationId ? { ...auto, enabled: !currentState } : auto
    );
    try {
        await updateDoc(doc(db, 'clients', account.id), { [fieldName]: updatedAutomations });
    } catch (error) {
        console.error("Failed to toggle automation:", error);
        // Optional: show an error toast to the user
    }
  };
  
  const handleDelete = async (automationId: string) => {
    if (!account || !fieldName || !window.confirm("Are you sure you want to delete this automation?")) return;
    const updatedAutomations = automations.filter(auto => auto.id !== automationId);
    try {
        await updateDoc(doc(db, 'clients', account.id), { [fieldName]: updatedAutomations });
    } catch (error) {
        console.error("Failed to delete automation:", error);
        // Optional: show an error toast to the user
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading automations...</div>;
  }
  
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
            <Link to={`/dashboard/${accountId}`} className="inline-flex items-center text-sm font-semibold text-brand hover:text-brand-700 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Automation List
            </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <div className="flex items-center">
                {pageIcon}
                <div>
                    <h1 className="text-4xl font-bold text-slate-900">{pageTitle}</h1>
                    <p className="text-lg text-slate-500 mt-1">{pageDescription}</p>
                </div>
            </div>
            <button
                onClick={() => navigate(`/editor/${accountId}/${automationType}`)}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-brand-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
                <Plus className="w-5 h-5 mr-2 -ml-1" />
                Add New Automation
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <ul className="divide-y divide-slate-200">
                {automations.length > 0 ? automations.map((automation) => (
                    <li key={automation.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{automation.name}</p>
                            <p className="text-sm text-slate-500">
                            {automation.type === 'comment_automation' 
                                ? `Trigger: When someone comments on a post` 
                                : automation.type === 'story_automation'
                                ? `Trigger: When someone replies to a story`
                                : `Trigger: On DM with keywords like "${(automation as SimpleKeywordAutomation).keywords[0]}"`}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 ml-4">
                            <button onClick={() => handleToggle(automation.id, automation.enabled)} title={automation.enabled ? 'Click to Disable' : 'Click to Enable'}>
                            {automation.enabled 
                                ? <ToggleRight className="w-9 h-9 text-green-500" /> 
                                : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                            </button>
                            <button onClick={() => navigate(`/editor/${accountId}/${automationType}/${automation.id}`)} className="p-2.5 rounded-full text-slate-500 hover:text-brand hover:bg-brand-50 transition-colors" title="Edit">
                                <Edit className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDelete(automation.id)} className="p-2.5 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </li>
                )) : (
                    <div className="text-center py-20 px-6">
                        <Layers className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-800">No automations found</h3>
                        <p className="mt-1 text-slate-500">Get started by creating your first automation.</p>
                    </div>
                )}
            </ul>
        </div>
      </div>
    </div>
  );
};

export default AutomationListPage;
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { Account, SimpleKeywordAutomation, CommentAutomation, StoryAutomation } from '../types';
import SimpleDmEditor from '../components/InstaDMeditor';
import CommentAutomationEditor from '../components/CommentAutomationEditor';
import StoryAutomationEditor from '../components/StoryAutomationEditor';
import { useAuth } from '../context/AuthContext'; // Import the useAuth hook

type AutomationData = SimpleKeywordAutomation | CommentAutomation | StoryAutomation;
type AutomationType = 'dm' | 'comment' | 'story';
type AutomationFieldName = 'dmAutomations' | 'commentAutomations' | 'storyAutomations';

// A simple modal to prompt users to upgrade
const UpgradeModal = ({ onGoToBilling, onClose, title, message }: { onGoToBilling: () => void; onClose: () => void; title: string; message: string; }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md text-center p-8">
            <Lock className="w-12 h-12 mx-auto text-brand mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <p className="text-slate-500 mt-2 mb-6">{message}</p>
            <div className="flex justify-center gap-4">
                <button onClick={onClose} className="px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">
                    Cancel
                </button>
                <button onClick={onGoToBilling} className="px-6 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-600">
                    Upgrade Plan
                </button>
            </div>
        </div>
    </div>
);


const EditorPage: React.FC = () => {
  const { accountId, automationType, automationId } = useParams<{ accountId: string; automationType: AutomationType; automationId?: string }>();
  const navigate = useNavigate();
  const { permissions } = useAuth(); // Get permissions from the context

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });

  // --- Determine if the current editor is locked based on permissions ---
  const isFeatureLocked = (): boolean => {
    if (!permissions || !automationType) return true; // Default to locked if no permissions
    // Example: Lock the story editor if the user doesn't have the permission
    
    // Add other checks here, e.g., for advanced chatflows
    return false;
  };

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
    // --- Prevent saving if the feature is locked ---
    if (isFeatureLocked()) {
        setModalContent({ title: 'Feature Locked', message: 'This feature is not available on your current plan. Please upgrade to access it.' });
        setShowUpgradeModal(true);
        return;
    }

    if (!accountId || !account || !automationType) return;

    const fieldName: AutomationFieldName = `${automationType}Automations`;
    
    const currentAutomations: AutomationData[] = account[fieldName] || [];
    const isEditing = currentAutomations.some(auto => auto.id === dataToSave.id);

    // --- Check automation limit before saving a NEW automation ---
    if (!isEditing) {
        const totalAutomations = (account.dmAutomations?.length || 0) + (account.commentAutomations?.length || 0) + (account.storyAutomations?.length || 0);
        // FIX: Default the limit to 1 (for the free plan) if permissions aren't loaded yet.
        const limit = permissions?.flowLimit ?? 1;

        if (totalAutomations >= limit) {
            setModalContent({ title: 'Automation Limit Reached', message: `You have reached your limit of ${limit} automations. Please upgrade your plan to add more.` });
            setShowUpgradeModal(true);
            return;
        }
    }

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

  // Immediately show upgrade modal if user tries to access a locked editor directly via URL
  if (!automationId && isFeatureLocked()) {
    return <UpgradeModal 
                title="Feature Locked" 
                message="This feature is not available on your current plan. Please upgrade to access it."
                onClose={() => navigate(-1)} 
                onGoToBilling={() => navigate('/subscription')} 
            />;
  }

  const { title } = getPageInfo();

  let automationToEdit: AutomationData | undefined;
  if (automationId) {
    switch (automationType) {
      case 'dm':
        automationToEdit = (account.dmAutomations || []).find(a => a.id === automationId);
        break;
      case 'comment':
        automationToEdit = (account.commentAutomations || []).find(a => a.id === automationId);
        break;
      case 'story':
        automationToEdit = (account.storyAutomations || []).find(a => a.id === automationId);
        break;
      default:
        automationToEdit = undefined;
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {showUpgradeModal && <UpgradeModal {...modalContent} onClose={() => setShowUpgradeModal(false)} onGoToBilling={() => navigate('/subscription')} />}

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

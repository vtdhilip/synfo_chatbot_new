import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { type Account } from '../types';
import { ArrowLeft, MessageSquare, AtSign, HelpCircle, Instagram } from 'lucide-react';

// Define a type for our analytics data
interface DailyAnalytics {
  total_comments?: number;
  automated_comments?: number;
  total_dms?: number;
  automated_dms?: number;
  // Add story replies later
}

// Reusable component for the automation options
const AutomationCard = ({ title, description, icon, linkTo }: { title: string, description: string, icon: React.ReactNode, linkTo: string }) => (
   <Link to={linkTo} className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-200">
    <div className="flex items-start">
      <div className="p-3 bg-gray-100 text-gray-600 rounded-lg mr-4">
        {icon}
      </div>
      <div>
        {/* Add title and description here */}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  </Link>
);

const DashboardPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for the new analytics data
  const [analytics, setAnalytics] = useState<DailyAnalytics>({});

  useEffect(() => {
    if (!accountId) return;
    
    // Listen for account data
    const accountDocRef = doc(db, 'clients', accountId);
    const unsubscribeAccount = onSnapshot(accountDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAccount({ ...docSnap.data(), id: docSnap.id } as Account);
      } else {
        setAccount(null);
      }
      setLoading(false);
    });

    // Listen for today's analytics data in real-time
    const today = new Date();
    // *** CRITICAL CHANGE HERE: Use UTC methods for consistency with backend ***
    const dateString = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
    
    const analyticsRef = doc(db, `analytics/${accountId}/daily/${dateString}`);
    
    const unsubscribeAnalytics = onSnapshot(analyticsRef, (docSnap: DocumentSnapshot) => {
        setAnalytics(docSnap.data() as DailyAnalytics || {});
    });

    // Cleanup listeners on component unmount
    return () => {
      unsubscribeAccount();
      unsubscribeAnalytics();
    };
  }, [accountId]);

  const automatedComments = analytics.automated_comments || 0;
  const totalComments = analytics.total_comments || 0;
  const automatedDms = analytics.automated_dms || 0;
  const totalDms = analytics.total_dms || 0;
  // Placeholder for story replies
  const automatedStories = 0;
  const totalStories = 0;

  const totalAutomated = automatedComments + automatedDms + automatedStories;
  const totalInteractions = totalComments + totalDms + totalStories;

  if (loading) {
    return <div className="p-8 text-center">Loading Dashboard...</div>;
  }
  if (!account) {
    return <div className="p-8 text-center">Account not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="inline-flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to All Accounts
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{account.clientName}</h1>
        <p className="text-gray-500">Today's automated activity.</p>
      </div>

      {/* --- Section 1: Analytics Grid --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-12">
        <div className="flex items-center mb-6">
            <Instagram className="w-8 h-8 mr-3" />
            <div>
                <h2 className="text-xl font-bold text-gray-800">Automated Activity</h2>
                <p className="text-gray-500">
                    Automated {totalAutomated} out of {totalInteractions} interactions
                </p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
                <p className="text-sm text-gray-500">Comments</p>
                <p className="text-4xl font-bold text-gray-900">{automatedComments}</p>
                <p className="text-sm text-gray-500">Out of {totalComments}</p>
            </div>
            <div>
                <p className="text-sm text-gray-500">Story replies</p>
                <p className="text-4xl font-bold text-gray-900">{automatedStories}</p>
                <p className="text-sm text-gray-500">Out of {totalStories}</p>
            </div>
            <div className="flex items-center justify-center">
                <div>
                    <p className="text-sm text-gray-500 flex items-center justify-center">
                        DMs <HelpCircle className="w-4 h-4 ml-1 text-gray-400" />
                    </p>
                    <p className="text-4xl font-bold text-gray-900">{automatedDms}</p>
                    <p className="text-sm text-gray-500">Out of {totalDms}</p>
                </div>
            </div>
        </div>
      </div>

      {/* --- Section 2: Automation Flows --- */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage Automations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AutomationCard 
              title="DM Automations"
              description="Manage keyword-based flows for incoming Direct Messages."
              icon={<MessageSquare />}
              linkTo={`/automations/${accountId}/dm`}
            />
            <AutomationCard 
              title="Comment Automations"
              description="Manage auto-replies for when someone comments on a post."
              icon={<AtSign />}
              linkTo={`/automations/${accountId}/comment`}
            />
            <AutomationCard 
              title="Story Reply Automations"
              description="Automatically reply to users who engage with your Stories."
              icon={<MessageSquare />}
              linkTo={`/automations/${accountId}/story`}
            />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
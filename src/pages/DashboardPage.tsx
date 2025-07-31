import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { type Account } from '../types';
import { ArrowLeft, MessageSquare, AtSign, Instagram, Lock, Sparkles, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DailyAnalytics {
  total_comments?: number;
  automated_comments?: number;
  total_dms?: number;
  automated_dms?: number;
  total_automations?: number;
}

// Reusable component for the automation options
const AutomationCard = ({
  title,
  description,
  icon,
  linkTo,
  disabled = false,
  isLocked = false,
  badgeText,
}: {
  title: string,
  description: string,
  icon: React.ReactNode,
  linkTo: string,
  disabled?: boolean,
  isLocked?: boolean,
  badgeText?: string,
}) => (
   <div className="relative">
    <Link
      to={linkTo}
      className={`group block p-6 bg-white rounded-xl border border-slate-200 transition-all duration-200 h-full
                  ${disabled || isLocked ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'hover:border-brand hover:shadow-xl'}`}
      onClick={(e) => (disabled || isLocked) && e.preventDefault()}
    >
      <div className="flex items-start">
        {icon}
        <div className="flex-1 ml-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            {title}
            {isLocked && <Lock className="w-4 h-4 ml-2 text-slate-400" />}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
    {(isLocked || disabled) && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-3 py-1 rounded-full">
                {badgeText ? badgeText : (isLocked ? 'Upgrade to unlock' : 'Limit reached')}
            </span>
        </div>
    )}
   </div>
);


const DashboardPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  // --- FIX: Get permissions directly from the useAuth hook ---
  const { permissions } = useAuth();
  
  const [analytics, setAnalytics] = useState<DailyAnalytics>({});
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!accountId) {
      if (isMounted.current) setLoading(false);
      return;
    }
    
    const accountDocRef = doc(db, 'clients', accountId);
    const unsubscribeAccount = onSnapshot(accountDocRef, (docSnap) => {
      if (isMounted.current) {
        if (docSnap.exists()) setAccount({ ...docSnap.data(), id: docSnap.id } as Account);
        else setAccount(null);
        setLoading(false);
      }
    });

    // --- This correctly fetches TODAY's analytics ---
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const analyticsRef = doc(db, `analytics/${accountId}/daily/${dateString}`);
    const unsubscribeAnalytics = onSnapshot(analyticsRef, (docSnap: DocumentSnapshot) => {
      if (isMounted.current) setAnalytics(docSnap.data() as DailyAnalytics || {});
    });

    return () => {
      unsubscribeAccount();
      unsubscribeAnalytics();
      isMounted.current = false;
    };
  }, [accountId]);

  const automationLimit = permissions?.flowLimit || 0;
  const totalAutomationsToday = analytics.total_automations || 0;

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading Dashboard...</div>;
  }
  if (!account) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Account not found.</div>;
  }

  const iconWrapper = "w-12 h-12 rounded-lg flex items-center justify-center";

  return (
    <div className="bg-slate-50 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <Link to="/" className="inline-flex items-center text-sm font-semibold text-brand hover:text-brand-700 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to All Accounts
                </Link>
            </div>

            <div className="mb-10">
                <h1 className="text-4xl font-bold text-slate-900">{account.clientName}</h1>
                <p className="text-lg text-slate-500 mt-1">Welcome to your automation dashboard.</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 mb-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div className="flex items-center">
                        <div className={`${iconWrapper} bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600 text-white`}>
                            <Instagram className="w-6 h-6" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-xl font-bold text-slate-800">Today's Automated Activity</h2>
                            <p className="text-sm text-slate-500">
                                Summary for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
                            </p>
                        </div>
                    </div>
                    {/* --- NEW ANALYTICS BUTTON --- */}
                    <Link 
                        to={`/analytics/${accountId}`} 
                        className={`mt-4 sm:mt-0 px-4 py-2 inline-flex items-center bg-white text-slate-700 text-sm font-semibold border border-slate-300 rounded-lg transition-colors 
                                    `}
                       
                    >
                        <BarChart2 className="w-4 h-4 mr-2" />
                        View Analytics
                       
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="p-4">
                        <p className="text-sm font-medium text-slate-500">Automated Comments</p>
                        <p className="text-5xl font-bold text-slate-900 mt-2">{(analytics.automated_comments || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 md:border-l md:border-r border-slate-200">
                        <p className="text-sm font-medium text-slate-500">Automated DMs</p>
                        <p className="text-5xl font-bold text-slate-900 mt-2">{(analytics.automated_dms || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4">
                        <p className="text-sm font-medium text-slate-500">Total Executions</p>
                        <p className="text-5xl font-bold text-slate-900 mt-2">{totalAutomationsToday.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {typeof automationLimit === 'number' ? `of ${automationLimit.toLocaleString()} daily limit` : 'Unlimited'}
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Manage Automations</h2>
                <p className="text-slate-500 mb-6">Select a flow to view, edit, or create new automations.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <AutomationCard
                        title="DM Automations"
                        description="Engage users who send you DMs with specific keywords."
                        icon={<div className={`${iconWrapper} bg-brand-50 text-brand-600`}><MessageSquare /></div>}
                        linkTo={`/automations/${accountId}/dm`}
                    />
                    <AutomationCard
                        title="Comment Automations"
                        description="Reply to comments on your posts to boost engagement."
                        icon={<div className={`${iconWrapper} bg-indigo-50 text-indigo-600`}><AtSign /></div>}
                        linkTo={`/automations/${accountId}/comment`}
                    />
                    <AutomationCard
                        title="Story Reply Automations"
                        description="Automatically reply to users who engage with your Stories."
                        icon={<div className={`${iconWrapper} bg-sky-50 text-sky-600`}><Sparkles /></div>}
                        linkTo={`/automations/${accountId}/story`}
                        isLocked={true}
                        badgeText="Coming Soon"
                    />
                </div>
            </div>
        </div>
    </div>
  );
};

export default DashboardPage;

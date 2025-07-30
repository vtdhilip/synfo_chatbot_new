// src/pages/DashboardPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { type Account } from '../types';
// --- ADD BarChart2 to your imports ---
import { ArrowLeft, MessageSquare, AtSign, Zap, Instagram, Lock, Sparkles, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PlanId, PlanCapabilities, planFeatures } from '../config/plans';

interface DailyAnalytics {
  total_comments?: number;
  automated_comments?: number;
  total_dms?: number;
  automated_dms?: number;
  total_automations?: number;
}

// Reusable component for the automation options - REDESIGNED
const AutomationCard = ({
  title,
  description,
  icon,
  linkTo,
  disabled = false,
  isLocked = false,
  tooltip = '',
}: {
  title: string,
  description: string,
  icon: React.ReactNode,
  linkTo: string,
  disabled?: boolean,
  isLocked?: boolean,
  tooltip?: string,
}) => (
   <div className="relative" title={tooltip}>
    <Link
      to={linkTo}
      className={`group block p-6 bg-white rounded-xl border border-slate-200 transition-all duration-200 h-full
                  ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'hover:border-brand hover:shadow-xl'}`}
      onClick={(e) => disabled && e.preventDefault()}
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
   </div>
);


const DashboardPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const { subscription } = useAuth();
  
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

  const automatedComments = analytics.automated_comments || 0;
  const automatedDms = analytics.automated_dms || 0;
  const totalAutomationsToday = analytics.total_automations || 0;
  
  const currentPlanId = (subscription?.planId || 'free') as PlanId;
  const caps: PlanCapabilities = planFeatures[currentPlanId] || planFeatures['free'];
  const canUseAdvancedChatflow = caps.canUseAdvancedChatflow;
  const automationLimit = caps.maxAutomations;
  const automationLimitReached = typeof automationLimit === 'number' && totalAutomationsToday >= automationLimit;

  const upgradeTooltip = 'Upgrade to the Professional Plan to unlock this feature.';
  const limitReachedTooltip = automationLimitReached
    ? `Daily limit of ${automationLimit} automations reached. Upgrade your plan for a higher limit.`
    : '';

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
                <div className="flex items-center mb-6">
                    <div className={`${iconWrapper} bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600 text-white`}>
                        <Instagram className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                        <h2 className="text-xl font-bold text-slate-800">Today's Automated Activity</h2>
                        <p className="text-sm text-slate-500">
                            A summary of all automated interactions for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="p-4">
                        <p className="text-sm font-medium text-slate-500">Automated Comments</p>
                        <p className="text-5xl font-bold text-slate-900 mt-2">{automatedComments.toLocaleString()}</p>
                    </div>
                    <div className="p-4 md:border-l md:border-r border-slate-200">
                        <p className="text-sm font-medium text-slate-500">Automated DMs</p>
                        <p className="text-5xl font-bold text-slate-900 mt-2">{automatedDms.toLocaleString()}</p>
                    </div>
                    <div className="p-4">
                        <p className="text-sm font-medium text-slate-500">Total Executions</p>
                        <p className="text-5xl font-bold text-slate-900 mt-2">{totalAutomationsToday.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {typeof automationLimit === 'number' ? `of ${automationLimit.toLocaleString()} limit` : 'Unlimited'}
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Manage Automations</h2>
                <p className="text-slate-500 mb-6">Select a flow to view, edit, or create new automations.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AutomationCard
                        title="DM Automations"
                        description="Engage users who send you DMs with specific keywords."
                        icon={<div className={`${iconWrapper} bg-brand-50 text-brand-600`}><MessageSquare /></div>}
                        linkTo={`/automations/${accountId}/dm`}
                        disabled={automationLimitReached}
                        tooltip={limitReachedTooltip}
                    />
                    <AutomationCard
                        title="Comment Automations"
                        description="Reply to comments on your posts to boost engagement."
                        icon={<div className={`${iconWrapper} bg-indigo-50 text-indigo-600`}><AtSign /></div>}
                        linkTo={`/automations/${accountId}/comment`}
                        disabled={automationLimitReached}
                        tooltip={limitReachedTooltip}
                    />
                    <AutomationCard
                        title="Story Reply Automations"
                        description="Automatically reply to users who engage with your Stories."
                        icon={<div className={`${iconWrapper} bg-sky-50 text-sky-600`}><Sparkles /></div>}
                        linkTo={`/automations/${accountId}/story`}
                        disabled={automationLimitReached}
                        tooltip={limitReachedTooltip}
                    />
                    <AutomationCard
                        title="Advanced Chatflow Logic"
                        description="Build complex, branching conversations with conditions."
                        icon={<div className={`${iconWrapper} bg-teal-50 text-teal-600`}><Zap /></div>}
                        linkTo={`/editor/${accountId}/chatflow`}
                        disabled={!canUseAdvancedChatflow || automationLimitReached}
                        isLocked={!canUseAdvancedChatflow}
                        tooltip={!canUseAdvancedChatflow ? upgradeTooltip : limitReachedTooltip}
                    />
                    {/* --- THIS IS THE NEWLY ADDED CARD --- */}
                    <AutomationCard
                        title="View Analytics"
                        description="See detailed reports and performance charts for your automations."
                        icon={<div className={`${iconWrapper} bg-green-50 text-green-600`}><BarChart2 /></div>}
                        linkTo={`/analytics/${accountId}`}
                    />
                </div>
            </div>
        </div>
    </div>
  );
};

export default DashboardPage;
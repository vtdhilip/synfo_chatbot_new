import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { type Account } from './Index';
import { ArrowLeft, MessageSquare, Users, BarChart2, AtSign ,MessageCircle } from 'lucide-react';

// Reusable component for displaying stats
const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    </div>
);

// Reusable component for the automation options
const AutomationCard = ({ title, description, icon, linkTo }: any) => (
  <Link to={linkTo} className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-200">
    <div className="flex items-start">
      <div className="p-3 bg-gray-100 text-gray-600 rounded-lg mr-4">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  </Link>
);


const DashboardPage = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Placeholder for real analytics data
  const [stats] = useState({ messages: 125, conversations: 12, responseRate: "95%" });

  useEffect(() => {
    if (!accountId) return;
    const fetchAccountData = async () => {
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
    fetchAccountData();
  }, [accountId]);

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
        <p className="text-gray-500">Analytics and recent activity overview.</p>
      </div>

      {/* --- Section 1: Stats Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <StatCard title="Messages Processed" value={stats.messages} icon={<MessageSquare />} />
        <StatCard title="Active Conversations" value={stats.conversations} icon={<Users />} />
        <StatCard title="Response Rate" value={stats.responseRate} icon={<BarChart2 />} />
      </div>

      {/* --- Section 2: Automation Flows --- */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Start an Automation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AutomationCard 
              title="DM Automation"
              description="Build a keyword-based flow for incoming Direct Messages."
              icon={<MessageSquare />}
              linkTo={`/editor/${accountId}/dm`}
            />
            <AutomationCard 
              title="Comment Automation"
              description="Send an auto-reply DM when someone comments on a post."
              icon={<AtSign />}
              linkTo={`/editor/${accountId}/comment`}
            />
            <AutomationCard 
              title="Story Reply Automation"
              description="Automatically reply to users who engage with your Stories."
              icon={<MessageCircle />}
              linkTo={`/editor/${accountId}/story`}
            />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
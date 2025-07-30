import { useState, useEffect } from "react";
import { collection, deleteDoc, doc, query, where, onSnapshot, getDoc, DocumentSnapshot , orderBy } from "firebase/firestore";
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AccountsTable from '../components/AccountsTable';
import MessageAlert from '../components/MessageAlert';
import AddAccountModal from '../components/AddAccountModal';
import InstagramConnectModal from "../components/InstagramConnectModal";
import UpgradeModal from '../components/UpgradeModal';
import { Account } from '../types';
import { useNavigate } from "react-router-dom";
import { Plus, Search, ChevronDown, Loader2, ArrowRight } from 'lucide-react';

const Index = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userRole, subscription } = useAuth();
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isInstagramConnectModalOpen, setIsInstagramConnectModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [monthlyAutomationExecutions, setMonthlyAutomationExecutions] = useState(0);

  const [plans, setPlans] = useState<any[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    };

    setLoading(true);

    const accountsCollectionRef = collection(db, "clients");
    const q = userRole === 'admin'
      ? query(accountsCollectionRef, orderBy("createdAt", "desc"))
      : query(accountsCollectionRef, where("agencyId", "==", currentUser.uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const accountsData: Account[] = [];
      let limitHasBeenExceeded = false;

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Account & { limitExceeded?: boolean; instagramUsername?: string };
        accountsData.push({ ...data, id: doc.id });

        if (data.limitExceeded === true) {
          limitHasBeenExceeded = true;
        }
      });

      setAccounts(accountsData);
      setShowUpgradeModal(limitHasBeenExceeded);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching accounts in real-time:", error);
      showMessage("Failed to fetch accounts.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userRole]);


  useEffect(() => {
    const plansQuery = query(collection(db, "plans"), orderBy("displayOrder"));
    const unsubscribe = onSnapshot(plansQuery, (snapshot) => {
        const plansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlans(plansData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchMonthlyAutomationExecutions = async () => {
      if (!currentUser || accounts.length === 0) {
        setMonthlyAutomationExecutions(0);
        return;
      }

      let totalExecutionsThisMonth = 0;
      const today = new Date();
      const currentMonthYear = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;

      const executionPromises = accounts.map(account => {
        const monthlyAnalyticsDocRef = doc(db, `analytics/${account.id}/monthly/${currentMonthYear}`);
        return getDoc(monthlyAnalyticsDocRef);
      });

      try {
        const analyticsDocs = await Promise.all(executionPromises);
        analyticsDocs.forEach((docSnap: DocumentSnapshot) => {
          if (docSnap.exists()) {
            totalExecutionsThisMonth += docSnap.data().total_automations || 0;
          }
        });
        setMonthlyAutomationExecutions(totalExecutionsThisMonth);
      } catch (error) {
        console.error("[Index] Error fetching monthly automation executions:", error);
        setMonthlyAutomationExecutions(0);
      }
    };

    if (!loading) {
        fetchMonthlyAutomationExecutions();
    }
  }, [currentUser, accounts, loading]);

  const deleteAccount = async (accountId: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, 'clients', accountId));
      showMessage("Account deleted successfully.", "success");
    } catch (err) {
      console.error(err);
      showMessage("Error deleting account.", "error");
    }
  };

  const handleSelectPlatform = (platform: string) => {
    setIsAddAccountModalOpen(false);
    if (platform === 'instagram' || platform === 'facebook') {
      setIsInstagramConnectModalOpen(true);
    } else {
      showMessage(`${platform} integration is coming soon.`, 'info');
    }
  };

  const filteredAccounts = accounts.filter((account) =>
    (account.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true) &&
    (filterStatus === "all" || account.subscriptionStatus === filterStatus)
  );

  const currentPlanId = subscription?.planId || 'free';
  const currentPlanDetails = plans.find(p => p.id === currentPlanId) || { name: 'Free Plan', maxAutomations: 1000 };

  const automationLimit = currentPlanDetails.maxAutomations;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {message && <div className="mb-6"><MessageAlert message={message} type={messageType} onClose={() => setMessage("")} /></div>}

        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Your Accounts</h1>
            <p className="text-lg text-slate-500 mt-1">Manage all your connected Instagram accounts.</p>
          </div>
          <button onClick={() => setIsAddAccountModalOpen(true)} className="inline-flex items-center justify-center px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-brand-600 transition-colors">
            <Plus className="w-5 h-5 mr-2 -ml-1" />
            Add New Account
          </button>
        </header>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-sm font-semibold text-brand">{currentPlanDetails.name}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                        {monthlyAutomationExecutions.toLocaleString()}
                        <span className="text-lg font-medium text-slate-500"> / {typeof automationLimit === 'number' ? automationLimit.toLocaleString() : 'Unlimited'}</span>
                    </p>
                    <p className="text-sm text-slate-500">Monthly Automations Used</p>
                </div>
                <button onClick={() => navigate('/settings/subscription')} className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                    Manage Billing <ArrowRight className="w-4 h-4 ml-2"/>
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-b border-slate-200">
            <div className="relative w-full sm:w-auto flex-grow">
              <Search className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
              <input type="text" placeholder="Search accounts..." className="w-full bg-slate-100 border-slate-200 rounded-lg pl-11 pr-4 py-2.5 focus:ring-2 focus:ring-brand/50 focus:border-brand transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="relative w-full sm:w-auto">
              <select className="w-full bg-slate-100 border-slate-200 rounded-lg pl-4 pr-10 py-2.5 appearance-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
          ) : (
            <AccountsTable
              accounts={filteredAccounts}
              onDelete={deleteAccount}
            />
          )}
        </div>

        <AddAccountModal
          isOpen={isAddAccountModalOpen}
          onClose={() => setIsAddAccountModalOpen(false)}
          onSelectPlatform={handleSelectPlatform}
        />
        <InstagramConnectModal
          isOpen={isInstagramConnectModalOpen}
          onClose={() => {
            setIsInstagramConnectModalOpen(false);
            showMessage("New account connected successfully!", "success");
          }}
        />

        {/* --- THIS IS THE CORRECTED PART --- */}
        <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            planName={currentPlanDetails.name}
            limit={currentPlanDetails.maxAutomations}
        />
      </div>
    </div>
  );
};

export default Index;
// src/pages/Index.tsx

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AdminHeader from '../components/AdminHeader';
import AccountsTable from '../components/AccountsTable';
import MessageAlert from '../components/MessageAlert';
import AddAccountModal from '../components/AddAccountModal';
import InstagramConnectModal from "../components/InstagramConnectModal";
import { Account } from '../types';

const Index = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userRole, subscription } = useAuth(); // FIX: Get subscription from useAuth
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isInstagramConnectModalOpen, setIsInstagramConnectModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  // FIX: Renamed state to monthlyAutomationExecutions
  const [monthlyAutomationExecutions, setMonthlyAutomationExecutions] = useState(0);

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  const fetchAccounts = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const accountsCollectionRef = collection(db, "clients");
      const q = userRole === 'admin'
        ? query(accountsCollectionRef)
        : query(accountsCollectionRef, where("agencyId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      const accountsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Account[];
      setAccounts(accountsData);
    } catch (err) {
      console.error(err);
      showMessage("Failed to fetch accounts.", "error");
    }
    setLoading(false);
  }, [currentUser, userRole]);

  useEffect(() => {
    if (currentUser) {
      fetchAccounts();
    }
  }, [currentUser, fetchAccounts]);

  useEffect(() => {
    const handleStorageChange = () => {
      if (localStorage.getItem('reloadAccounts') === 'true') {
        console.log('Account change detected, reloading data...');
        fetchAccounts();
        localStorage.removeItem('reloadAccounts');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchAccounts]);

  const deleteAccount = async (accountId: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, 'clients', accountId));
      showMessage("Account deleted successfully.", "success");
      fetchAccounts();
    } catch (err) {
      console.error(err);
      showMessage("Error deleting account.", "error");
    }
  };

  // FIX: Modified fetchMonthlyAutomationExecutions
  useEffect(() => {
    const fetchMonthlyAutomationExecutions = async () => {
      if (!currentUser) {
        setMonthlyAutomationExecutions(0);
        return;
      }

      let totalExecutionsThisMonth = 0;
      try {
        if (accounts.length === 0 && !loading) {
          setMonthlyAutomationExecutions(0);
          return;
        }

        const today = new Date();
        const currentMonthYear = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;

        for (const account of accounts) {
          const analyticsCollectionRef = collection(db, `analytics/${account.id}/daily`);
          const q = query(analyticsCollectionRef);
          const querySnapshot = await getDocs(q);

          querySnapshot.docs.forEach(docSnap => {
            const docId = docSnap.id;
            if (docId.startsWith(currentMonthYear)) {
              const dailyData = docSnap.data();
              // FIX: Prioritize 'total_automations' if available, else sum DMs and comments
              totalExecutionsThisMonth += (dailyData?.total_automations || (dailyData?.automated_dms || 0) + (dailyData?.automated_comments || 0));
            }
          });
        }
        setMonthlyAutomationExecutions(totalExecutionsThisMonth);
      } catch (error) {
        console.error("[Index] Error fetching monthly automation executions:", error);
        setMonthlyAutomationExecutions(0);
      }
    };

    if (currentUser && !loading) {
        fetchMonthlyAutomationExecutions();
    }
  }, [currentUser, accounts, loading]);

  const handleSelectPlatform = (platform: string) => {
    setIsAddAccountModalOpen(false);
    if (platform === 'instagram' || platform === 'facebook') {
      setIsInstagramConnectModalOpen(true);
    } else {
      alert(`${platform} integration is under construction.`);
    }
  };

  const filteredAccounts = accounts.filter((account) =>
    (account.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true) &&
    (filterStatus === "all" || account.subscriptionStatus === filterStatus)
  );

  const currentPlanId = (subscription?.planId || 'free');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onAddClient={() => setIsAddAccountModalOpen(true)}
          currentPlanId={currentPlanId as any}
          automatedExecutions={monthlyAutomationExecutions} // FIX: Pass automatedExecutions
        />
        {message && <MessageAlert message={message} type={messageType} onClose={() => setMessage("")} />}
        
        <div className="mt-8">
            <AccountsTable
              accounts={filteredAccounts}
              loading={loading}
              onDelete={deleteAccount}
            />
        </div>

        <AddAccountModal
          isOpen={isAddAccountModalOpen}
          onClose={() => setIsAddAccountModalOpen(false)}
          onSelectPlatform={handleSelectPlatform}
        />
        <InstagramConnectModal
          isOpen={isInstagramConnectModalOpen}
          onClose={() => setIsInstagramConnectModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default Index;

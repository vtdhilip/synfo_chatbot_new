// In src/pages/AgencyAccountsPage.tsx

import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AdminHeader from '../components/AdminHeader';
import AccountsTable from '../components/AccountsTable';
import MessageAlert from '../components/MessageAlert';
import AddAccountModal from '../components/AddAccountModal';
import InstagramConnectModal from "../components/InstagramConnectModal";
import { type Account } from '../types';

const AgencyAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userRole } = useAuth();
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isInstagramConnectModalOpen, setIsInstagramConnectModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchAccounts = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const accountsCollectionRef = collection(db, "clients");
      const q = query(accountsCollectionRef, where("agencyId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      const accountsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Account[];
      setAccounts(accountsData);
    } catch (err) {
      console.error(err);
      showMessage("Failed to fetch accounts.", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) { fetchAccounts(); }
  }, [currentUser, userRole]);

  const deleteAccount = async (accountId: string) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'clients', accountId));
      showMessage("Account deleted successfully.", "success");
      fetchAccounts();
    } catch (err) {
      console.error(err);
      showMessage("Error deleting account.", "error");
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  const handleSelectPlatform = (platform: string) => {
    setIsAddAccountModalOpen(false);
    if (platform === 'instagram' || platform === 'facebook') {
      setIsInstagramConnectModalOpen(true);
    } else {
      alert(`${platform} integration is under construction.`);
    }
  };

  // --- FIX: handleEditAccount and handleGetAuthLink functions removed ---

  const filteredAccounts = accounts.filter((account) =>
    (account.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true) &&
    (filterStatus === "all" || account.subscriptionStatus === filterStatus)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onAddClient={() => setIsAddAccountModalOpen(true)}
        />
        {message && <MessageAlert message={message} type={messageType} onClose={() => setMessage("")} />}
        
        <div className="mt-8">
            {/* --- FIX: onEdit and onGetAuthLink props removed from the call --- */}
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

export default AgencyAccountsPage;
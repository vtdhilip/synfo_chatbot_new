// src/components/AccountsTable.tsx

import React, { useState } from 'react';
import { LayoutDashboard, Trash2, Bot,  AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { type Account } from '../types';

interface AccountsTableProps {
  accounts: Account[];
  onDelete: (id: string) => void;
}

// A new sub-component for the deletion confirmation modal with the requested styling
const DeleteConfirmationModal = ({ accountName, onConfirm, onCancel }: { accountName: string, onConfirm: () => void, onCancel: () => void }) => (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div 
            className="bg-gradient-to-br from-violet-50 via-orange-50 to-sky-50 rounded-xl shadow-2xl w-full max-w-md p-6 text-center border border-white/30"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
                Are you sure?
            </h2>
            <p className="text-slate-500 my-4">
                This will permanently delete the account for <span className="font-semibold text-slate-700">{accountName}</span> and all of its automations. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-4 mt-6">
                <button
                    onClick={onCancel}
                    className="w-full bg-white/50 text-slate-800 font-semibold py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-white/80 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="w-full bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                    Yes, Delete Account
                </button>
            </div>
        </div>
    </div>
);


const AccountsTable: React.FC<AccountsTableProps> = ({ accounts, onDelete }) => {
  const { userRole } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const handleDeleteClick = (account: Account) => {
    setAccountToDelete(account);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      onDelete(accountToDelete.id);
    }
    setShowDeleteModal(false);
    setAccountToDelete(null);
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-20 px-6 bg-white rounded-xl shadow-lg border border-slate-200">
        <Bot className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-lg font-semibold text-slate-800">No Accounts Found</h3>
        <p className="mt-1 text-slate-500">Get started by adding your first Instagram account.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <ul className="divide-y divide-slate-200">
          {accounts.map((account) => (
            <li key={account.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center min-w-0">
                <img 
                  src={(account as any).profilePictureUrl || `https://ui-avatars.com/api/?name=${account.clientName}&background=random`} 
                  alt={account.clientName} 
                  className="w-10 h-10 rounded-full object-cover mr-4 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{account.clientName}</p>
                  {userRole === 'admin' && (
                    <p className="text-sm text-slate-500 truncate">Agency: {account.agencyName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4 ml-4 flex-shrink-0">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    account.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                  {account.subscriptionStatus}
                </span>
                <Link
                  to={`/dashboard/${account.id}`}
                  className="p-2.5 rounded-full text-slate-500 hover:text-brand hover:bg-brand-50 transition-colors"
                  title="Go to Dashboard"
                >
                  <LayoutDashboard className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => handleDeleteClick(account)} 
                  className="p-2.5 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" 
                  title="Delete Account"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {showDeleteModal && accountToDelete && (
        <DeleteConfirmationModal 
            accountName={accountToDelete.clientName}
            onConfirm={confirmDelete}
            onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
};

export default AccountsTable;

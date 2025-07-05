import {   LayoutDashboard, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type Account } from '../pages/Index'; // Import the Account type
import { useAuth } from '../context/AuthContext';

interface AccountsTableProps {
  accounts: Account[];
  loading: boolean;
  onDelete: (id: string) => void;
  onGetAuthLink: (account: Account) => void;
  // onEdit and onToggleStatus might be handled on other pages now
  onEdit: (account: Account) => void; 
}

const AccountsTable: React.FC<AccountsTableProps> = ({ 
  accounts, 
  loading, 
  onDelete, 
}) => {
  const { userRole } = useAuth();

  if (loading) {
    return <div className="text-center p-8 text-gray-500">Loading accounts...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed">
        <h3 className="text-lg font-medium text-gray-900">No Accounts Connected</h3>
        <p className="mt-1 text-sm text-gray-500">Click "Add Account" to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
              {userRole === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{account.clientName}</div>
                  <div className="text-sm text-gray-500">ID: {account.instagramPageId}</div>
                </td>
                {userRole === 'admin' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.agencyName}</td>
                )} <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      account.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {account.subscriptionStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-1">
                    <Link
                      to={`/dashboard/${account.id}`}
                      className="flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-gray-700 rounded-md hover:bg-gray-800 transition-colors"
                      title="Go to Dashboard"
                    >
                      <LayoutDashboard className="w-3 h-3 mr-1.5" />
                      Dashboard
                    </Link>
                    
                      <button onClick={() => onDelete(account.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Delete Account">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountsTable;
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import MessageAlert from '../components/MessageAlert';

const SecuritySettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPassword !== confirmPassword) {
      setMessageType('error');
      setMessage('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
        setMessageType('error');
        setMessage('New password must be at least 6 characters long.');
        return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Re-authenticate the user first for security
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // If re-authentication is successful, update the password
      await updatePassword(currentUser, newPassword);

      setMessageType('success');
      setMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessageType('error');
      setMessage(`Failed to update password: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Check if the user signed in with a password provider
  const hasPasswordProvider = currentUser?.providerData.some(
    (provider) => provider.providerId === 'password'
  );

  if (!hasPasswordProvider) {
    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Security Settings</h2>
            <p className="text-gray-600">You have signed in with a social account (like Google or Facebook). You can manage your password through your social provider.</p>
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Change Password</h2>
      {message && (
        <MessageAlert
          message={message}
          type={messageType}
          onClose={() => setMessage(null)}
        />
      )}
      <form onSubmit={handleChangePassword} className="space-y-6">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SecuritySettingsPage;
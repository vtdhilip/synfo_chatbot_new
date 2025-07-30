// src/pages/SecuritySettingsPage.tsx

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import MessageAlert from '../components/MessageAlert';
import { Lock, Eye, EyeOff, Save, Loader2, Info } from 'lucide-react';

const SecuritySettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // State for password visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setMessageType('success');
      setMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessageType('error');
      let errorMessage = 'Failed to update password. Please try again.';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'The current password you entered is incorrect.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      }
      setMessage(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const hasPasswordProvider = currentUser?.providerData.some(
    (provider) => provider.providerId === 'password'
  );

  const inputStyles = "w-full pl-11 pr-11 py-2.5 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all";

  if (!hasPasswordProvider) {
    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Security Settings</h2>
            <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">You have signed in using a social account (like Google or Facebook). Your password can be managed through your social provider's settings.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Change Password</h2>
      {message && (
        <div className="mb-6">
            <MessageAlert
            message={message}
            type={messageType}
            onClose={() => setMessage(null)}
            />
        </div>
      )}
      <form onSubmit={handleChangePassword} className="space-y-6">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
            <input id="currentPassword" type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputStyles} required />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute top-1/2 right-3.5 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
           <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
            <input id="newPassword" type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputStyles} required />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute top-1/2 right-3.5 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
            <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputStyles} required />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute top-1/2 right-3.5 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div className="flex justify-end pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SecuritySettingsPage;

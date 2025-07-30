// src/pages/ProfileSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import MessageAlert from '../components/MessageAlert';
import { User, Building, Mail, Save, Loader2 } from 'lucide-react';

const ProfileSettingsPage: React.FC = () => {
  const { currentUser, agencyName } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [currentAgencyName, setCurrentAgencyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
    }
    if (agencyName) {
      setCurrentAgencyName(agencyName);
    }
  }, [currentUser, agencyName]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setMessage(null);

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName: displayName,
        agencyName: currentAgencyName,
      });

      setMessageType('success');
      setMessage('Profile updated successfully!');
    } catch (error: any) {
      setMessageType('error');
      setMessage(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = "w-full pl-11 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all";
  const disabledInputStyles = "w-full pl-11 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed text-slate-500";

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Profile Settings</h2>
      {message && (
        <div className="mb-6">
            <MessageAlert
            message={message}
            type={messageType}
            onClose={() => setMessage(null)}
            />
        </div>
      )}
      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div>
          <label htmlFor="displayName" className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
          <div className="relative">
            <User className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
            <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputStyles} />
          </div>
        </div>
        <div>
          <label htmlFor="agencyName" className="block text-sm font-semibold text-slate-700 mb-1.5">Agency Name</label>
          <div className="relative">
            <Building className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
            <input id="agencyName" type="text" value={currentAgencyName} onChange={(e) => setCurrentAgencyName(e.target.value)} className={inputStyles} />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
            <input id="email" type="email" value={currentUser?.email || ''} disabled className={disabledInputStyles} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Email address cannot be changed.
          </p>
        </div>
        <div className="flex justify-end pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettingsPage;

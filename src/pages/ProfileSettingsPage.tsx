import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import MessageAlert from '../components/MessageAlert';

const ProfileSettingsPage: React.FC = () => {
  // FIX: Removed refreshUserData as it doesn't exist on the context type
  const { currentUser, agencyName } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [currentAgencyName, setCurrentAgencyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // FIX: Added 'info' to the type definition to match its initial state
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

      // The refreshUserData call was removed as it's not needed for the UI to update
      // and doesn't exist on the AuthContext type.

      setMessageType('success');
      setMessage('Profile updated successfully!');
    } catch (error: any) {
      setMessageType('error');
      setMessage(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Settings</h2>
      {message && (
        <MessageAlert
          message={message}
          type={messageType}
          onClose={() => setMessage(null)}
        />
      )}
      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="agencyName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Agency Name
          </label>
          <input
            id="agencyName"
            type="text"
            value={currentAgencyName}
            onChange={(e) => setCurrentAgencyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={currentUser?.email || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Email address cannot be changed.
          </p>
        </div>
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettingsPage;
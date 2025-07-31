import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, Timestamp, onSnapshot } from 'firebase/firestore'; // Import onSnapshot
import { auth, db } from '../firebase';
import GlobalLoader from '../components/GlobalLoader';

// --- Step 1: Define the Permissions interface ---
// This ensures your permissions object is strongly typed.
interface Permissions {
  flowLimit: number;
  pageLimit: number;
  hasDelayedReplies: boolean;
  hasLinkEmbed: boolean;
  hasFollowerCheck: boolean;
  allowsCombinedReply: boolean;
}

// --- Step 2: Add Permissions to your User Data interface ---
interface CustomUserData {
  role: 'admin' | 'agency';
  agencyName?: string;
  plan?: string; // It's good practice to store the plan name
  permissions?: Permissions; // Add the permissions object
  subscription?: {
    planId: string;
    status: 'active' | 'inactive' | 'cancelled' | 'trialing' | 'pending';
    subscribedAt?: Timestamp;
  };
}

// --- Step 3: Expose Permissions through the Context Type ---
interface AuthContextType {
  currentUser: User | null;
  userRole: 'admin' | 'agency' | null;
  agencyName: string | null;
  subscription: CustomUserData['subscription'] | null;
  permissions: Permissions | null; // Expose permissions
  isAppLoading: boolean;
  setAppLoading: (isLoading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agency' | null>(null);
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<CustomUserData['subscription'] | null>(null);
  // --- Step 4: Create state for permissions ---
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [isAppLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      let docUnsubscribe: () => void = () => {}; // To hold the onSnapshot listener

      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        
        // --- Step 5: Switch from getDoc to onSnapshot for real-time updates ---
        // This listener will automatically fire when the webhook updates the user's document.
        docUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const customData = docSnap.data() as CustomUserData;
            setUserRole(customData.role);
            setAgencyName(customData.agencyName || null);
            setSubscription(customData.subscription || null);
            // Set the permissions state from the user document
            setPermissions(customData.permissions || null);
          } else {
            // Reset all data if user document doesn't exist
            setUserRole(null);
            setAgencyName(null);
            setSubscription(null);
            setPermissions(null);
          }
          setAppLoading(false);
        });

      } else {
        // No user, reset everything
        setCurrentUser(null);
        setUserRole(null);
        setAgencyName(null);
        setSubscription(null);
        setPermissions(null);
        setAppLoading(false);
      }

      // Cleanup function for the document listener
      return () => {
        docUnsubscribe();
      };
    });

    // Cleanup function for the auth listener
    return () => authUnsubscribe();
  }, []);

  const value = {
    currentUser,
    userRole,
    agencyName,
    subscription,
    permissions, // --- Step 6: Provide permissions to the rest of your app ---
    isAppLoading,
    setAppLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {isAppLoading ? <GlobalLoader /> : children}
    </AuthContext.Provider>
  );
};
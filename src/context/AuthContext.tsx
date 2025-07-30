import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import GlobalLoader from '../components/GlobalLoader';

// Interfaces remain the same
interface CustomUserData {
  role: 'admin' | 'agency';
  agencyName?: string;
  subscription?: {
    planId: string;
    status: 'active' | 'inactive' | 'cancelled' | 'trialing' | 'pending';
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    amountPaid?: number;
    currency?: string;
    subscribedAt?: Timestamp;
  };
}

interface AuthContextType {
  currentUser: User | null;
  userRole: 'admin' | 'agency' | null;
  agencyName: string | null;
  subscription: CustomUserData['subscription'] | null;
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
  const [isAppLoading, setAppLoading] = useState(true); // Manages global loading

  useEffect(() => {
    // This effect runs once to determine the initial auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const customData = userDocSnap.data() as CustomUserData;
          setUserRole(customData.role);
          setAgencyName(customData.agencyName || null);
          setSubscription(customData.subscription || null);
        } else {
          setUserRole(null);
          setAgencyName(null);
          setSubscription(null);
        }
      } else {
        setUserRole(null);
        setAgencyName(null);
        setSubscription(null);
      }
      setAppLoading(false); // Finished loading, ready to show the app
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userRole,
    agencyName,
    subscription,
    isAppLoading,
    setAppLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* THIS IS THE IMPLEMENTATION OF THE GLOBAL LOADER:
        It shows the full-screen loader *instead of* the app while loading.
        Once loading is false, it renders the app's children.
      */}
      {isAppLoading ? <GlobalLoader /> : children}
    </AuthContext.Provider>
  );
};
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore'; // FIX: Import Timestamp directly
import { auth, db } from '../firebase'; // Your firebase config file

// FIX: Updated CustomUserData interface to include subscription
interface CustomUserData {
  role: 'admin' | 'agency';
  agencyName?: string;
  subscription?: { // Added subscription details
    planId: string;
    status: 'active' | 'inactive' | 'cancelled' | 'trialing' | 'pending';
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    amountPaid?: number;
    currency?: string;
    subscribedAt?: Timestamp; // FIX: Use Timestamp directly
    // Add other relevant subscription fields you store in Firestore
  };
}

// FIX: Updated AuthContextType interface to include subscription
interface AuthContextType {
  currentUser: User | null;
  userRole: 'admin' | 'agency' | null;
  agencyName: string | null;
  subscription: CustomUserData['subscription'] | null; // Expose subscription
  loading: boolean;
}

// FIX: Added subscription to the default context value
const AuthContext = createContext<AuthContextType>({ currentUser: null, userRole: null, agencyName: null, subscription: null, loading: true });

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agency' | null>(null);
  const [agencyName, setAgencyName] = useState<string | null>(null);
  // FIX: Added subscription state
  const [subscription, setSubscription] = useState<CustomUserData['subscription'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const customData = userDocSnap.data() as CustomUserData;
          setUserRole(customData.role);
          setAgencyName(customData.agencyName || null);
          // FIX: Set subscription data
          setSubscription(customData.subscription || null);
           console.log("[AuthContext] User logged in:", user.uid);
          console.log("[AuthContext] User document data:", customData);
          console.log("[AuthContext] Subscription data set:", customData.subscription);

        } else {
          setUserRole(null);
          setAgencyName(null);
          setSubscription(null); // FIX: Clear subscription if user doc doesn't exist
        }
      } else {
        setUserRole(null);
        setAgencyName(null);
        setSubscription(null); // FIX: Clear subscription on logout
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // FIX: Added subscription to the value object
  const value = { currentUser, userRole, agencyName, subscription, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

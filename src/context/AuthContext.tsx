import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Your firebase config file

interface CustomUserData {
  role: 'admin' | 'agency';
  agencyName?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userRole: 'admin' | 'agency' | null;
  agencyName: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, userRole: null, agencyName: null, loading: true });

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agency' | null>(null);
  const [agencyName, setAgencyName] = useState<string | null>(null);
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
        } else {
          setUserRole(null);
          setAgencyName(null);
        }
      } else {
        setUserRole(null);
        setAgencyName(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = { currentUser, userRole, agencyName, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebase';

// Define the shape of our custom user data from Firestore
interface CustomUserData {
  role: 'admin' | 'agency';
  agencyName?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userRole: 'admin' | 'agency' | null;
  agencyName: string | null; // <-- New: The agency's name
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, userRole: null, agencyName: null, loading: true });

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agency' | null>(null);
  const [agencyName, setAgencyName] = useState<string | null>(null); // <-- New
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
          setAgencyName(customData.agencyName || null); // <-- New
        } else {
          setUserRole(null);
          setAgencyName(null); // <-- New
        }
      } else {
        setUserRole(null);
        setAgencyName(null); // <-- New
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    agencyName, // <-- New
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
// src/components/GlobalHeader.tsx

import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LogOut, Settings, Shield } from 'lucide-react';

const GlobalHeader = () => {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  const handleLogout = async () => {
     try {
         await signOut(auth);
         navigate('/login');
     } catch (err) {
         console.error("Logout error:", err);
     }
  };

  const navLinkStyles = "inline-flex items-center px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors";

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-xl font-bold text-slate-800">
                Synaptic Info
            </Link>
            <nav className="flex items-center space-x-2">
                {currentUser && userRole === 'admin' && (
                <Link to="/admin" className={navLinkStyles}>
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                </Link>
                )}
                {currentUser && (
                <Link to="/settings/profile" className={navLinkStyles}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                </Link>
                )}
                {currentUser && (
                    <button onClick={handleLogout} className={`${navLinkStyles} text-red-600 hover:bg-red-50 hover:text-red-700`}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </button>
                )}
            </nav>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;

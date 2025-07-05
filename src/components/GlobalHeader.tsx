
import { Link, useNavigate } from 'react-router-dom'; // Import Link
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

import { NavLink } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
const GlobalHeader = () => {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  const handleLogout = async () => {
     try {
         await signOut(auth);
         navigate('/login'); // Redirect to login page after logout
     } catch (err) {
         console.error("Logout error:", err);
     }
  };

  const styles = {
     header: {
         padding: '1rem 2rem',
         backgroundColor: 'white',
         boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
         display: 'flex',
         justifyContent: 'space-between',
         alignItems: 'center'
     },
     siteTitle: {
         fontSize: '1.25rem',
         fontWeight: 'bold',
         color: '#1f2937'
     },
     logoutButton: {
         padding: '0.5rem 1rem',
         borderRadius: '0.5rem',
         border: '1px solid #d1d5db',
         backgroundColor: 'transparent',
         cursor: 'pointer',
         fontWeight: '500'
     }
  };

  return (
    <header style={styles.header}>
      <Link to="/" style={styles.siteTitle}>Synaptic Info</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* --- THIS IS THE CONDITIONAL LINK --- */}
        {userRole === 'admin' && (
          <Link to="/agencies" style={styles.logoutButton}>Manage Agencies</Link>
        )}
        {currentUser && (
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        )}
        <NavLink
    to="/inbox"
    className={({ isActive }) =>
      `flex items-center px-4 py-2 rounded-lg ${
        isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
      }`
    }
  >
    <MessageSquare className="h-5 w-5 mr-3" />
    <span>Inbox</span>
  </NavLink>
      </div>
    </header>
  );
};

export default GlobalHeader;

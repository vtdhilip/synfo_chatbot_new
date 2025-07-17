import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

const GlobalHeader = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleLogout = async () => {
     try {
         await signOut(auth);
         navigate('/login');
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
        {/* MODIFIED: Link to settings, not just subscription */}
        {currentUser && (
          <Link to="/settings/profile" style={styles.logoutButton}>Settings</Link>
        )}
        {currentUser && (
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        )}
      </div>
    </header>
  );
};

export default GlobalHeader;
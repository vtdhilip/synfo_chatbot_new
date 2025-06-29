import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Get current user to decide what to show
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/'); // Redirect to dashboard on success
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
    }
  };

  const handleLogout = async () => {
     try {
         await signOut(auth);
         navigate('/login'); // Redirect to login page after logout
     } catch (err) {
         console.error("Logout error:", err);
         alert("Failed to log out.");
     }
  };

  const styles = {
     header: {
         position: 'absolute' as 'absolute',
         top: 0,
         left: 0,
         right: 0,
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
         cursor: 'pointer'
     }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f3f4f6' }}>
     <div style={styles.header}>
         <div style={styles.siteTitle}>Synaptic Info</div>
         {currentUser && (
             <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
         )}
     </div>

      <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '24rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem' }}>Admin Login</h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
            />
          </div>
          {error && <p style={{ color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</p>}
          <button type="submit" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#2563eb', color: 'white', cursor: 'pointer' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

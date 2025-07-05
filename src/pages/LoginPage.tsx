

// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,  // 👈 Import Google provider
  FacebookAuthProvider, // 👈 Import Facebook provider
  signInWithPopup,  
  
  linkWithCredential    // 👈 Import signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from "firebase/firestore"; // 👈 Import Firestore functions

const LoginPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // --- This function handles creating a user profile in your database on first login ---
  const handleSocialSignIn = async (result: any) => {
    const user = result.user;
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    // If the user document doesn't exist, it's their first time logging in
    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName,
        role: 'agency', // Assign a default role
        agencyName: user.displayName || 'New Agency',
        createdAt: new Date()
      });
    }
    navigate('/'); // Redirect to dashboard
  };

  const handleGoogleSignIn = () => {
     const provider = new GoogleAuthProvider();
     signInWithPopup(auth, provider)
      .then(handleSocialSignIn)
      .catch(async (error) => {
        if (error.code === 'auth/account-exists-with-different-credential') {
          const pendingCred = GoogleAuthProvider.credentialFromError(error);
          const email = error.customData.email;
          const password = prompt(`An account with ${email} already exists. To link your Google account, please enter your password.`);
          if (password) {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              await linkWithCredential(userCredential.user, pendingCred!);
              alert("Success! Your Google account has been linked.");
              navigate('/');
            } catch (linkError) {
              setError("Failed to link accounts. Please check your password.");
            }
          }
        } else {
          setError(error.message);
        }
      });
  };

  const handleFacebookSignIn = () => {
    const provider = new FacebookAuthProvider();
    signInWithPopup(auth, provider)
      .then(handleSocialSignIn)
      .catch((err) => setError(err.message));
  };
  
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
         top: 0, left: 0, right: 0, padding: '1rem 2rem',
         backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
         display: 'flex', justifyContent: 'space-between', alignItems: 'center'
     },
     siteTitle: {
         fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937'
     },
     logoutButton: {
         padding: '0.5rem 1rem', borderRadius: '0.5rem',
         border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer',
         fontWeight: 500,
     },
     // --- NEW STYLE FOR ICON-ONLY BUTTONS ---
     iconButton: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '3rem', // 48px
        height: '3rem', // 48px
        border: '1px solid #e5e7eb',
        borderRadius: '50%', // Makes it circular
        backgroundColor: 'white',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
     },
  };


  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f3f4f6' }}>
      <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '24rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem' }}>Admin Login</h1>
        
        {/* Social Login Buttons */}
       <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button title="Continue with Google" onClick={handleGoogleSignIn} style={styles.iconButton} onMouseOver={(e) => e.currentTarget.style.backgroundColor='#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor='white'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 262 262" preserveAspectRatio="xMidYMid"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>
          </button>
          <button title="Continue with Facebook" onClick={handleFacebookSignIn} style={styles.iconButton} onMouseOver={(e) => e.currentTarget.style.backgroundColor='#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor='white'}>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2" width="24px" height="24px"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
          </button>
        </div>

        <div style={{ textAlign: 'center', margin: '1rem 0', color: '#6b7280' }}>OR</div>
<div style={styles.header}>
         <div style={styles.siteTitle}>Synaptic Info</div>
         {currentUser && (
             <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
         )}
     </div>
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

        {error && <p style={{ color: '#ef4444', marginTop: '1.5rem', fontSize: '0.875rem' }}>{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
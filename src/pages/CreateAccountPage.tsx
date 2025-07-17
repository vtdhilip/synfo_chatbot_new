// src/pages/CreateAccountPage.tsx

import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom'; // Import useLocation
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from "firebase/firestore";

const CreateAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Get location object to access URL query params
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Determine redirect path from URL query parameter
  const redirectPath = new URLSearchParams(location.search).get('redirect_to') || '/';

  // --- This function handles creating a user profile in your database on first signup ---
  // Modify handleUserProfileCreation to accept a specific redirect path
  const handleUserProfileCreation = async (user: any, displayName: string | null, path: string) => { // Added 'path' parameter
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      displayName: displayName || user.email,
      role: 'agency', // Assign a default role for new signups
      agencyName: displayName || 'New Agency', // Default agency name
      createdAt: new Date()
    });
    navigate(path, { replace: true }); // Use the passed 'path' for redirection
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password || !confirmPassword) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await handleUserProfileCreation(userCredential.user, userCredential.user.displayName, redirectPath); // Pass redirectPath
    } catch (err: any) {
      console.error("Email signup error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use.');
      } else {
        setError(`Failed to create account: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Check if user already exists in Firestore users collection
      const userDocRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        await handleUserProfileCreation(result.user, result.user.displayName, redirectPath); // Pass redirectPath
      } else {
        navigate(redirectPath, { replace: true }); // Also redirect if user already exists
      }
    } catch (err: any) {
      console.error("Google signup error:", err);
      setError(`Failed to sign up with Google: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    setLoading(true);
    setError('');
    const provider = new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Check if user already exists in Firestore users collection
      const userDocRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        await handleUserProfileCreation(result.user, result.user.displayName, redirectPath); // Pass redirectPath
      } else {
        navigate(redirectPath, { replace: true }); // Also redirect if user already exists
      }
    } catch (err: any) {
      console.error("Facebook signup error:", err);
      setError(`Failed to sign up with Facebook: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    // Re-using styles from LoginPage for consistency
    container: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f3f4f6'
    },
    card: {
        padding: '2rem', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '24rem'
    },
    title: {
        fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' as 'center', marginBottom: '1.5rem'
    },
    inputGroup: {
        marginBottom: '1rem'
    },
    label: {
        display: 'block', marginBottom: '0.5rem', fontWeight: '500'
    },
    input: {
        width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db'
    },
    button: {
        width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#2563eb', color: 'white', cursor: 'pointer'
    },
    errorText: {
        color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.875rem'
    },
    socialButtonContainer: {
        display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem'
    },
    iconButton: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', border: '1px solid #e5e7eb', borderRadius: '50%', backgroundColor: 'white', cursor: 'pointer', transition: 'background-color 0.2s',
    },
    orDivider: {
        textAlign: 'center' as 'center', margin: '1rem 0', color: '#6b7280'
    },
    linkText: {
        textAlign: 'center' as 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280'
    },
    link: {
        color: '#2563eb', textDecoration: 'none', fontWeight: '600'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Your Account</h1>
        
        <div style={styles.socialButtonContainer}>
          <button type="button" title="Sign up with Google" onClick={handleGoogleSignup} style={styles.iconButton} onMouseOver={(e) => e.currentTarget.style.backgroundColor='#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor='white'} disabled={loading}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 262 262" preserveAspectRatio="xMidYMid"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>
          </button>
          <button type="button" title="Sign up with Facebook" onClick={handleFacebookSignup} style={styles.iconButton} onMouseOver={(e) => e.currentTarget.style.backgroundColor='#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor='white'} disabled={loading}>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2" width="24px" height="24px"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
          </button>
        </div>

        <div style={styles.orDivider}>OR</div>

        <form onSubmit={handleEmailSignup}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>
          <div style={styles.inputGroup}>
            <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>
          {error && <p style={styles.errorText}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>

        <p style={styles.linkText}>
          Already have an account? <Link to="/login" style={styles.link}>Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default CreateAccountPage;

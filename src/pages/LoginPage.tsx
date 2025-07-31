// src/pages/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  User, // Import the User type
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

// SVG Icon for Google
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 262 262" preserveAspectRatio="xMidYMid"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>
);

// SVG Icon for Facebook
const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2" width="20px" height="20px"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
);


const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const finalRedirectUrl = new URLSearchParams(location.search).get('redirect_to') || '/';

  useEffect(() => {
    if (currentUser) {
      navigate(finalRedirectUrl, { replace: true });
    }
  }, [currentUser, navigate, finalRedirectUrl]);

  // ✅ This function now creates the complete user profile, same as the sign-up page
  const handleUserProfileCreation = async (user: User, path: string) => {
    const userDocRef = doc(db, 'users', user.uid);

    const freePlanPermissions = {
        flowLimit: 1,
        executionLimit: 1000, 
        pageLimit: 1,
        hasDelayedReplies: false,
        hasLinkEmbed: false,
        hasFollowerCheck: false,
        allowsCombinedReply: false,
        hasAnalytics: false,
    };

    await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        agencyName: user.displayName || `User-${user.uid.substring(0, 5)}`,
        role: 'agency',
        plan: 'Free',
        permissions: freePlanPermissions,
        subscription: {
            planId: 'Free',
            status: 'active',
        },
        createdAt: serverTimestamp(),
    });
    
    navigate(path, { replace: true });
  };

  const processSocialLogin = async (provider: GoogleAuthProvider | FacebookAuthProvider, providerName: 'google' | 'facebook') => {
    setSocialLoading(providerName);
    setError('');
    try {
        const result = await signInWithPopup(auth, provider);
        const userDocRef = doc(db, 'users', result.user.uid);
        const docSnap = await getDoc(userDocRef);
        
        // If the user is new, create their full profile with permissions
        if (!docSnap.exists()) {
            await handleUserProfileCreation(result.user, finalRedirectUrl);
        } else {
            // If they are a returning user, just navigate
            navigate(finalRedirectUrl, { replace: true });
        }
    } catch (err: any) {
        console.error(`${providerName} sign-in error:`, err);
        setError(`Failed to sign in with ${providerName}. ${err.message}`);
    } finally {
        setSocialLoading(null);
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(finalRedirectUrl, { replace: true });
    } catch (err: any) {
      setError('Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const inputBaseStyles = "w-full pl-11 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/50 focus:border-brand transition";
  const socialButtonStyles = "w-full inline-flex items-center justify-center py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="w-full p-4 bg-white border-b border-slate-200">
            <div className="container mx-auto max-w-md">
                <h1 className="text-xl font-bold text-slate-800">Synaptic Info</h1>
            </div>
        </header>
        <main className="flex-grow flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
                    <p className="text-slate-500 mt-2">Log in to manage your automations.</p>
                </div>

                <div className="space-y-3">
                    <button type="button" onClick={() => processSocialLogin(new GoogleAuthProvider(), 'google')} className={socialButtonStyles} disabled={!!socialLoading}>
                        {socialLoading === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><GoogleIcon /><span className="ml-2">Continue with Google</span></>}
                    </button>
                    <button type="button" onClick={() => processSocialLogin(new FacebookAuthProvider(), 'facebook')} className={socialButtonStyles} disabled={!!socialLoading}>
                        {socialLoading === 'facebook' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FacebookIcon /><span className="ml-2">Continue with Facebook</span></>}
                    </button>
                </div>
                
                <div className="flex items-center my-6">
                    <hr className="flex-grow border-slate-200"/>
                    <span className="mx-4 text-xs font-medium text-slate-400">OR</span>
                    <hr className="flex-grow border-slate-200"/>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <Mail className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
                        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputBaseStyles} required disabled={loading} />
                    </div>
                    <div className="relative">
                        <Lock className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
                        <input 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className={`${inputBaseStyles} pr-11`}
                            required 
                            disabled={loading} 
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 right-3.5 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    
                    {error && (
                        <div className="flex items-start bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <button type="submit" className="w-full inline-flex items-center justify-center bg-brand text-white font-semibold py-3 px-4 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50" disabled={loading || !!socialLoading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-8">
                    Don't have an account? <Link to="/create-account" className="font-semibold text-brand hover:underline">Sign Up</Link>
                </p>
            </div>
        </main>
    </div>
  );
};

export default LoginPage;

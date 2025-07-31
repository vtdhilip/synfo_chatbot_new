// src/pages/CreateAccountPage.tsx

import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  User, // Import the User type
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"; // Import serverTimestamp
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

// SVG Icon for Google
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 262 262" preserveAspectRatio="xMidYMid"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>
);

const CreateAccountPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<'google' | null>(null);

    const redirectPath = new URLSearchParams(location.search).get('redirect_to') || '/';

    // --- UPDATED: This function now creates the complete user profile ---
    const handleUserProfileCreation = async (user: User, path: string) => {
        const userDocRef = doc(db, 'users', user.uid);

        // Define the default permissions for every new user on the Free plan
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

        // Set the complete document data
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
    
    const processSocialLogin = async (provider: GoogleAuthProvider, providerName: 'google') => {
        setSocialLoading(providerName);
        setError('');
        try {
            const result = await signInWithPopup(auth, provider);
            const userDocRef = doc(db, 'users', result.user.uid);
            const docSnap = await getDoc(userDocRef);
            
            // If the user is new, create their profile
            if (!docSnap.exists()) {
                await handleUserProfileCreation(result.user, redirectPath);
            } else {
                // If they are a returning user, just navigate
                navigate(redirectPath, { replace: true });
            }
        } catch (err: any) { // <-- FIX: Corrected syntax here
            console.error(`${providerName} signup error:`, err);
            setError(`Failed to sign up with ${providerName}. ${err.message}`);
        } finally {
            setSocialLoading(null);
        }
    };

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) return setError('Passwords do not match.');
        if (password.length < 6) return setError('Password must be at least 6 characters long.');
        
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // This now creates the full profile, not just a partial one
            await handleUserProfileCreation(userCredential.user, redirectPath);
        } catch (err: any) {
            console.error("Email signup error:", err);
            setError(err.code === 'auth/email-already-in-use' ? 'This email is already in use.' : `Failed to create account: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const inputBaseStyles = "w-full pl-11 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/50 focus:border-brand transition";
    const socialButtonStyles = "w-full inline-flex items-center justify-center py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Create Your Account</h1>
                    <p className="text-slate-500 mt-2">Join us and start automating your business.</p>
                </div>
                
                <div className="space-y-3">
                    <button type="button" onClick={() => processSocialLogin(new GoogleAuthProvider(), 'google')} className={socialButtonStyles} disabled={!!socialLoading}>
                        {socialLoading === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><GoogleIcon /><span className="ml-2">Sign up with Google</span></>}
                    </button>
                    {/* --- REMOVED Facebook Button --- */}
                </div>

                <div className="flex items-center my-6">
                    <hr className="flex-grow border-slate-200"/>
                    <span className="mx-4 text-xs font-medium text-slate-400">OR</span>
                    <hr className="flex-grow border-slate-200"/>
                </div>

                <form onSubmit={handleEmailSignup} className="space-y-4">
                    <div className="relative">
                        <Mail className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
                        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputBaseStyles} required disabled={loading} />
                    </div>
                    <div className="relative">
                        <Lock className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputBaseStyles} required disabled={loading} />
                    </div>
                    <div className="relative">
                        <Lock className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
                        <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputBaseStyles} required disabled={loading} />
                    </div>
                    
                    {error && (
                        <div className="flex items-start bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <button type="submit" className="w-full inline-flex items-center justify-center bg-brand text-white font-semibold py-3 px-4 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading || !!socialLoading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-8">
                    Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Log In</Link>
                </p>
            </div>
        </div>
    );
};

export default CreateAccountPage;

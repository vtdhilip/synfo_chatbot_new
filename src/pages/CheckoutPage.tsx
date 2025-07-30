// src/pages/CheckoutPage.tsx

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, ShieldCheck, Lock, XCircle } from 'lucide-react';

// Define a strict type for your Plan data
interface Plan {
    id: string;
    name: string;
    price: number;
    currency: string;
}

const loadRazorpayScript = (src: string) => {
    return new Promise<void>((resolve, reject) => {
        if (document.getElementById('razorpay-checkout-script')) {
            return resolve();
        }
        const script = document.createElement('script');
        script.id = 'razorpay-checkout-script';
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script ${src}`));
        document.body.appendChild(script);
    });
};

const CheckoutPage: React.FC = () => {
    const { currentUser, isAppLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlanAndLoadScript = async () => {
            setIsLoading(true);
            const queryParams = new URLSearchParams(location.search);
            const planId = queryParams.get('plan');

            if (!planId) {
                setError('No plan specified. Please select a plan.');
                setIsLoading(false);
                return;
            }

            try {
                const planDocRef = doc(db, 'plans', planId);
                const planSnap = await getDoc(planDocRef);

                if (!planSnap.exists()) {
                    setError('The selected plan is invalid or no longer available.');
                    setIsLoading(false);
                    return;
                }
                
                setPlan({ id: planSnap.id, ...planSnap.data() } as Plan);
                await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
                
            } catch (err) {
                console.error("Initialization failed:", err);
                setError("Failed to initialize the checkout process. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser) {
            fetchPlanAndLoadScript();
        }
    }, [location.search, currentUser]);


    // --- THIS IS THE CORRECTED FUNCTION ---
    const handlePayment = async () => {
        // Check against the 'plan' state variable, not 'plan.Id'
        if (!currentUser || !plan) {
            setError('User not logged in or plan not selected.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const functions = getFunctions();
            const createRazorpaySubscription = httpsCallable(functions, 'createRazorpaySubscription');
            
            // Use the plan id from the 'plan' state object
            const result = await createRazorpaySubscription({ planId: plan.id });

            const { subscriptionId, keyId } = (result.data as any);

            const options = {
                key: keyId,
                subscription_id: subscriptionId,
                name: "Synaptic Info",
                // Use the plan name from the 'plan' state object
                description: `Recurring subscription for ${plan.name}`,
                handler: () => {
                    alert('Payment successful! Your subscription will be activated shortly.');
                    navigate('/'); 
                },
                prefill: {
                    name: currentUser.displayName || '',
                    email: currentUser.email || '',
                },
                notes: {
                    userId: currentUser.uid,
                    // Use the plan id from the 'plan' state object
                    firestorePlanId: plan.id,
                },
                theme: {
                    color: "#ff5a00",
                },
                modal: {
                    ondismiss: () => {
                        setIsLoading(false);
                        setError('Payment was cancelled.');
                    },
                },
            };
            
            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (err: any) {
            setError(err.message || 'Failed to create subscription.');
            setIsLoading(false);
        }
    };
    
    // The rest of your component's JSX is correct and does not need to be changed.
    // ... (Loading and Auth States) ...
    // ... (Error State) ...
    // ... (Main Checkout View) ...

    if (authLoading) {
        return (
             <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Verifying authentication...</p>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8 text-center border border-red-200">
                    <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800">Checkout Error</h2>
                    <p className="text-slate-500 mt-2 mb-6">{error}</p>
                    <Link to="/pricing" className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Choose Another Plan
                    </Link>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8 text-center">
                
                <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center bg-blue-500 rounded-full">
                    <ShieldCheck className="w-9 h-9 text-white" />
                </div>
                
                <h1 className="text-3xl font-bold text-slate-900">Complete Your Purchase</h1>
                <p className="text-slate-500 mt-2">You're one step away from unlocking new features.</p>
                
                <div className="my-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
                    {plan && !isLoading ? (
                        <>
                            <h2 className="text-xl font-semibold text-slate-800">{plan.name} Plan</h2>
                            <p className="text-5xl font-bold text-slate-900 my-3">
                                ₹{(plan.price / 100).toLocaleString('en-IN')}
                                <span className="text-lg font-normal text-slate-500">/month</span>
                            </p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-28">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            <p className="text-slate-500 mt-2">Loading plan details...</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handlePayment}
                    disabled={isLoading || !plan}
                    className="w-full inline-flex items-center justify-center bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    <Lock className="w-4 h-4 mr-2" />
                    {isLoading ? 'Processing...' : 'Proceed to Secure Payment'}
                </button>
            </div>
        </div>
    );
};

export default CheckoutPage;
// src/pages/PaymentConfirmationPage.tsx

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const PaymentConfirmationPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [message, setMessage] = useState('Verifying your payment, please wait...');
    const [isSuccess, setIsSuccess] = useState<boolean | null>(null);

    useEffect(() => {
        const confirmPayment = async () => {
            const params = new URLSearchParams(location.search);
            const status = params.get('status');
            const paymentId = params.get('razorpay_payment_id');
            const orderId = params.get('razorpay_order_id');
            const signature = params.get('razorpay_signature');

            if (status !== 'success' || !paymentId || !orderId || !signature) {
                setMessage('Payment failed or details were missing. Please try again or contact support.');
                setIsSuccess(false);
                return;
            }

            try {
                const functions = getFunctions();
                const confirmSubscription = httpsCallable(functions, 'confirmSubscription');
                
                const result = await confirmSubscription({
                    razorpay_payment_id: paymentId,
                    razorpay_order_id: orderId,
                    razorpay_signature: signature,
                });

                if ((result.data as any).success) {
                    setMessage('Your subscription is now active! You will be redirected to your dashboard shortly.');
                    setIsSuccess(true);
                    setTimeout(() => {
                        navigate('/');
                    }, 3000);
                } else {
                    setMessage((result.data as any).message || 'Payment verification failed. Please contact support.');
                    setIsSuccess(false);
                }

            } catch (err: any) {
                setMessage(err.message || 'An unexpected error occurred during verification.');
                setIsSuccess(false);
            }
        };

        confirmPayment();
    }, [location, navigate]);
    
    const StateCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8 text-center border border-slate-200">
            {icon}
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            {children}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            {/* Loading State */}
            {isSuccess === null && (
                <StateCard 
                    icon={<Loader2 className="mx-auto h-12 w-12 text-brand animate-spin mb-4" />}
                    title="Verifying Payment..."
                >
                    <p className="text-slate-500 mt-2">{message}</p>
                </StateCard>
            )}

            {/* Success State */}
            {isSuccess === true && (
                <StateCard 
                    icon={<CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />}
                    title="Subscription Confirmed!"
                >
                    <p className="text-slate-500 mt-2">{message}</p>
                </StateCard>
            )}

            {/* Error State */}
            {isSuccess === false && (
                <StateCard 
                    icon={<XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />}
                    title="Payment Failed"
                >
                    <p className="text-slate-500 mt-2 mb-6">{message}</p>
                    <Link to="/" className="inline-flex items-center px-6 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors">
                        Return to Dashboard
                    </Link>
                </StateCard>
            )}
        </div>
    );
};

export default PaymentConfirmationPage;

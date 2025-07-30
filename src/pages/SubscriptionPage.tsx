import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import MessageAlert from '../components/MessageAlert';

// Define a strict type for your Plan data
interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  displayOrder: number;
}

// Initialize Firebase Functions
const functions = getFunctions();
const createPortalSession = httpsCallable(functions, 'createPortalSession');

const SubscriptionPage: React.FC = () => {
  const {  subscription, isAppLoading } = useAuth();
  const navigate = useNavigate();
  const [isManaging, setIsManaging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [allAvailablePlans, setAllAvailablePlans] = useState<Plan[]>([]);

  useEffect(() => {
    const plansQuery = query(collection(db, "plans"), orderBy("displayOrder"));
    const unsubscribe = onSnapshot(plansQuery, (snapshot) => {
        const plansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        setAllAvailablePlans(plansData);
    }, (error) => {
        console.error("Error fetching plans:", error);
        setErrorMessage("Could not load subscription plans. Please refresh the page.");
    });
    return () => unsubscribe();
  }, []);

  if (isAppLoading) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading Subscription Details...</p>
        </div>
    );
  }

  const isSubscribed = !!(subscription && subscription.status === 'active' && subscription.planId !== 'free');
  const currentPlanId = subscription?.planId || 'free';
  const currentPlanDetails = allAvailablePlans.find(p => p.id === currentPlanId);

  const handleManageSubscription = async () => {
    setIsManaging(true);
    setErrorMessage(null);
    try {
        const result: any = await createPortalSession();
        window.location.assign(result.data.url);
    } catch (error) {
        console.error("Error creating portal session:", error);
        setErrorMessage("Could not open subscription management. Please try again later.");
    } finally {
        setIsManaging(false);
    }
  };
  
  const handleSelectNewPlan = (planId: string) => {
    navigate(`/checkout?plan=${planId}`);
  };

  const upgradeablePlans = allAvailablePlans.filter(plan => plan.id !== 'free');

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Your Subscription</h2>
      <p className="text-slate-500 mb-6">Manage your plan and billing details.</p>

      {errorMessage && (
        <div className="mb-6">
            <MessageAlert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
        </div>
      )}

      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <p className="text-sm font-semibold text-brand">{currentPlanDetails?.name || 'Free Plan'}</p>
                <p className="text-slate-600 mt-1">
                    {isSubscribed ? `Subscribed on ${subscription?.subscribedAt ? subscription.subscribedAt.toDate().toLocaleDateString() : 'N/A'}` : 'You are currently on the free plan.'}
                </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0 flex-shrink-0">
                {isSubscribed && (
                    <button onClick={handleManageSubscription} disabled={isManaging} className="px-4 py-2 bg-white text-slate-700 text-sm font-semibold border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50">
                        {isManaging ? 'Loading...' : 'Manage Billing'}
                    </button>
                )}
                <button onClick={() => setShowUpgradeModal(true)} className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-600">
                    {isSubscribed ? 'Change Plan' : 'Upgrade Plan'}
                </button>
            </div>
        </div>
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Choose Your Plan</h2>
                <button onClick={() => setShowUpgradeModal(false)} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100">
                    <X className="w-5 h-5"/>
                </button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upgradeablePlans.map((plan) => (
                    <div key={plan.id} className={`border rounded-lg p-6 flex flex-col ${plan.id === currentPlanId ? 'border-brand ring-2 ring-brand/50' : 'border-slate-200'}`}>
                        <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                        <p className="text-3xl font-extrabold text-slate-900 my-4">
                            ₹{(plan.price / 100).toLocaleString('en-IN')}
                            <span className="text-base font-medium text-slate-500">/month</span>
                        </p>
                        <ul className="text-sm space-y-3 text-slate-600 my-4 flex-grow">
                            {plan.features?.map((feature, index) => (
                                <li key={index} className="flex items-start">
                                    <CheckCircle className="w-4 h-4 text-green-500 mr-3 mt-0.5 flex-shrink-0"/>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                        {plan.id === currentPlanId ? (
                             <button disabled className="w-full mt-auto px-4 py-2.5 bg-slate-200 text-slate-500 rounded-lg text-sm font-semibold cursor-not-allowed">
                                Current Plan
                            </button>
                        ) : (
                            <button onClick={() => handleSelectNewPlan(plan.id)} className="w-full mt-auto px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-600 transition-colors">
                                {allAvailablePlans.findIndex(p => p.id === plan.id) > allAvailablePlans.findIndex(p => p.id === currentPlanId) ? 'Upgrade' : 'Downgrade'}
                            </button>
                        )}
                    </div>
                ))}
                </div>
            </div>
            {isSubscribed && (
                 <div className="text-center p-6 border-t border-slate-200 bg-slate-50">
                    <p className="text-sm text-slate-500">To cancel your subscription, please go to 'Manage Billing'.</p>
                 </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;

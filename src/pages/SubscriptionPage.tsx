import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const SubscriptionPage: React.FC = () => {
  const { currentUser, subscription, loading } = useAuth();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [cancelMessageType, setCancelMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (loading) {
    return <div className="p-8 text-center text-gray-700">Loading subscription details...</div>;
  }

  if (!currentUser) {
    return <div className="p-8 text-center text-red-600">You must be logged in to view subscription details.</div>;
  }

  const isSubscribed = subscription && subscription.status === 'active';
  const currentPlanId = subscription?.planId; // Get the current plan ID
  const planName = currentPlanId || 'N/A';
  const subscribedAt = subscription?.subscribedAt ? subscription.subscribedAt.toDate().toLocaleDateString() : 'N/A';
  const amountPaid = subscription?.amountPaid ? `₹${(subscription.amountPaid / 100).toFixed(2)} ${subscription.currency}` : 'N/A';

  // FIX: handleCancelSubscription now accepts an optional 'fromDowngrade' flag
  const handleCancelSubscription = async (fromDowngrade: boolean = false) => {
    if (!fromDowngrade && !window.confirm("Are you sure you want to cancel your subscription? This action cannot be undone immediately.")) {
      return;
    }

    setIsCancelling(true);
    setCancelMessage(null); // Clear previous messages

    // If the user is on the free plan or not subscribed, simply show a message
    if (currentPlanId === 'free' || !isSubscribed) {
      setCancelMessage('You are currently on the Free / Starter plan. There is no paid subscription to cancel.');
      setCancelMessageType('info');
      setIsCancelling(false);
      return;
    }

    // If the user is on a paid plan, proceed with calling the backend cancel function
    try {
      const functionsInstance = getFunctions();
      const cancelSubscriptionCallable = httpsCallable(functionsInstance, 'cancelSubscription');

      const result = await cancelSubscriptionCallable();

      if ((result.data as any).success) {
        setCancelMessage((result.data as any).message || 'Subscription cancelled successfully! You have been moved to the Free / Starter plan.');
        setCancelMessageType('success');
        // The AuthContext listener will automatically update the UI as Firestore changes
      } else {
        setCancelMessage((result.data as any).message || 'Failed to cancel subscription.');
        setCancelMessageType('error');
      }
    } catch (error: any) {
      console.error("Error calling cancelSubscription function:", error);
      setCancelMessage(error.message || 'An unexpected error occurred during cancellation.');
      setCancelMessageType('error');
    } finally {
      setIsCancelling(false);
    }
  };

  // FIX: handleUpgradePlan now checks if the selected plan is 'free'
  const handleUpgradePlan = (planId: string) => {
    setShowUpgradeModal(false); // Close modal immediately

    if (planId === 'free') {
      // If user selects 'free' from upgrade modal while on a paid plan, treat as cancellation/downgrade
      handleCancelSubscription(true); // Call with fromDowngrade = true to skip confirm prompt
    } else {
      // For actual upgrades, redirect to checkout
      window.location.href = `https://synapticinfo.com/checkout.html?plan=${planId}`;
    }
  };

  // Define all available plans and their hierarchy for comparison
  const allAvailablePlans = [
    { id: 'free', name: 'Free / Starter', price: '₹0/month', features: ['Basic Auto-Replies', 'Basic Analytics'] },
    { id: 'basic', name: 'Basic Plan', price: '₹999/month', features: ['Simple Chatflow', 'Standard Analytics'] },
    { id: 'professional', name: 'Professional Plan', price: '₹1999/month', features: ['Advanced Chatflow', 'Lead Qualification', 'Customer Segmentation'] },
    { id: 'enterprise', name: 'Enterprise Plan', price: 'Custom', features: ['Webhook Integration', 'CRM Integration', 'Human Takeover'] },
  ];

  // Determine the index of the current plan in the hierarchy
  const currentPlanIndex = allAvailablePlans.findIndex(plan => plan.id === currentPlanId);

  // Filter plans to show only those higher than the current plan, or all paid plans if not subscribed
  const upgradeablePlans = allAvailablePlans.filter((plan, index) => {
    // If not currently subscribed (or on a cancelled/inactive plan), show all paid plans
    if (!isSubscribed || subscription?.status === 'cancelled' || subscription?.status === 'inactive') {
      return plan.id !== 'free'; // Don't show 'free' as an upgrade option initially, but allow selection if they are on no plan.
    }
    // If subscribed to a paid plan, only show plans strictly higher in the hierarchy
    return index > currentPlanIndex;
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="inline-flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-500">Manage your Synaptic AI plan and billing details.</p>
      </div>

      {cancelMessage && (
        <div className={`p-4 mb-6 rounded-lg ${cancelMessageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {cancelMessage}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Current Plan</h2>

        {isSubscribed ? (
          <div className="space-y-3 text-left">
            <p className="text-lg font-medium text-gray-700">
              Plan: <span className="font-bold text-blue-600">{planName}</span>
            </p>
            <p className="text-sm text-gray-600">
              Status: <span className={`font-semibold ${subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {subscription.status.toUpperCase()}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Subscribed On: <span className="font-medium">{subscribedAt}</span>
            </p>
            <p className="text-sm text-gray-600">
              Last Payment: <span className="font-medium">{amountPaid}</span>
            </p>
            {/* Buttons for managing subscription */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCancelling || upgradeablePlans.length === 0} // Disable if no upgradeable plans
              >
                Upgrade Plan
              </button>
              <button
                onClick={() => handleCancelSubscription(false)} // Pass false to trigger confirm prompt
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-lg font-medium text-gray-700 mb-4">
              Plan: <span className="font-bold text-blue-600">Free / Starter</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">You are currently on the free plan. Explore our paid plans to unlock more features.</p>
            <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCancelling} // Disable if cancelling
              >
                Upgrade Plan
            </button>
          </div>
        )}
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Choose Your New Plan</h2>
            {upgradeablePlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upgradeablePlans.map(plan => (
                    <div key={plan.id} className="border border-gray-200 rounded-lg p-4 text-left">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                        <p className="text-2xl font-bold text-blue-600 mb-3">{plan.price}</p>
                        <ul className="text-sm text-gray-700 list-disc list-inside mb-4">
                        {plan.features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                        ))}
                        </ul>
                        <button
                        onClick={() => handleUpgradePlan(plan.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                        Select {plan.name}
                        </button>
                    </div>
                ))}
                </div>
            ) : (
                <p className="text-center text-gray-600">You are currently on the highest plan or have no upgrade options available.</p>
            )}
            {/* FIX: Add Free / Starter option for downgrade */}
            {isSubscribed && (currentPlanId !== 'free') && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Or Downgrade Your Plan</h3>
                    <div className="border border-gray-200 rounded-lg p-4 text-left">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Free / Starter</h3>
                        <p className="text-2xl font-bold text-blue-600 mb-3">₹0<span>/month</span></p>
                        <ul className="text-sm text-gray-700 list-disc list-inside mb-4">
                            <li>Basic Auto-Replies</li>
                            <li>Basic Analytics</li>
                            <li>Standard Support via Knowledge Base</li>
                        </ul>
                        <button
                            onClick={() => handleUpgradePlan('free')} // Selecting 'free' triggers cancellation
                            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Downgrade to Free
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;

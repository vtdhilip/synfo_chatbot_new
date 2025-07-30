import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, Hash, Info, ChevronDown } from 'lucide-react';

// Using your saved plan information to create a list of plans
const subscriptionPlans = ['Free', 'Basic', 'Professional', 'Enterprise', 'Custom'];

const AddAccountPage = () => {
  const navigate = useNavigate();
  const { platform } = useParams<{ platform: string }>();
  const { currentUser, userRole, agencyName } = useAuth();

  const [formData, setFormData] = useState({
    clientName: "",
    instagramPageId: "",
    metaPageToken: "", // Kept for completeness
    facebookPageId: "", // Kept for completeness
    subscriptionStatus: "active",
    subscriptionPlan: "Professional", // New field based on your saved data, default to a common plan
  });

  const [loading, setLoading] = useState(false);

  // This handler now works for inputs and select elements
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return alert("You must be logged in.");
    if (!formData.clientName || !formData.instagramPageId) {
      alert("Account Name and Instagram ID are required.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'clients'), {
        ...formData,
        platform: platform?.toUpperCase(),
        agencyId: currentUser.uid,
        agencyName: userRole === 'admin' ? 'Admin' : agencyName || 'Agency',
        createdAt: new Date(),
      });
      // Consider using a more modern notification system (toast) instead of alert()
      alert("Account added successfully!");
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("Error saving account.");
    }
    setLoading(false);
  };

  const platformName = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Account';

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-slate-900">Add New {platformName} Account</h1>
            <p className="text-slate-500 mt-2">Fill in the details below to connect a new account.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
            
            {/* Common Fields */}
            <div>
              <label htmlFor="clientName" className="block text-sm font-semibold text-slate-700 mb-1.5">Account Name *</label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 transform -translate-y-1/2" />
                <input
                  id="clientName"
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  placeholder="e.g. Nike Socials"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Platform-Specific Fields */}
            {(platform === 'instagram' || platform === 'facebook') && (
              <div>
                <label htmlFor="instagramPageId" className="block text-sm font-semibold text-slate-700 mb-1.5">Instagram Business ID *</label>
                <div className="relative">
                  <Hash className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 transform -translate-y-1/2" />
                  <input
                    id="instagramPageId"
                    type="text"
                    name="instagramPageId"
                    value={formData.instagramPageId}
                    onChange={handleInputChange}
                    placeholder="e.g. 17841405822392237"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">This is the numerical ID, not the @username.</p>
              </div>
            )}
            
            {/* NEW: Subscription Plan Selection */}
            <div>
              <label htmlFor="subscriptionPlan" className="block text-sm font-semibold text-slate-700 mb-1.5">Subscription Plan</label>
              <div className="relative">
                <select 
                  id="subscriptionPlan" 
                  name="subscriptionPlan"
                  value={formData.subscriptionPlan}
                  onChange={handleInputChange}
                  className="w-full appearance-none px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  {subscriptionPlans.map(plan => (
                    <option key={plan} value={plan}>{plan} Plan</option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-slate-400 absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>


            {platform === 'whatsapp' && (
              <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">WhatsApp integration setup is handled separately. Please contact support to get started. This feature is coming soon to the dashboard!</p>
              </div>
            )}
            
            <div className="flex justify-end pt-6 border-t border-slate-200 space-x-3">
                <button type="button" onClick={() => navigate('/')} className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Saving...' : 'Save Account'}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAccountPage;
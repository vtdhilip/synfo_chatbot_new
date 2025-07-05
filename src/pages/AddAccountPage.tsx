import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

const AddAccountPage = () => {
  const navigate = useNavigate();
  const { platform } = useParams<{ platform: string }>(); // Get platform from URL
  const { currentUser, userRole, agencyName } = useAuth();
  
  // Initialize form data with default values
  const [formData, setFormData] = useState({
    clientName: "",
    instagramPageId: "",
    // Add other fields from your Account interface with default values
    metaPageToken: "",
    facebookPageId: "",
    subscriptionStatus: "active",
  });
  
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return alert("You must be logged in.");
    if (!formData.clientName || !formData.instagramPageId) return alert("Account Name and Instagram ID are required.");

    setLoading(true);
    try {
      await addDoc(collection(db, 'clients'), {
        ...formData,
        platform: platform?.toUpperCase(), // Save the platform type
        agencyId: currentUser.uid,
        agencyName: userRole === 'admin' ? 'Admin' : agencyName || 'Agency',
        createdAt: new Date(),
      });
      alert("Account added successfully!");
      navigate('/'); // Go back to the main dashboard
    } catch (err) {
      console.error(err);
      alert("Error saving account.");
    }
    setLoading(false);
  };

  const platformName = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Account';

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link to="/" className="inline-flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Add New {platformName} Account</h1>
      
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md border border-gray-200 space-y-6">
        
        {/* Common Fields */}
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
          <input 
            id="clientName"
            type="text" 
            name="clientName" 
            value={formData.clientName} 
            onChange={handleInputChange} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
            required 
          />
        </div>

        {/* Platform-Specific Fields */}
        {(platform === 'instagram' || platform === 'facebook') && (
          <div>
            <label htmlFor="instagramPageId" className="block text-sm font-medium text-gray-700 mb-1">Instagram Business ID *</label>
            <input 
              id="instagramPageId"
              type="text" 
              name="instagramPageId" 
              value={formData.instagramPageId} 
              onChange={handleInputChange} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              required 
            />
            <p className="text-xs text-gray-500 mt-1">This is the numerical ID, not the @username.</p>
          </div>
        )}

        {platform === 'whatsapp' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">WhatsApp integration setup is different and coming soon.</p>
          </div>
        )}
        
        <div className="flex justify-end pt-4 border-t border-gray-200">
            <button type="button" onClick={() => navigate('/')} className="px-6 py-2 mr-3 border rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors">
              {loading ? 'Saving...' : 'Save Account'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AddAccountPage;
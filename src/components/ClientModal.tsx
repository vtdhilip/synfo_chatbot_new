import React, { useEffect } from 'react';
import { X, ShoppingBag, Link } from 'lucide-react';
import { Client , initialFormData } from '../pages/Index';
import { generateFacebookAuthLink } from '../utils/facebookAuth';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../firebase';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  clientData: typeof initialFormData; 
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  editingClient: Client | null;
  loading: boolean;
}

const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  clientData,
  onInputChange,
  editingClient,
  loading
}) => {
  
  // --- All logic and hooks are now at the TOP LEVEL of the component ---

  const handleGetLink = () => {
    // We check for the client's database ID and their Instagram Page ID
    if (!clientData.instagramPageId || !editingClient?.id) {
      alert("Please enter the client's Instagram Page ID and save the client first.");
      return;
    }
    const authLink = generateFacebookAuthLink(clientData.instagramPageId, editingClient.id);
    window.open(authLink, '_blank', 'width=800,height=600');
  };

  // This real-time listener will automatically update the form when the token is saved
  useEffect(() => {
      // Only run the listener if the modal is open for an existing client
      if (isOpen && editingClient?.id) {
          const unsub = onSnapshot(doc(db, "clients", editingClient.id), (doc) => {
              const updatedClient = doc.data();
              if (updatedClient && updatedClient.metaPageToken) {
                  // If a token appears, update the form field automatically!
                  onInputChange({
                      target: { name: 'metaPageToken', value: updatedClient.metaPageToken }
                  } as React.ChangeEvent<HTMLInputElement>);
              }
          });

          // This cleans up the listener when the modal closes or the component unmounts
          return () => unsub();
      }
  }, [isOpen, editingClient, onInputChange]); // The effect depends on these values

  // This prevents the modal from rendering at all if it's not open
  if (!isOpen) return null;

  // --- RENDERED JSX ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <p className="text-sm text-gray-500">
                {editingClient ? 'Update client information' : 'Create a new client profile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Basic Information
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
              <input type="text" name="clientName" value={clientData.clientName} onChange={onInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required placeholder="Enter client name" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instagram ID *</label>
              <input type="text" name="instagramPageId" value={clientData.instagramPageId} onChange={onInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required placeholder="@instagram_handle" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Meta Token *</label>
              <div className="relative">
                <textarea
                  name="metaPageToken"
                  value={clientData.metaPageToken}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="This will be auto-filled after client authorization"
                  rows={3}
                />
                {editingClient && (
                  <button type="button" onClick={handleGetLink} className="absolute top-2 right-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                    <Link size={12} /> Get Link
                  </button>
                )}
              </div>
            </div>

            {/* Platform Selection */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6 flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                E-commerce Platform
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform *</label>
              <select name="platform" value={clientData.platform} onChange={onInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="SHOPIFY">Shopify</option>
                <option value="WOOCOMMERCE">WooCommerce</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Status</label>
              <select name="subscriptionStatus" value={clientData.subscriptionStatus} onChange={onInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Platform-specific fields */}
            {clientData.platform === 'SHOPIFY' && (
              <>
                {/* ... Shopify Fields ... */}
              </>
            )}
            {clientData.platform === 'WOOCOMMERCE' && (
              <>
                {/* ... WooCommerce Fields ... */}
              </>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg disabled:opacity-50">
              {loading ? 'Saving...' : (editingClient ? 'Update Client' : 'Add Client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;


import React from 'react';
import { X, ShoppingBag, Globe } from 'lucide-react';
import { Client , initialFormData} from '../pages/Index';



interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  clientData: typeof initialFormData; 
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  editingClient: Client | null;
  loading: boolean;
}const ClientModal = ({
  isOpen,
  onClose,
  onSubmit,
  clientData,
  onInputChange,
  editingClient,
  loading
}: ClientModalProps) => {
  if (!isOpen) return null;

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                name="clientName"
                value={clientData.clientName}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
                placeholder="Enter client name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram ID *
              </label>
              <input
                type="text"
                name="instagramPageId"
                value={clientData.instagramPageId}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
                placeholder="@instagram_handle"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Token *
              </label>
              <input
                type="text"
                name="metaPageToken"
                value={clientData.metaPageToken}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
                placeholder="Enter Meta API token"
              />
            </div>

            {/* Platform Selection */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6 flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                E-commerce Platform
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform *
              </label>
              <select
                name="platform"
                value={clientData.platform}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="SHOPIFY">Shopify</option>
                <option value="WOOCOMMERCE">WooCommerce</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Status
              </label>
              <select
                name="subscriptionStatus"
                value={clientData.subscriptionStatus}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Platform-specific fields */}
            {clientData.platform === 'SHOPIFY' && (
              <>
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-800 mb-3 mt-4 flex items-center">
                    <ShoppingBag className="w-4 h-4 text-green-500 mr-2" />
                    Shopify Configuration
                  </h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shopify Store URL
                  </label>
                  <input
                    type="text"
                    name="shopifyStoreName"
                    value={clientData.shopifyStoreName || ''}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="https://yourstore.myshopify.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shopify Access Token
                  </label>
                  <input
                    type="text"
                    name="shopifyAccessToken"
                    value={clientData.shopifyAccessToken || ''}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter Shopify access token"
                  />
                </div>
              </>
            )}

            {clientData.platform === 'WOOCOMMERCE' && (
              <>
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-800 mb-3 mt-4 flex items-center">
                    <Globe className="w-4 h-4 text-blue-500 mr-2" />
                    WooCommerce Configuration
                  </h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WooCommerce Site URL
                  </label>
                  <input
                    type="text"
                    name="woocommerceSiteUrl"
                    value={clientData.woocommerceSiteUrl || ''}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="https://yoursite.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consumer Key
                  </label>
                  <input
                    type="text"
                    name="woocommerceConsumerKey"
                    value={clientData.woocommerceConsumerKey || ''}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter consumer key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consumer Secret
                  </label>
                  <input
                    type="text"
                    name="woocommerceConsumerSecret"
                    value={clientData.woocommerceConsumerSecret || ''}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter consumer secret"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingClient ? 'Updating...' : 'Adding...'}
                </div>
              ) : (
                editingClient ? 'Update Client' : 'Add Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;

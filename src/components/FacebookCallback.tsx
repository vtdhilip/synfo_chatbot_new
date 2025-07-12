// src/components/FacebookCallback.tsx

import React, { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Instagram, CheckCircle, XCircle } from 'lucide-react';

// Define a type for the page data we expect from the backend
interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account: {
    id: string;
    username: string;
    profile_picture_url: string;
  };
}

// A UI component for displaying each selectable page
const PageSelectionCard: React.FC<{ page: FacebookPage; onSelect: () => void; loading: boolean }> = ({ page, onSelect, loading }) => (
  <button
    onClick={onSelect}
    disabled={loading}
    className="w-full text-left p-4 border border-gray-200 rounded-lg flex items-center hover:bg-gray-50 hover:border-blue-500 transition-all duration-200 disabled:opacity-50"
  >
    <img src={page.instagram_business_account.profile_picture_url} alt={page.instagram_business_account.username} className="w-12 h-12 rounded-full mr-4" />
    <div>
      <h3 className="font-semibold text-gray-800">{page.instagram_business_account.username}</h3>
      <p className="text-sm text-gray-500">Connected to Facebook Page: {page.name}</p>
    </div>
  </button>
);

const FacebookCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'selecting' | 'connecting' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your login...');
  const [pages, setPages] = useState<FacebookPage[]>([]);
  // FIX: Removed unused 'selectedPage' state
  // const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);

  useEffect(() => {
    const processAuthCode = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const savedState = localStorage.getItem("oauth_state");

      if (code && state && state === savedState) {
        localStorage.removeItem("oauth_state");
        
        try {
          setMessage('Fetching your pages...');
          const functions = getFunctions();
          const getFacebookPages = httpsCallable(functions, 'getFacebookPages');
          const result = await getFacebookPages({ code });
          
          const pageData = (result.data as { pages: FacebookPage[] }).pages;
          setPages(pageData);
          setStatus('selecting');
          setMessage('Please select the Instagram account you want to connect.');

        } catch (err: any) {
          setStatus('error');
          setMessage(err.message || 'Failed to fetch your pages. Please try again.');
        }
      } else {
        setStatus('error');
        setMessage('Authentication failed. The request could not be verified.');
      }
    };

    processAuthCode();
  }, []);

  const handleSelectPage = async (page: FacebookPage) => {
    // FIX: No longer need to set the selectedPage state
    // setSelectedPage(page); 
    setStatus('connecting');
    setMessage(`Connecting ${page.instagram_business_account.username}...`);

    try {
        const functions = getFunctions();
        const finalizeConnection = httpsCallable(functions, 'finalizeFacebookConnection');
        
        await finalizeConnection({
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            igId: page.instagram_business_account.id,
            igUsername: page.instagram_business_account.username
        });

        setStatus('success');
        setMessage('Success! Your account has been connected. This window will close shortly.');
        setTimeout(() => window.close(), 4000);

    } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'An error occurred while connecting this account.');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 text-center">
        
        {status === 'loading' && (
          <>
            <div className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4">
                <svg fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">{message}</h2>
          </>
        )}

        {status === 'selecting' && (
          <>
            <Instagram className="mx-auto h-10 w-10 text-pink-500 mb-2" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select an Account</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <div className="space-y-3">
              {pages.map(page => (
                <PageSelectionCard key={page.id} page={page} onSelect={() => handleSelectPage(page)} loading={false} />
              ))}
            </div>
          </>
        )}

        {status === 'connecting' && (
             <>
                <div className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4">
                    <svg fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">{message}</h2>
             </>
        )}

        {status === 'success' && (
            <>
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
                <h2 className="text-2xl font-bold text-gray-800">Connection Successful!</h2>
                <p className="text-gray-600 mt-2">{message}</p>
            </>
        )}

        {status === 'error' && (
            <>
                <XCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
                <h2 className="text-2xl font-bold text-gray-800">Connection Failed</h2>
                <p className="text-gray-600 mt-2">{message}</p>
            </>
        )}
      </div>
    </div>
  );
};

export default FacebookCallback;

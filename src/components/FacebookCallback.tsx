// src/components/FacebookCallback.tsx

import React, { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Instagram, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

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
    className="group w-full text-left p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:border-brand hover:bg-brand-50 transition-all duration-200 disabled:opacity-50"
  >
    <div className="flex items-center">
        <img src={page.instagram_business_account.profile_picture_url} alt={page.instagram_business_account.username} className="w-12 h-12 rounded-full mr-4" />
        <div>
        <h3 className="font-semibold text-slate-800">{page.instagram_business_account.username}</h3>
        <p className="text-sm text-slate-500">Connected to: {page.name}</p>
        </div>
    </div>
    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-brand transition-colors" />
  </button>
);

const FacebookCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'selecting' | 'connecting' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your login...');
  const [pages, setPages] = useState<FacebookPage[]>([]);

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
          if (pageData && pageData.length > 0) {
            setPages(pageData);
            setStatus('selecting');
            setMessage('Please select the Instagram account you want to connect.');
          } else {
            setStatus('error');
            setMessage('No Instagram Business accounts found. Please ensure your Facebook page is linked to an Instagram Business account and try again.');
          }

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
    setStatus('connecting');
    setMessage(`Connecting @${page.instagram_business_account.username}...`);

    try {
        const functions = getFunctions();
        const finalizeConnection = httpsCallable(functions, 'finalizeFacebookConnection');
        
        await finalizeConnection({
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            igId: page.instagram_business_account.id,
            igUsername: page.instagram_business_account.username,
            igProfilePicUrl: page.instagram_business_account.profile_picture_url,
        });

        setStatus('success');
        setMessage('Success! Your account has been connected. This window will close shortly.');
        setTimeout(() => window.close(), 4000);

    } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'An error occurred while connecting this account.');
    }
  };
  
  const StateCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-8 text-center border border-slate-200">
        {icon}
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {status === 'loading' && (
            <StateCard icon={<Loader2 className="mx-auto h-12 w-12 text-brand animate-spin mb-4" />} title="Verifying Login...">
                <p className="text-slate-500 mt-2">{message}</p>
            </StateCard>
        )}

        {status === 'selecting' && (
            <StateCard icon={<Instagram className="mx-auto h-12 w-12 text-pink-500 mb-4" />} title="Select an Account">
                <p className="text-slate-500 mt-2 mb-6">{message}</p>
                <div className="space-y-3 text-left">
                {pages.map(page => (
                    <PageSelectionCard key={page.id} page={page} onSelect={() => handleSelectPage(page)} loading={false} />
                ))}
                </div>
            </StateCard>
        )}
        
        {status === 'connecting' && (
            <StateCard icon={<Loader2 className="mx-auto h-12 w-12 text-brand animate-spin mb-4" />} title="Connecting...">
                <p className="text-slate-500 mt-2">{message}</p>
            </StateCard>
        )}

        {status === 'success' && (
            <StateCard icon={<CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />} title="Connection Successful!">
                <p className="text-slate-500 mt-2">{message}</p>
            </StateCard>
        )}

        {status === 'error' && (
            <StateCard icon={<XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />} title="Connection Failed">
                <p className="text-slate-500 mt-2">{message}</p>
            </StateCard>
        )}
    </div>
  );
};

export default FacebookCallback;

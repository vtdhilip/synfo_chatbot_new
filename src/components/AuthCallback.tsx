import { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const [message, setMessage] = useState('Processing authentication, please wait...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const savedState = localStorage.getItem("oauth_state");

      if (!code || !state || state !== savedState) {
        setError('Authentication failed: The request could not be verified. Please try again.');
        console.error("Security check FAILED or code/state missing.");
        return;
      }

      localStorage.removeItem("oauth_state");

      try {
        const functions = getFunctions();
        // This function name should match the one in your backend that handles the code exchange
        const getFacebookPages = httpsCallable(functions, 'getFacebookPages'); 
        
        await getFacebookPages({ code });
        
        setMessage('Success! Your account has been connected. This window will close automatically.');
        
        // Notify the parent window and close this popup
        window.opener?.postMessage('auth-success', window.location.origin);
        setTimeout(() => window.close(), 2000);

      } catch (err: any) {
        setError(`Error connecting account: ${err.message}`);
        console.error(err);
      }
    };

    processAuth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
            {error ? (
                <>
                    <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
                    <p className="text-slate-600 mt-2">{message}</p>
                </>
            ) : (
                <>
                    <Loader2 className="w-10 h-10 text-brand animate-spin mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800">Connecting Account...</h1>
                    <p className="text-slate-600 mt-2">{message}</p>
                </>
            )}
             <p className="text-xs text-slate-400 mt-6">
                If this window does not close automatically, please close it manually.
            </p>
        </div>
    </div>
  );
};

export default AuthCallback;

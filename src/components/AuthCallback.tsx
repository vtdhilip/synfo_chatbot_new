// src/components/AuthCallback.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '../utils/facebookAuth'; // Adjusted to relative path
import axios from 'axios';

// Define the API URL for client updates
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/clients";

/**
 * AuthCallback component:
 * Handles the redirect from Facebook/Meta after the user grants/denies permissions.
 * It exchanges the authorization code for an access token and updates the client
 * record with this new Meta token.
 */
const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorReason = searchParams.get('error_reason'); // More detailed error from Facebook
      const errorDescription = searchParams.get('error_description'); // More detailed error from Facebook

      if (error) {
        setStatus('error');
        // Provide more user-friendly message based on Facebook's error details
        setMessage(errorReason === 'user_denied'
          ? 'Authentication was cancelled by the user.'
          : `Authentication failed: ${errorDescription || error}.`
        );
        setTimeout(() => navigate('/'), 3000); // Redirect after 3 seconds
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Invalid authentication response. Missing code or state parameters.');
        setTimeout(() => navigate('/'), 3000); // Redirect after 3 seconds
        return;
      }

      try {
        const { clientId } = JSON.parse(atob(state)); // Decode the state parameter
        if (!clientId) {
          throw new Error('Client ID not found in state parameter.');
        }

        // Exchange authorization code for access token
        // Removed clientId from the arguments as exchangeCodeForToken no longer expects it.
        const accessToken = await exchangeCodeForToken(code);

        // Update client with the new Meta token
        // IMPORTANT: In a production environment, the client_secret should NOT be exposed in the frontend.
        // The exchangeCodeForToken function should ideally call a backend endpoint
        // which then performs the token exchange securely.
        await axios.put(`${API_URL}/${clientId}`, {
          metaToken: accessToken
        });

        setStatus('success');
        setMessage('Authentication successful! Meta token has been saved.');
        setTimeout(() => navigate('/'), 2000); // Redirect after 2 seconds
      } catch (err) {
        console.error('Authentication error:', err);
        setStatus('error');
        setMessage(`Failed to complete authentication: ${err instanceof Error ? err.message : 'Unknown error'}.`);
        setTimeout(() => navigate('/'), 3000); // Redirect after 3 seconds
      }
    };

    handleCallback();
  }, [searchParams, navigate]); // Dependencies for useEffect

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Authentication</h2>
              <p className="text-gray-600">Please wait while we complete your authentication...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          <p className="text-sm text-gray-500 mt-4">Redirecting back to dashboard...</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;

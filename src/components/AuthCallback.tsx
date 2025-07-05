import { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const AuthCallback = () => {
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    // Get parameters from the URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    // Get the state we saved before opening the popup
    const savedState = localStorage.getItem("oauth_state");

    // Security check: ensure the state parameter matches to prevent CSRF attacks
    if (code && state && state === savedState) {
      localStorage.removeItem("oauth_state"); // Clean up state after use
      
      console.log("✅ Security check passed. Calling backend function...");
      
      const functions = getFunctions();
      const connectAndCreate = httpsCallable(functions, 'connectAndCreateAccount');

      // Send the temporary code to the backend
      connectAndCreate({ code })
        .then(() => {
          setMessage('Success! Your account has been connected. This window will now close.');
          setTimeout(() => window.close(), 3000); // Close the popup
        })
        .catch((err) => {
          setMessage(`Error connecting account: ${err.message}`);
          console.error(err);
        });
    } else {
      // Handle failed security check or missing parameters
      console.error("❌ Security check FAILED or code/state missing.");
      setMessage('Authentication failed. The request could not be verified. Please try again.');
    }
  }, []); // The empty array ensures this runs only once when the page loads

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Connecting Account...</h1>
      <p>{message}</p>
      <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '20px' }}>
        If this window does not close automatically, please close it manually.
      </p>
    </div>
  );
};

export default AuthCallback;
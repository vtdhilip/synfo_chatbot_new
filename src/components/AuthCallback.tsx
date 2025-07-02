import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';

const AuthCallback = () => {
  const [message, setMessage] = useState('Initializing...');
  const location = useLocation();

  useEffect(() => {
    // --- TRACER LOG 1 ---
    // This tells us the component has loaded.
    console.log("AuthCallback component has rendered.");
    setMessage('Reading authentication parameters from URL...');

    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');

    // --- TRACER LOG 2 ---
    // This tells us what was found in the URL.
    console.log("URL Parameters found:", { code, state });

    if (code && state) {
      setMessage('Authorization code received. Contacting server...');
      
      // --- TRACER LOG 3 ---
      // This confirms we are about to call the backend.
      console.log("Preparing to call 'exchangeCode' Firebase Function...");

      const functions = getFunctions();
      const exchangeCodeFunction = httpsCallable(functions, 'exchangeCode');

      exchangeCodeFunction({ code, state })
        .then((result: HttpsCallableResult) => {
          // --- TRACER LOG 4 ---
          // This confirms the backend call was successful.
          console.log("Firebase Function call SUCCEEDED!", result.data);

          setMessage('Success! Your account is connected. This window will close shortly.');
          setTimeout(() => window.close(), 3000); // Increased timeout slightly
        })
        .catch((err) => {
          // --- TRACER LOG 5 ---
          // This tells us the backend call FAILED.
          console.error("Firebase Function call FAILED:", err);
          setMessage(`Error: Could not connect account. ${err.message}. Check the browser console for more details.`);
        });
    } else {
      // --- TRACER LOG 6 ---
      // This tells us the URL was missing critical info.
      console.error("Authentication failed. 'code' or 'state' is missing from the URL.");
      setMessage('Authentication failed. No authorization code or state received from Facebook. Please try again.');
    }
  }, [location]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
      <h1>Authentication In Progress</h1>
      <p>{message}</p>
    </div>
  );
};

export default AuthCallback;
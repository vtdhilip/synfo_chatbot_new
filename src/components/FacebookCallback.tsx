import { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const FacebookCallback = () => {
  const [message, setMessage] = useState('Connecting Facebook Page...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const savedState = localStorage.getItem("oauth_state");

    if (code && state && state === savedState) {
      localStorage.removeItem("oauth_state");
      
      const functions = getFunctions();
      const connectFacebook = httpsCallable(functions, 'connectFacebookPage');

      connectFacebook({ code })
        .then(() => {
          setMessage('Success! Your Facebook Page has been connected. This window will now close.');
          setTimeout(() => window.close(), 3000);
        })
        .catch((err) => {
          setMessage(`Error connecting account: ${err.message}`);
        });
    } else {
      setMessage('Authentication failed. The request could not be verified.');
    }
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Connecting Account...</h1>
      <p>{message}</p>
    </div>
  );
};

export default FacebookCallback;
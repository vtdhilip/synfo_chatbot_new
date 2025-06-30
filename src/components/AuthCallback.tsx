import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';

const AuthCallback = () => {
  const [message, setMessage] = useState('Processing authentication...');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      const functions = getFunctions();
      const exchangeCodeFunction = httpsCallable(functions, 'exchangeCode');
      
      exchangeCodeFunction({ code, state })
        .then(() => {
          setMessage('Success! Your account is connected. Redirecting...');
          setTimeout(() => navigate('/'), 2000);
        })
        .catch((err) => {
          setMessage('Error: Could not connect account. Please try again.');
          console.error(err);
        });
    } else {
      setMessage('Authentication failed. No authorization code received.');
    }
  }, [location, navigate]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Authentication In Progress</h1>
      <p>{message}</p>
    </div>
  );
};

export default AuthCallback;
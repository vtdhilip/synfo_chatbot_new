// src/utils/facebookAuth.ts

// Facebook App credentials - these should be environment variables in production
// Make sure you have a .env file in your project root with these defined:
// VITE_FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
// VITE_FACEBOOK_APP_SECRET=YOUR_FACEBOOK_APP_SECRET
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || 'your_facebook_app_id';
// WARNING: Exposing FACEBOOK_APP_SECRET in client-side code is a SECURITY RISK.
// For production, the exchangeCodeForToken logic should ideally be moved to a backend server.
const FACEBOOK_APP_SECRET = import.meta.env.VITE_FACEBOOK_APP_SECRET || 'your_facebook_app_secret';


/**
 * Generates the Facebook OAuth authentication URL.
 * This URL redirects the user to Facebook to grant necessary permissions.
 * @param instagramId The Instagram Business Account ID associated with the client.
 * @param clientId The unique ID of the client in your system.
 * @returns The full Facebook OAuth URL.
 */

export const generateFacebookAuthLink = (instagramPageId: string, clientId: string): string => {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
  // This must EXACTLY match the URL in your Facebook App settings and your Cloud Function
  const redirectUri = `${window.location.origin}/auth/callback`; 
  
  // Encode the client's database ID and their Instagram ID into the state
  const state = btoa(JSON.stringify({ clientId, instagramPageId }));
  
  const scope = "pages_show_list,instagram_basic,instagram_manage_messages,pages_read_engagement";

  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&response_type=code`;
};

/**
 * Exchanges the authorization code received from Facebook for an access token.
 * This token is then used to make API calls to Meta's platforms (Facebook/Instagram Graph API).
 * @param code The authorization code received from Facebook.
 * @returns A promise that resolves with the access token string.
 * @throws An error if the token exchange fails.
 */
export const exchangeCodeForToken = async (code: string): Promise<string> => { // Removed clientId parameter
  const redirectUri = `${window.location.origin}/auth/callback`;

  try {
    // Make a POST request to Facebook's Graph API to exchange the code for an access token.
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // The body must be URL-encoded for this endpoint.
      body: new URLSearchParams({
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET, // WARNING: See note above. This should be on a backend.
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    // Check if an access_token was received.
    if (tokenData.access_token) {
      console.log('Successfully exchanged code for access token:', tokenData.access_token);
      return tokenData.access_token;
    } else {
      // If Facebook returns an error, it will be in the tokenData object.
      console.error('Facebook token exchange error:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error?.message || 'Failed to get access token from Facebook.');
    }
  } catch (error) {
    // Log and re-throw any network or parsing errors.
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};

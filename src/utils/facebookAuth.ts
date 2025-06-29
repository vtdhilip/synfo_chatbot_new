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
export const generateFacebookAuthLink = (instagramId: string, clientId: string): string => {
  // The redirect_uri must match exactly what you configured in your Facebook App settings.
  // It should be a URL on your domain that will handle the OAuth callback.
  const redirectUri = `${window.location.origin}/auth/callback`;

  // The 'state' parameter is used for security to prevent CSRF attacks.
  // It typically contains data needed after the redirect, encoded to prevent tampering.
  const state = btoa(JSON.stringify({ clientId, instagramId }));

  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    // Define the scopes (permissions) your app needs.
    // 'instagram_basic' for basic profile.
    // 'instagram_content_publish' for publishing.
    // 'pages_show_list' and 'pages_read_engagement' if you need to manage pages associated with Instagram.
    scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
    response_type: 'code', // We are requesting an authorization code
    state: state
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
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

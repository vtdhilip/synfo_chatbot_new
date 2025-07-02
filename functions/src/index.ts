import * as functions from "firebase-functions";
import axios from "axios";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const exchangeCode = functions.https.onCall(async (data) => {
  const { code, state } = data as { code: string; state: string };

  if (!code || !state) {
    throw new functions.https.HttpsError('invalid-argument', 'Code and state are required.');
  }

  const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
  const { clientId, instagramPageId } = decodedState;

  // Log 1: What are we looking for?
  console.log(`[exchangeCode] Starting process for clientId: ${clientId}. Searching for instagramPageId: ${instagramPageId}`);

  const FB_APP_ID = functions.config().facebook.app_id;
  const FB_APP_SECRET = functions.config().facebook.app_secret;
  const REDIRECT_URI = "https://admin.synapticinfo.com/auth/callback";

  try {
    // Exchange for tokens
    const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
      params: { client_id: FB_APP_ID, redirect_uri: REDIRECT_URI, client_secret: FB_APP_SECRET, code }
    });
    const shortLivedToken = tokenResponse.data.access_token;

    const longLivedResponse = await axios.get(`https://graph.facebook.com/oauth/access_token`, {
      params: { grant_type: 'fb_exchange_token', client_id: FB_APP_ID, client_secret: FB_APP_SECRET, fb_exchange_token: shortLivedToken }
    });
    const longLivedToken = longLivedResponse.data.access_token;

    // Get the pages and linked Instagram accounts
    const accountsResponse = await axios.get(`https://graph.facebook.com/me/accounts`, {
      params: { fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: longLivedToken }
    });

    // Log 2: What data did Facebook return?
    console.log(`[exchangeCode] Data received from /me/accounts API:`, JSON.stringify(accountsResponse.data.data, null, 2));

    // Find the specific page by comparing Instagram IDs
    const clientPage = accountsResponse.data.data.find((page: any) => {
      if (page.instagram_business_account) {
        // Log 3: Show the direct comparison
        console.log(`[exchangeCode] Comparing -> API Found ID: ${page.instagram_business_account.id} | Target ID: ${instagramPageId}`);
        return page.instagram_business_account.id === instagramPageId;
      }
      return false;
    });

    // If no match is found, throw a detailed error
    if (!clientPage || !clientPage.access_token) {
        const foundIds = accountsResponse.data.data
          .map((p: any) => p.instagram_business_account?.id)
          .filter(Boolean);
        console.error(`[exchangeCode] FAILED to find match. Searched for ID: '${instagramPageId}'. Found these IDs instead: [${foundIds.join(', ')}]`);
        
        throw new functions.https.HttpsError('not-found', 'Matching Instagram-linked Page not found.');
    }

    const pageAccessToken = clientPage.access_token;
    console.log(`[exchangeCode] Successfully found matching page for clientId: ${clientId}`);

    // Save the token to Firestore
    const clientDocRef = db.collection('clients').doc(clientId);
    await clientDocRef.update({ metaPageToken: pageAccessToken });

    return { success: true, message: "Account connected successfully!" };
  } catch (error: any) {
    console.error(`[exchangeCode] Full error for clientId ${clientId}:`, error.response?.data?.error || error.message);
    throw new functions.https.HttpsError('unknown', 'Failed to exchange token.');
  }
});
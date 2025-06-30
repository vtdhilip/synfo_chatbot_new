import * as functions from "firebase-functions";
import axios from "axios";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// This is an HTTP-callable cloud function
export const exchangeCode = functions.https.onCall(async (data, context) => {
    // --- THIS IS THE CORRECTED PART ---
    // We first cast to 'unknown', then to our specific type. This is safer.
    const { code, state } = data as unknown as { code: string; state: string };

    if (!code || !state) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with "code" and "state" arguments.');
    }

    // Decode the state to get our client's ID
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    const { clientId, instagramPageId } = decodedState;

    // In a real app, you would get these from environment variables
    const FB_APP_ID = "740006708601685";
    const FB_APP_SECRET = "644bf13087106e9d18613926e16c78f0";
    const REDIRECT_URI = `https://synapticinfo.com/auth/callback`; // IMPORTANT: Use your deployed frontend URL

    try {
        // Step 1: Exchange code for a short-lived access token
        const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
            params: { client_id: FB_APP_ID, redirect_uri: REDIRECT_URI, client_secret: FB_APP_SECRET, code }
        });
        const shortLivedToken = tokenResponse.data.access_token;

        if (!shortLivedToken) throw new Error("Failed to get short-lived token.");

        // Step 2: Exchange for a long-lived token
        const longLivedResponse = await axios.get(`https://graph.facebook.com/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: FB_APP_ID,
                client_secret: FB_APP_SECRET,
                fb_exchange_token: shortLivedToken
            }
        });
        const longLivedToken = longLivedResponse.data.access_token;

        // Step 3: Get the permanent Page Access Token
        const accountsResponse = await axios.get(`https://graph.facebook.com/me/accounts`, {
            params: {
                fields: 'id,name,access_token,instagram_business_account',
                access_token: longLivedToken
            }
        });

        const clientPage = accountsResponse.data.data.find(
            (page: any) => page.instagram_business_account && page.instagram_business_account.id === instagramPageId
        );

        if (!clientPage || !clientPage.access_token) {
             throw new functions.https.HttpsError('not-found', 'Matching Instagram-linked Facebook Page not found.');
        }

        const pageAccessToken = clientPage.access_token;

        // Step 4: Save the permanent token to the client's document in Firestore
        const clientDocRef = db.collection('clients').doc(clientId);
        await clientDocRef.update({ metaPageToken: pageAccessToken });

        return { success: true, message: "Account connected successfully!" };

    } catch (error) {
        console.error("Token Exchange Error:", error);
        throw new functions.https.HttpsError('unknown', 'Failed to exchange token.');
    }
});

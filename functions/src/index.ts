import * as functions from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import axios from "axios";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();



// =================================================================
//   3. executeFlow: The internal engine that runs chatflows
// =================================================================
async function executeFlow(clientId: string, senderId: string, pageId: string, startNodeId: string, userMessage?: string) {
  console.log(`[executeFlow] Running for client ${clientId}, user ${senderId}, starting from node ${startNodeId}`);
  const clientDocRef = db.collection('clients').doc(clientId);
  const clientDoc = await clientDocRef.get();
  if (!clientDoc.exists) return console.error(`Client ${clientId} not found.`);

  const clientData = clientDoc.data();
  const flow = clientData?.flow;
  const pageAccessToken = clientData?.metaPageToken;
  if (!flow || !pageAccessToken) return console.error(`Flow or Token missing for client ${clientId}.`);

  const currentNode = flow.nodes.find((n: any) => n.id === startNodeId);
  if (!currentNode) return console.error(`Node ${startNodeId} not found.`);

  const edge = flow.edges.find((e: any) => e.source === startNodeId);
  if (!edge) return console.log(`[executeFlow] End of flow path reached at node ${startNodeId}.`);

  const nextNode = flow.nodes.find((n: any) => n.id === edge.target);
  if (!nextNode) return console.error(`Next node with ID ${edge.target} not found.`);

  const conversationRef = db.collection('conversations').doc(`${senderId}_${pageId}`);

  if (nextNode.type === 'textMessage' || !nextNode.type) {
    const messageToSend = nextNode.data.label;
    console.log(`[executeFlow] ACTION: Sending message "${messageToSend}" to user ${senderId}.`);
    await axios.post(`https://graph.facebook.com/v20.0/me/messages`, {
      recipient: { id: senderId }, message: { text: messageToSend }, messaging_type: "RESPONSE", access_token: pageAccessToken,
    }).catch(e => console.error("Failed to send message:", e.response?.data?.error));
    await executeFlow(clientId, senderId, pageId, nextNode.id, userMessage);

  } else if (nextNode.type === 'question') {
    const questionToSend = nextNode.data.label;
    console.log(`[executeFlow] ACTION: Asking question "${questionToSend}" to user ${senderId}.`);
    await axios.post(`https://graph.facebook.com/v20.0/me/messages`, {
      recipient: { id: senderId }, message: { text: questionToSend }, messaging_type: "RESPONSE", access_token: pageAccessToken,
    }).catch(e => console.error("Failed to send question:", e.response?.data?.error));
    console.log(`[executeFlow] Saving user state. Waiting at node ${nextNode.id}`);
    await conversationRef.set({
      clientId: clientId, senderId: senderId, pageId: pageId, currentNodeId: nextNode.id, lastUpdatedAt: new Date(),agencyId: clientData.agencyId, 
    }, { merge: true });
  } else if (nextNode.type === 'condition') {
    console.log(`[executeFlow] ACTION: Checking condition with keyword "${nextNode.data.keyword}"`);
    const trueEdge = flow.edges.find((e: any) => e.source === nextNode.id && e.sourceHandle === 'true');
    const falseEdge = flow.edges.find((e: any) => e.source === nextNode.id && e.sourceHandle === 'false');

    if (userMessage && nextNode.data.keyword && userMessage.toLowerCase().includes(nextNode.data.keyword.toLowerCase())) {
      console.log(`[executeFlow] Condition is TRUE. Following true path.`);
      if (trueEdge) await executeFlow(clientId, senderId, pageId, trueEdge.target, userMessage);
    } else {
      console.log(`[executeFlow] Condition is FALSE. Following false path.`);
      if (falseEdge) await executeFlow(clientId, senderId, pageId, falseEdge.target, userMessage);
    }
  }
} // 👈 The missing brace was here

// =================================================================
//   4. instagramWebhook: The public endpoint to receive messages
// =================================================================
export const instagramWebhook = onRequest(async (req, res) => {
  if (req.method === "POST") {
    const body = req.body;
    console.log("Received webhook body:", JSON.stringify(body, null, 2));

    for (const entry of body.entry) {
      // The documentation states 'entry.id' is the "ID of your Instagram Professional account" (IGID)
      // However, for Messenger Platform webhooks, it's often the Facebook Page ID.
      // You NEED to verify this from your live logs.
      const receivedPageOrIgId = entry.id; 

      // --- CRITICAL: DETERMINE WHICH ID IS IN 'entry.id' ---
      // For Instagram Messaging via Messenger Platform, 'entry.id' is typically the Facebook Page ID.
      // Your Firestore query should use the correct field to match this ID.
      // If 'entry.id' from live logs is the FACEBOOK_PAGE_ID:
      const clientsRef = db.collection('clients');
      //const q = clientsRef.where("facebookPageId", "==", receivedPageOrIgId); // Assuming entry.id is facebookPageId

      // If 'entry.id' from live logs is the INSTAGRAM_BUSINESS_ACCOUNT_ID:
       const q = clientsRef.where("instagramPageId", "==", receivedPageOrIgId); // Use this if entry.id is IG ID

      const querySnapshot = await q.get();

      if (querySnapshot.empty) {
        console.error(`No client found for Page/IG ID: ${receivedPageOrIgId}.`);
        continue; // Skip to the next entry if no client matches
      }
      const clientId = querySnapshot.docs[0].id; // Get client data for agencyId etc.
      console.log(`Found matching client: ${clientId} for Page/IG ID: ${receivedPageOrIgId}`);

      for (const messagingEvent of entry.messaging) {
        const senderId = messagingEvent.sender.id; // Instagram-scoped ID for the customer

        // --- Handle 'messages' webhook events (incoming DMs, story replies/mentions) ---
        if (messagingEvent.message) {
          // IMPORTANT: Check for is_echo to prevent infinite loops from messages sent by the bot itself.
          if (messagingEvent.message.is_echo) {
            console.log("[instagramWebhook] Skipping echo message from business account.");
            // You might want to log these to your conversation, but not trigger a flow execution.
            const conversationRef = db.collection('conversations').doc(`${senderId}_${receivedPageOrIgId}`);
            const messagesColRef = conversationRef.collection('messages');
            await messagesColRef.add({
              text: messagingEvent.message.text || messagingEvent.message.attachments?.[0]?.url,
              sender: 'bot', // Mark as sent by the bot
              timestamp: new Date(),
              isEcho: true,
              mid: messagingEvent.message.mid // Message ID
            });
            continue; 
          }

          const messageText = messagingEvent.message.text;
          const isStoryReply = messagingEvent.message.reply_to?.story;
          const isStoryMention = messagingEvent.message.attachments?.[0]?.type === 'story_mention';
          const isShare = messagingEvent.message.attachments?.[0]?.type === 'share';
          const attachments = messagingEvent.message.attachments; // Handle media, files etc.

          console.log(`[instagramWebhook] Message from ${senderId}: "${messageText}" (StoryReply: ${!!isStoryReply}, StoryMention: ${!!isStoryMention}, Share: ${!!isShare})`);

          const conversationRef = db.collection('conversations').doc(`${senderId}_${receivedPageOrIgId}`);
          const messagesColRef = conversationRef.collection('messages');
          await messagesColRef.add({
            text: messageText || "Media/Attachment received", // Store text or a placeholder for media
            sender: 'user', // Mark that this message is from the user
            timestamp: new Date(),
            attachments: attachments || null, // Store attachment info if present
            mid: messagingEvent.message.mid // Message ID
          });

          // --- Determine Automation Flow ---
          // For DMs and Quick Replies/Buttons, you'd typically start/resume the main flow.
          // Story replies/mentions might trigger a specific 'story' flow.

          let startNodeId = "1"; // Default starting node for new conversations
          let flowTypeToExecute = "dm"; // Default flow type for messages

          const conversationSnap = await conversationRef.get();
          if (conversationSnap.exists) {
            const convoData = conversationSnap.data();
            console.log("Found existing conversation. Resuming flow.");
            startNodeId = convoData?.currentNodeId; // Resume from last saved node
            // If it's a story reply/mention, force the 'story' flow type
            if (isStoryReply || isStoryMention) {
                flowTypeToExecute = "story";
                startNodeId = "1"; // Maybe always start story flow from beginning
            }
          } else {
            console.log("No existing conversation. Starting new flow.");
            if (isStoryReply || isStoryMention) {
                flowTypeToExecute = "story";
            }
          }
          
          // Execute the relevant flow type
          if (flowTypeToExecute === "dm") {
              await executeFlow(clientId, senderId, receivedPageOrIgId, startNodeId, messageText);
          } else if (flowTypeToExecute === "story") {
              // You'll need a separate executeStoryFlow or adapt executeFlow to take flowType
              // For now, let's just log and consider this part of future development
              console.log(`[instagramWebhook] Story automation triggered. Client: ${clientId}, Sender: ${senderId}`);
              // Example: Call a specialized executeStoryFlow or adapt executeFlow to handle 'story' flow data
              // await executeStoryFlow(clientId, senderId, receivedPageOrIgId, startNodeId, messagingEvent);
          }


        } 
        // --- Handle 'messaging_postbacks' (for buttons, quick replies) ---
        else if (messagingEvent.postback) {
          const payload = messagingEvent.postback.payload; // Payload from the button
          const title = messagingEvent.postback.title; // Text of the button clicked
          console.log(`[instagramWebhook] Postback received from ${senderId}: Title="${title}", Payload="${payload}"`);

          const conversationRef = db.collection('conversations').doc(`${senderId}_${receivedPageOrIgId}`);
          const messagesColRef = conversationRef.collection('messages');
          await messagesColRef.add({
            text: `(Button Clicked) ${title}`, // Log the button click
            sender: 'user',
            timestamp: new Date(),
            payload: payload
          });

          // Execute flow based on the payload or resume the conversation.
          // This might resume a 'question' node waiting for a button click response.
          const conversationSnap = await conversationRef.get();
          if (conversationSnap.exists) {
            const convoData = conversationSnap.data();
            // Implement logic to use payload to guide flow if current node is 'buttonQuestion'
            await executeFlow(clientId, senderId, receivedPageOrIgId, convoData?.currentNodeId, payload);
          } else {
            // Might start a new flow if user clicks button without prior conversation
            await executeFlow(clientId, senderId, receivedPageOrIgId, "1", payload);
          }

        }
        // --- Handle 'message_reactions' ---
        else if (messagingEvent.reaction) {
          const reaction = messagingEvent.reaction.reaction; // e.g., "love", "like"
          const mid = messagingEvent.reaction.mid; // Message ID reacted to
          const action = messagingEvent.reaction.action; // "react" or "unreact"
          console.log(`[instagramWebhook] Reaction (${reaction}, ${action}) from ${senderId} to message ${mid}.`);

          const conversationRef = db.collection('conversations').doc(`${senderId}_${receivedPageOrIgId}`);
          const messagesColRef = conversationRef.collection('messages');
          await messagesColRef.add({
            text: `User ${action}ed with ${reaction} to message ${mid}`,
            sender: 'user_reaction',
            timestamp: new Date(),
            reaction: { reaction, mid, action }
          });
          // Decide if a reaction triggers a flow or just gets logged.
          // Usually, reactions are just for logging/analytics.
        }
        // --- Handle 'messaging_seen' ---
        else if (messagingEvent.read) {
          const mid = messagingEvent.read.mid; // Messages with ID up to mid were read
          console.log(`[instagramWebhook] Messages up to ${mid} read by ${senderId}.`);
          // Primarily for logging/analytics in your inbox.
          const conversationRef = db.collection('conversations').doc(`${senderId}_${receivedPageOrIgId}`);
          const messagesColRef = conversationRef.collection('messages');
          await messagesColRef.add({
            text: `User read messages up to ${mid}`,
            sender: 'user_read',
            timestamp: new Date(),
            read: { mid }
          });
        }
        // --- Handle 'standby' (advanced, for multiple apps controlling conversation) ---
        else if (messagingEvent.standby) {
            console.log(`[instagramWebhook] Standby event for ${senderId}.`);
            // This indicates another app has control or your app is not in control.
            // Log it, but typically don't trigger flow execution unless specifically designed for handover logic.
        }
        // --- Handle Other Webhook Events (if subscribed to more fields) ---
        // Add `else if (messagingEvent.xyz)` for other fields like message_echoes, messaging_handover etc.
        else {
          console.log("[instagramWebhook] Received unhandled messaging event type:", JSON.stringify(messagingEvent, null, 2));
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      res.status(200).send(challenge);
    } else {
      console.error("Webhook verification failed.");
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(405);
  }
});

// =================================================================
//   CONNECT AND CREATE ACCOUNT (FOR INSTAGRAM BASIC DISPLAY - USER TOKEN)
//   - Keep this if you need to support direct Instagram User connections for non-messaging features.
//   - If only messaging, consider removing this flow and relying solely on connectFacebookPage.
// =================================================================
export const connectAndCreateAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to perform this action.');
  }
  const { code } = data as { code: string };
  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'An authorization code is required.');
  }

  const agencyId = context.auth.uid;

  // IMPORTANT: Ensure these are set as environment variables (e.g., IG_APP_ID, IG_APP_SECRET)
  const IG_APP_ID = process.env.IG_APP_ID || "740006708601685"; // Placeholder, move to env
  const IG_APP_SECRET = process.env.IG_APP_SECRET || "50692533d4e1cac6bb2ad00f3de44e8a"; // Placeholder, move to env
  const IG_EXCHANGE_TOKEN_SECRET = process.env.IG_EXCHANGE_TOKEN_SECRET || "644bf13087106e9d18613926e16c78f0"; // Placeholder, move to env

  const REDIRECT_URI = "https://admin.synapticinfo.com/auth/callback";

  try {
    const tokenResponse = await axios.postForm(`https://api.instagram.com/oauth/access_token`, {
        client_id: IG_APP_ID,
        client_secret: IG_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code: code,
    });

    const shortLivedToken = tokenResponse.data.access_token;
    const instagramUserId = tokenResponse.data.user_id;

    const longLivedResponse = await axios.get(`https://graph.instagram.com/access_token`, {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: IG_EXCHANGE_TOKEN_SECRET,
        access_token: shortLivedToken,
      }
    });
    const longLivedToken = longLivedResponse.data.access_token;

    const newAccountData = {
      agencyId: agencyId,
      agencyName: context.auth.token.name || 'Agency',
      clientName: `Instagram User ${instagramUserId}`,
      instagramPageId: instagramUserId,
      metaPageToken: longLivedToken, // This is an Instagram User Token
      subscriptionStatus: 'active',
      platform: 'INSTAGRAM',
      createdAt: new Date()
    };

    const docRef = await admin.firestore().collection('clients').add(newAccountData);
    console.log(`Successfully created Instagram Basic Display account ${docRef.id} for agency ${agencyId}`);

    return { success: true, newAccountId: docRef.id };

  } catch (error: any) {
    console.error("--- Full Axios Error Response (connectAndCreateAccount) ---");
    if (error.response) {
      console.error("Data:", error.response.data);
      console.error("Status:", error.response.status);
    } else {
      console.error('Error', error.message);
    }
    console.error("---------------------------------");
    const errorMessage = error.response?.data?.error_message || 'An error occurred while connecting the Instagram Basic Display account.';
    throw new functions.https.HttpsError('unknown', errorMessage);
  }
});


// =================================================================
//   CONNECT FACEBOOK PAGE (FOR INSTAGRAM MESSAGING VIA MESSENGER PLATFORM)
// =================================================================
export const connectFacebookPage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const { code } = data as { code: string };
  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'An authorization code is required.');
  }

  const agencyId = context.auth.uid;
  const FB_APP_ID = process.env.FACEBOOK_APP_ID; // Ensure this is set as an env variable
  const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET; // Ensure this is set as an env variable
  const REDIRECT_URI = "https://admin.synapticinfo.com/facebook/callback";

  try {
    // 1. Exchange the code for a user access token (which can then get page tokens)
    const tokenResponse = await axios.get(`https://graph.facebook.com/v20.0/oauth/access_token`, {
      params: { client_id: FB_APP_ID, redirect_uri: REDIRECT_URI, client_secret: FB_APP_SECRET, code }
    });
    const userAccessToken = tokenResponse.data.access_token; // This is a user access token

    // 2. Get the Pages from the user's account, including Instagram Business Account details and Page Access Tokens
    const accountsResponse = await axios.get(`https://graph.facebook.com/v20.0/me/accounts`, {
      params: {
        fields: 'id,name,access_token,instagram_business_account{id,username}', // <--- MODIFIED FIELDS
        access_token: userAccessToken // Use the user access token here
      }
    });

    // Find the first eligible page that has an Instagram Business Account linked AND a page access token
    const firstEligiblePage = accountsResponse.data.data.find((page: any) => {
        return page.instagram_business_account && page.instagram_business_account.id && page.access_token;
    });

    if (!firstEligiblePage) {
      throw new functions.https.HttpsError('not-found', 'No Facebook Page with a linked Instagram Business Account and valid Page Token found.');
    }

    // Extract the necessary IDs and tokens
    const facebookPageId = firstEligiblePage.id;
    const instagramBusinessAccountId = firstEligiblePage.instagram_business_account.id;
    const pageAccessToken = firstEligiblePage.access_token; // This is the Page Access Token

    // 3. Create the new account document in Firestore
    const newAccountData = {
      agencyId: agencyId,
      agencyName: context.auth.token.name || 'Agency', // Ensure context.auth.token.name is available or provide fallback
      clientName: firstEligiblePage.name, // Use the Facebook Page name
      facebookPageId: facebookPageId,
      instagramPageId: instagramBusinessAccountId, // <--- NOW CORRECTLY STORED
      metaPageToken: pageAccessToken, // This is the Page Access Token
      subscriptionStatus: 'active',
      platform: 'FACEBOOK', // Set platform to FACEBOOK
      createdAt: new Date()
    };

    const docRef = await admin.firestore().collection('clients').add(newAccountData);
    console.log(`Successfully created Facebook account ${docRef.id} for agency ${agencyId} with Facebook Page ID: ${facebookPageId} and Instagram ID: ${instagramBusinessAccountId}`);

    // --- STEP 4: Programmatically Subscribe to Webhook Fields ---
    const WEBHOOK_FIELDS = 'messages,messaging_postbacks,message_reads,messaging_referrals,messaging_optins,message_echoes,message_reactions,response_feedback,messaging_handover,messaging_policy_enforcement,standby,comments,live_comments,mentions,story_insights'; // Add all relevant fields

    try {
        await axios.post(`https://graph.facebook.com/v20.0/${facebookPageId}/subscribed_apps`, {
            subscribed_fields: WEBHOOK_FIELDS,
            access_token: pageAccessToken // Use the Page Access Token for this call
        });
        console.log(`Successfully subscribed Page ${facebookPageId} to Instagram webhook fields.`);
    } catch (webhookError: any) {
        console.error(`Failed to subscribe Page ${facebookPageId} to webhook fields:`, webhookError.response?.data?.error || webhookError.message);
        // Important: Decide how to handle this error. You might still return success for the account connection
        // but log this as a critical warning or even throw an HttpsError if subscription is mandatory.
        // For now, we log the error but allow the account creation to proceed.
    }
    // --- END STEP 4 ---

    return { success: true, newAccountId: docRef.id };

  } catch (error: any) {
    console.error("Failed to connect Facebook page:", error.response?.data?.error || error.message);
    throw new functions.https.HttpsError('unknown', 'Failed to connect account.');
  }
});

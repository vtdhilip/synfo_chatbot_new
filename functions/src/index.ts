import * as functions from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import axios from "axios";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Analytics helper function
type AnalyticsEventType = 'total_dms' | 'automated_dms' | 'total_comments' | 'automated_comments';

async function updateAnalytics(clientId: string, eventType: AnalyticsEventType) {
    const today = new Date();
    const dateString = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
    
    const analyticsRef = db.doc(`analytics/${clientId}/daily/${dateString}`);
    
    try {
        await analyticsRef.set({
            [eventType]: admin.firestore.FieldValue.increment(1),
            lastUpdated: new Date()
        }, { merge: true });
        console.log(`[ANALYTICS] Updated ${eventType} for client ${clientId}`);
    } catch (error) {
        console.error(`[ANALYTICS] Failed to update analytics for ${clientId}:`, error);
    }
}

// =================================================================
//   executeFlow: The internal engine that runs chatflows
// =================================================================
// NOTE: This function's implementation was not provided in the original prompt,
// so I'm including a placeholder. You should replace this with your actual
// chatflow execution logic.
async function executeFlow(clientId: string, senderId: string, pageId: string, startNodeId: string, userMessage: string | undefined, flowData: any) {
    console.log(`[EXECUTE_FLOW] Executing flow for client ${clientId}, sender ${senderId}, page ${pageId}, starting from node ${startNodeId}`);
    console.log(`[EXECUTE_FLOW] User message: ${userMessage}`);
    // Your chatflow execution logic goes here.
    // This typically involves processing the user message,
    // finding the next node in the flowData, and sending a response.

    // Example placeholder logic:
    if (flowData && flowData.nodes && flowData.nodes.length > 0) {
        const startNode = flowData.nodes.find((node: any) => node.id === startNodeId);
        if (startNode) {
            console.log(`[EXECUTE_FLOW] Found start node: ${startNode.id} with text: ${startNode.data?.text}`);
            // In a real scenario, you would send this message back to the user
            // via the Facebook Graph API, similar to how simple DMs are sent.
            // For now, we just log it.
        } else {
            console.warn(`[EXECUTE_FLOW] Start node ${startNodeId} not found in flow data.`);
        }
    } else {
        console.warn("[EXECUTE_FLOW] No flow data or nodes found for execution.");
    }
}

// =================================================================
//   instagramWebhook: The public endpoint to receive messages
// =================================================================
export const instagramWebhook = onRequest({
    memory: "512MiB", // Or 512MB if needed, but start lower
    timeoutSeconds: 30, // Adjust as needed, webhooks typically have short timeouts
    minInstances: 1,    // Keep at least 1 instance warm
    // maxInstances: 10, // Optional: Limit max instances to control costs/scale
},async (req, res) => {
    if (req.method === "POST") {
        const body = req.body;
        console.log("--> [START] Webhook received.", { body: JSON.stringify(body, null, 2) });

        for (const entry of body.entry) {
            const pageIgId = entry.id; // This is the Page ID or Instagram Business Account ID
            const clientsRef = db.collection('clients');
            const q = clientsRef.where("instagramPageId", "==", pageIgId);
            const querySnapshot = await q.get();

            if (querySnapshot.empty) { 
                console.log(`[WEBHOOK] No client found for Instagram Page ID: ${pageIgId}`);
                continue; 
            }
            const clientId = querySnapshot.docs[0].id;
            const clientData = querySnapshot.docs[0].data();
            const metaPageToken = clientData?.metaPageToken;
            if (!metaPageToken) { 
                console.warn(`[WEBHOOK] No metaPageToken found for client ${clientId}. Skipping processing.`);
                continue; 
            }

            // Handle MESSAGE and POSTBACK events
            if (entry.messaging) {
                for (const messagingEvent of entry.messaging) {
                    if (messagingEvent.message && !messagingEvent.message.is_echo) {
                        const senderId = messagingEvent.sender.id;
                        const messageText = messagingEvent.message.text;
                        
                        console.log(`[MESSAGE] Received message from ${senderId}: "${messageText}" for client ${clientId}`);
                        await updateAnalytics(clientId, 'total_dms');

                        const conversationRef = db.collection('conversations').doc(`${senderId}_${pageIgId}`);
                        const conversationSnap = await conversationRef.get();

                        if (conversationSnap.exists && conversationSnap.data()?.currentNodeId) {
                            console.log(`[DM_AUTO] Continuing existing conversation for ${senderId}. Current node: ${conversationSnap.data()!.currentNodeId}`);
                            await executeFlow(clientId, senderId, pageIgId, conversationSnap.data()!.currentNodeId, messageText, clientData.flow);
                            await updateAnalytics(clientId, 'automated_dms');
                        } else {
                            const dmAutomations = clientData?.dmAutomations || [];
                            let automationTriggered = false;
                            for (const automation of dmAutomations) {
                                if (automation.enabled && messageText) {
                                    const keywordMatch = (automation.keywords || []).some((k: string) => messageText.toLowerCase().includes(k.toLowerCase()));
                                    if (keywordMatch) {
                                        console.log(`[DM_AUTO] Keyword match found for automation: "${automation.name}"`);
                                        let messageData;
                                        const reply = automation.reply;

                                        if (reply.link && reply.link.url && reply.link.title) {
                                            messageData = {
                                                attachment: {
                                                    type: "template",
                                                    payload: {
                                                        template_type: "generic",
                                                        elements: [{
                                                            title: reply.text,
                                                            buttons: [{
                                                                type: "web_url",
                                                                url: reply.link.url,
                                                                title: reply.link.title,
                                                            }]
                                                        }]
                                                    }
                                                }
                                            };
                                            console.log(`[DM_AUTO] Sending link message to ${senderId}.`);
                                        } else {
                                            messageData = { text: reply.text };
                                            console.log(`[DM_AUTO] Sending text message to ${senderId}: "${reply.text}"`);
                                        }

                                        await axios.post(`https://graph.facebook.com/v20.0/me/messages`, {
                                            recipient: { id: senderId },
                                            message: messageData,
                                            messaging_type: "RESPONSE",
                                            access_token: metaPageToken,
                                        }).catch(e => console.error("Failed to send simple DM:", e.response?.data?.error));
                                        
                                        await updateAnalytics(clientId, 'automated_dms');
                                        automationTriggered = true;
                                        break; 
                                    }
                                }
                            }
                            if (!automationTriggered && clientData.flow?.nodes?.length > 0) {
                                console.log(`[DM_AUTO] No keyword automation triggered. Starting default flow for ${senderId}.`);
                                await executeFlow(clientId, senderId, pageIgId, "1", messageText, clientData.flow);
                                await updateAnalytics(clientId, 'automated_dms');
                            } else if (!automationTriggered) {
                                console.log(`[DM_AUTO] No DM automation or default flow found for client ${clientId}.`);
                            }
                        }
                    } 
                }
            }

            // Handle COMMENT events
            if (entry.changes) {
                for (const change of entry.changes) {
                   if (change.field === 'comments' || change.field === 'feed'){
                        const commenterId = change.value.from.id;
                        // Avoid processing comments made by the page itself
                        if (commenterId === pageIgId) {
                            console.log(`[COMMENT] Skipping comment from page itself: ${commenterId}`);
                            continue;
                        }

                        console.log(`[COMMENT] Received comment from ${commenterId} on media ${change.value.media.id} for client ${clientId}`);
                        await updateAnalytics(clientId, 'total_comments');

                        const commentId = change.value.id;
                        const eventRef = db.collection('processed_comments').doc(commentId);
                        
                        let automationToExecute: any = null;

                        try {
                            await db.runTransaction(async (transaction) => {
                                const eventDoc = await transaction.get(eventRef);
                                if (eventDoc.exists) {
                                    console.log(`[SKIP] Comment ID ${commentId} has already been processed.`);
                                    return; // Exit transaction
                                }

                                const postId = change.value.media.id;
                                const commentText = change.value.text;
                                const commentAutomations = clientData?.commentAutomations || [];
                                console.log(`[COMMENT_AUTO] Checking ${commentAutomations.length} comment automations for post ${postId}.`);

                                for (const automation of commentAutomations) {
                                    if (automation.enabled && automation.postId === postId) {
                                        let shouldTrigger = false;
                                        if (automation.triggerType === 'all_comments') {
                                            shouldTrigger = true;
                                            console.log(`[COMMENT_AUTO] Automation "${automation.name}" triggered by 'all_comments' type.`);
                                        } else if (automation.triggerType === 'keyword_match' && (automation.keywords || []).some((k: string) => commentText.toLowerCase().includes(k.toLowerCase()))) {
                                            shouldTrigger = true;
                                            console.log(`[COMMENT_AUTO] Automation "${automation.name}" triggered by keyword match.`);
                                        }

                                        if (shouldTrigger) {
                                            automationToExecute = automation;
                                            console.log(`[COMMENT_AUTO] Automation selected: "${automation.name}"`);
                                            break;
                                        }
                                    }
                                }
                                
                                if (automationToExecute) {
                                    transaction.set(eventRef, { 
                                        processedAt: new Date(),
                                        clientId: clientId,
                                        commenterId: commenterId,
                                        commentId: commentId,
                                        postId: postId,
                                        automationName: automationToExecute.name
                                    });
                                    console.log(`[COMMENT_AUTO] Marking comment ${commentId} as processed.`);
                                }
                            });

                            if (automationToExecute) {
                                console.log(`[ACTION] Conditions met for automation: "${automationToExecute.name}".`);
                                await updateAnalytics(clientId, 'automated_comments');

                                // Send DM
                                if (automationToExecute.reply?.text) {
                                    console.log(`[ACTION] Sending DM to ${commenterId}: "${automationToExecute.reply.text}"`);
                                    await axios.post(`https://graph.facebook.com/v20.0/me/messages`, {
                                        recipient: { id: commenterId }, 
                                        message: { text: automationToExecute.reply.text }, 
                                        messaging_type: "RESPONSE", 
                                        access_token: metaPageToken,
                                    }).catch(e => console.error("[ERROR] Failed to send comment automation DM:", e.response?.data?.error));
                                } else {
                                    console.log(`[ACTION] No DM reply text defined for automation "${automationToExecute.name}". Skipping DM.`);
                                }
                                
                                // Reply to comment
                                const replyText = automationToExecute.commentReplyText || "check your DM!!"; 
                                console.log(`[DEBUG] Attempting to reply to comment ID: ${commentId} with text: "${replyText}"`);
                                if (replyText) {
                                    await axios.post(`https://graph.facebook.com/v20.0/${commentId}/replies`, 
                                        { message: replyText },
                                        { params: { access_token: metaPageToken } }
                                    ).then(response => {
                                        console.log(`[SUCCESS] Comment reply posted successfully for comment ID ${commentId}. Response:`, response.data);
                                    })
                                    .catch(e => {
                                        console.error("[ERROR] Failed to post comment reply:", e.response?.data?.error || e.message);
                                        if (e.response?.data?.error) {
                                            console.error("[ERROR DETAILS] Facebook API Error Code:", e.response.data.error.code);
                                            console.error("[ERROR DETAILS] Facebook API Error Type:", e.response.data.error.type);
                                            console.error("[ERROR DETAILS] Facebook API Error Message:", e.response.data.error.message);
                                        }
                                    });
                                } else {
                                    console.log(`[DEBUG] No replyText defined for automation "${automationToExecute.name}". Skipping comment reply.`);
                                }
                            } else {
                                console.log(`[COMMENT_AUTO] No automation triggered for comment ${commentId}.`);
                            }

                        } catch (e) {
                            console.error("Transaction to process comment failed: ", e);
                        }
                    }
                }
            }
        }
        res.status(200).send("EVENT_RECEIVED");
        console.log("--> [END] Webhook processed.");
    } else if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        // Ensure you have this environment variable set in your Firebase project
        const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN; 

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("Webhook verified successfully!");
            res.status(200).send(challenge);
        } else {
            console.error("Webhook verification failed. Mode:", mode, "Token:", token);
            res.sendStatus(403);
        }
    } else {
        console.warn(`[WEBHOOK] Received unsupported HTTP method: ${req.method}`);
        res.sendStatus(405);
    }
});

// =================================================================
//   getInstagramPosts: Callable Cloud Function to fetch client's Instagram media
// =================================================================
export const getInstagramPosts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required to fetch posts.');
  }

  const { clientId } = data as { clientId: string };
  if (!clientId) {
    throw new functions.https.HttpsError('invalid-argument', 'Client ID is required.');
  }

  try {
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Client with ID ${clientId} not found.`);
    }

    const clientData = clientDoc.data();
    const metaPageToken = clientData?.metaPageToken;
    const instagramBusinessAccountId = clientData?.instagramPageId; // Ensure this is indeed the IG Business Account ID

    if (!metaPageToken || !instagramBusinessAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'Meta Page Token or Instagram Business Account ID missing for client.');
    }

    console.log(`[GET_IG_POSTS] Fetching posts for client ${clientId}, IG Account ID: ${instagramBusinessAccountId}`);
    const instagramMediaResponse = await axios.get(
      `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}/media`,
      {
        params: {
          fields: 'id,thumbnail_url,media_url,caption,permalink,media_type',
          access_token: metaPageToken,
          limit: 25, // Fetch up to 25 recent posts
        },
      }
    );

    const posts = instagramMediaResponse.data.data;

    const formattedPosts = posts.map((media: any) => ({
      id: media.id,
      thumbnail_url: media.thumbnail_url || media.media_url, // Use media_url if thumbnail_url is not available (e.g., for videos without specific thumbnails)
      media_url: media.media_url,
      caption: media.caption || '',
      permalink: media.permalink,
      media_type: media.media_type,
    }));

    console.log(`Successfully fetched ${formattedPosts.length} Instagram posts for client ${clientId}.`);
    return { success: true, posts: formattedPosts };

  } catch (error: any) {
    console.error(`Error fetching Instagram posts for client ${clientId}:`, error.response?.data?.error || error.message);
    // Propagate detailed error from Facebook API if available
    throw new functions.https.HttpsError('unknown', 'Failed to fetch Instagram posts.', error.response?.data?.error || { message: error.message });
  }
});

// =================================================================
//   getFacebookPages & finalizeFacebookConnection: New connection flow
// =================================================================
export const getFacebookPages = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const { code } = data as { code: string };
  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'An authorization code is required.');
  }

  // Ensure these environment variables are set
  const FB_APP_ID = process.env.FACEBOOK_APP_ID;
  const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  const REDIRECT_URI = "https://app.synapticinfo.com/facebook/callback"; // Make sure this matches your Facebook App's redirect URI

  if (!FB_APP_ID || !FB_APP_SECRET) {
      throw new functions.https.HttpsError('internal', 'Facebook App credentials are not configured.');
  }

  try {
    console.log("[FB_CONNECT] Exchanging authorization code for user access token.");
    const tokenResponse = await axios.get(`https://graph.facebook.com/v20.0/oauth/access_token`, {
      params: { 
          client_id: FB_APP_ID, 
          redirect_uri: REDIRECT_URI, 
          client_secret: FB_APP_SECRET, 
          code 
      }
    });
    const userAccessToken = tokenResponse.data.access_token;
    console.log("[FB_CONNECT] Successfully obtained user access token.");

    console.log("[FB_CONNECT] Fetching pages for user.");
    const accountsResponse = await axios.get(`https://graph.facebook.com/v20.0/me/accounts`, {
      params: {
        // Requesting 'instagram_business_account' field to directly get linked IG account info
        fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}',
        access_token: userAccessToken
      }
    });
    
    // Filter for pages that have a linked Instagram Business Account
    const eligiblePages = accountsResponse.data.data.filter((page: any) => page.instagram_business_account);
    
    if (eligiblePages.length === 0) {
      throw new functions.https.HttpsError('not-found', 'No Facebook Pages with a linked Instagram Business Account were found.');
    }
    
    console.log(`[FB_CONNECT] Found ${eligiblePages.length} eligible Facebook pages.`);
    return { success: true, pages: eligiblePages };

  } catch (error: any) {
    console.error("Failed to fetch Facebook pages:", error.response?.data?.error || error.message);
    throw new functions.https.HttpsError('unknown', 'Failed to fetch Facebook pages.', error.response?.data?.error);
  }
});

export const finalizeFacebookConnection = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { pageId, pageName, pageAccessToken, igId, igUsername } = data;
    if (!pageId || !pageName || !pageAccessToken || !igId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required page data (pageId, pageName, pageAccessToken, igId).');
    }
    
    const agencyId = context.auth.uid;
    const agencyName = context.auth.token.name || 'Agency';

    console.log(`[FINALIZE_FB] Finalizing connection for agency ${agencyId} with Page ID: ${pageId}, IG ID: ${igId}`);

    const existingClientQuery = await db.collection('clients').where("instagramPageId", "==", igId).get();
    if (!existingClientQuery.empty) {
        throw new functions.https.HttpsError('already-exists', 'This Instagram account has already been connected.');
    }

    const newAccountData = {
      agencyId: agencyId,
      agencyName: agencyName,
      clientName: igUsername || pageName, // Use Instagram username as client name if available
      facebookPageId: pageId,
      instagramPageId: igId, // This should be the Instagram Business Account ID
      metaPageToken: pageAccessToken, // This is the Page Access Token
      subscriptionStatus: 'active', // Default to active
      platform: 'INSTAGRAM', // Explicitly note it's for Instagram via Facebook Page
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
      dmAutomations: [],
      commentAutomations: [],
      flow: {
         nodes: [],
         edges: []
      }
    };

    console.log(`[FINALIZE_FB] Creating new client document for IG account ${igUsername || igId}.`);
    const docRef = await db.collection('clients').add(newAccountData);
    console.log(`Successfully created client document ${docRef.id} for agency ${agencyId}`);

    // List of webhook fields to subscribe to for Instagram messaging and comments
    const WEBHOOK_FIELDS = 'messages,messaging_postbacks,message_reads,messaging_referrals,messaging_optins,message_echoes,message_reactions,response_feedback,messaging_handover,messaging_policy_enforcement,standby,comments,live_comments,mentions,story_insights,feed';

    try {
        console.log(`[FINALIZE_FB] Subscribing Page ${pageId} to webhook fields.`);
        await axios.post(`https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`, {
            subscribed_fields: WEBHOOK_FIELDS,
            access_token: pageAccessToken // Use the Page Access Token for subscription
        });
        console.log(`Successfully subscribed Page ${pageId} to Instagram webhook fields.`);
    } catch (webhookError: any) {
        console.error(`Failed to subscribe Page ${pageId} to webhook fields:`, webhookError.response?.data?.error || webhookError.message);
        // Log the full error response for debugging
        if (webhookError.response?.data) {
            console.error("Webhook subscription error details:", JSON.stringify(webhookError.response.data, null, 2));
        }
        // It might be good to throw an HttpsError here too, or decide if the client creation should rollback.
        // For now, we proceed as the client document is already created.
    }

    return { success: true, newAccountId: docRef.id };
});
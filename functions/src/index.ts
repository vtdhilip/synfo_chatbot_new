import * as functions from "firebase-functions";
import { onRequest, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { setGlobalOptions } from "firebase-functions/v2";
import axios from "axios";
import * as admin from "firebase-admin";
import { PubSub } from "@google-cloud/pubsub";
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();
const pubsubClient = new PubSub();

// Set global options for all functions in this file
setGlobalOptions({
    // memory: "512MiB",
    // timeoutSeconds: 30,
    // minInstances: 1,
});


type AnalyticsEventType = 'total_dms' | 'automated_dms' | 'total_comments' | 'automated_comments' | 'total_automations';

interface PubSubMessagePayload {
    clientId: string;
    eventType: AnalyticsEventType;
    timestamp: string;
}

async function publishAnalyticsEvent(clientId: string, eventType: AnalyticsEventType) {
    try {
        await pubsubClient.topic('analytics_events').publishMessage({
            json: { clientId, eventType, timestamp: new Date().toISOString() }
        });
    } catch (error) {
        console.error(`[ANALYTICS_PUB] Failed to publish analytics event for ${clientId}:`, error);
    }
}

export const processAnalyticsEvents = onMessagePublished('analytics_events', async (event) => {
    try {
        if (!event.data || !event.data.message || typeof event.data.message.data !== 'string') {
            console.error("[ANALYTICS_PROC] Invalid Pub/Sub message format: missing or malformed data.", event);
            return;
        }

        const { clientId, eventType, timestamp } = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString()) as PubSubMessagePayload;

        const eventDate = new Date(timestamp);
        const dateString = `${eventDate.getUTCFullYear()}-${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}-${String(eventDate.getUTCDate()).padStart(2, '0')}`;

        const analyticsRef = db.doc(`analytics/${clientId}/daily/${dateString}`);

        await analyticsRef.set({
            [eventType]: admin.firestore.FieldValue.increment(1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error(`[ANALYTICS_PROC] Failed to update analytics:`, error);
    }
});

async function executeFlow(clientId: string, senderId: string, pageId: string, startNodeId: string, userMessage: string | undefined, flowData: any) {
    if (flowData && flowData.nodes && flowData.nodes.length > 0) {
        const startNode = flowData.nodes.find((node: any) => node.id === startNodeId);
        if (startNode) {
        } else {
            console.warn(`[EXECUTE_FLOW] Start node ${startNodeId} not found for client ${clientId}.`);
        }
    } else {
        console.warn(`[EXECUTE_FLOW] No flow data or nodes found for client ${clientId} to execute.`);
    }
}

// FIX: Define PlanCapabilities and planFeatures here (must match frontend)
interface PlanCapabilities {
    // Removed maxDMs as it's not currently enforced or used in functions
    canUseChatflow: boolean;
    maxAccounts: number | 'Infinity';
    canUseAdvancedChatflow: boolean;
    canUseLeadQualification: boolean;
    canUseSegmentation: boolean;
    maxAutomations: number | 'unlimited';
}

type PlanId = 'free' | 'basic' | 'professional' | 'enterprise';

const planFeatures: Record<PlanId, PlanCapabilities> = {
    'free': {
        canUseChatflow: false, maxAccounts: 1, canUseAdvancedChatflow: false,
        canUseLeadQualification: false, canUseSegmentation: false,
        maxAutomations: 10,
    },
    'basic': {
        canUseChatflow: true, maxAccounts: 5, canUseAdvancedChatflow: false,
        canUseLeadQualification: false, canUseSegmentation: false,
        maxAutomations: 50,
    },
    'professional': {
        canUseChatflow: true, maxAccounts: Infinity, canUseAdvancedChatflow: true,
        canUseLeadQualification: true, canUseSegmentation: true,
        maxAutomations: 'unlimited',
    },
    'enterprise': {
        canUseChatflow: true, maxAccounts: Infinity, canUseAdvancedChatflow: true,
        canUseLeadQualification: true, canUseSegmentation: true,
        maxAutomations: 'unlimited',
    },
};


export const instagramWebhook = onRequest({
    // env: { ... } // Add env variables specific to this function if needed
}, async (req, res) => {
    if (req.method === "POST") {
        const body = req.body;

        for (const entry of body.entry) {
            const pageIgId = entry.id;

            const clientsRef = db.collection('clients');
            const q = clientsRef.where("instagramPageId", "==", pageIgId);
            const querySnapshot = await q.get();

            if (querySnapshot.empty) {
                continue;
            }
            const clientId = querySnapshot.docs[0].id;
            const clientData = querySnapshot.docs[0].data();
            const metaPageToken = clientData?.metaPageToken;
            if (!metaPageToken) {
                console.warn(`[WEBHOOK] No metaPageToken for client ${clientId}. Skipping.`);
                continue;
            }

            // FIX: Fetch user's subscription and current automation count for enforcement
            const userDoc = await db.collection('users').doc(clientData.agencyId).get();
            const userData = userDoc.data();
            const userSubscription = userData?.subscription;
            const currentPlanId = (userSubscription?.planId || 'free') as PlanId;
            const planCapabilities = planFeatures[currentPlanId] || planFeatures['free'];
            const maxAutomations = planCapabilities.maxAutomations;

            // Fetch current month's total automations for this client
            const today = new Date();
            // This assumes daily analytics documents. For monthly aggregation, you'd fetch a monthly doc.
            const currentMonthYearDay = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
            const analyticsDoc = await db.collection('analytics').doc(clientId).collection('daily').doc(currentMonthYearDay).get();
            const currentAutomations = (analyticsDoc.data()?.total_automations || 0);

            // FIX: Enforce automation limit
            if (typeof maxAutomations === 'number' && currentAutomations >= maxAutomations) {
                console.warn(`[WEBHOOK] Automation limit reached for client ${clientId} (${currentAutomations}/${maxAutomations}). Skipping automation.`);
                res.status(200).send("EVENT_RECEIVED - Limit Reached"); // Acknowledge webhook but indicate limit
                return; // Stop processing this webhook entry
            }


            if (entry.messaging) {
                for (const messagingEvent of entry.messaging) {
                    if (messagingEvent.message && !messagingEvent.message.is_echo) {
                        const senderId = messagingEvent.sender.id;
                        const messageText = messagingEvent.message.text;

                        await publishAnalyticsEvent(clientId, 'total_dms');

                        const conversationRef = db.collection('conversations').doc(`${senderId}_${pageIgId}`);
                        const conversationSnap = await conversationRef.get();

                        if (conversationSnap.exists && conversationSnap.data()?.currentNodeId) {
                            await executeFlow(clientId, senderId, pageIgId, conversationSnap.data()!.currentNodeId, messageText, clientData.flow);
                            await publishAnalyticsEvent(clientId, 'automated_dms');
                            // FIX: Increment total_automations for flow execution
                            await publishAnalyticsEvent(clientId, 'total_automations');
                        } else {
                            const dmAutomations = clientData?.dmAutomations || [];
                            let automationTriggered = false;
                            for (const automation of dmAutomations) {
                                if (automation.enabled && messageText) {
                                    const keywordMatch = (automation.keywords || []).some((k: string) => messageText.toLowerCase().includes(k.toLowerCase()));
                                    if (keywordMatch) {
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
                                        } else {
                                            messageData = { text: reply.text };
                                        }

                                        await axios.post(`https://graph.facebook.com/v20.0/me/messages`, {
                                            recipient: { id: senderId },
                                            message: messageData,
                                            messaging_type: "RESPONSE",
                                            access_token: metaPageToken,
                                        }).catch(e => console.error(`[ERROR] Failed to send simple DM to ${senderId}:`, e.response?.data?.error || e.message));

                                        await publishAnalyticsEvent(clientId, 'automated_dms');
                                        // FIX: Increment total_automations for simple DM automation
                                        await publishAnalyticsEvent(clientId, 'total_automations');
                                        automationTriggered = true;
                                        break;
                                    }
                                }
                            }
                            if (!automationTriggered && clientData.flow?.nodes?.length > 0) {
                                await executeFlow(clientId, senderId, pageIgId, "1", messageText, clientData.flow);
                                await publishAnalyticsEvent(clientId, 'automated_dms');
                                // FIX: Increment total_automations for default flow execution
                                await publishAnalyticsEvent(clientId, 'total_automations');
                            } else if (!automationTriggered) {
                            }
                        }
                    }
                }
            }

            if (entry.changes) {
                for (const change of entry.changes) {
                   if (change.field === 'comments' || change.field === 'feed'){
                        const commenterId = change.value.from.id;
                        if (commenterId === pageIgId) {
                            continue;
                        }

                        await publishAnalyticsEvent(clientId, 'total_comments');

                        const commentId = change.value.id;
                        const eventRef = db.collection('processed_comments').doc(commentId);

                        let automationToExecute: any = null;

                        try {
                            await db.runTransaction(async (transaction) => {
                                const eventDoc = await transaction.get(eventRef);
                                if (eventDoc.exists) {
                                    return;
                                }

                                const postId = change.value.media.id;
                                const commentText = change.value.text;
                                const commentAutomations = clientData?.commentAutomations || [];

                                for (const automation of commentAutomations) {
                                    if (automation.enabled && automation.postId === postId) {
                                        let shouldTrigger = false;
                                        if (automation.triggerType === 'all_comments') {
                                            shouldTrigger = true;
                                        } else if (automation.triggerType === 'keyword_match' && (automation.keywords || []).some((k: string) => commentText.toLowerCase().includes(k.toLowerCase()))) {
                                            shouldTrigger = true;
                                        }

                                        if (shouldTrigger) {
                                            automationToExecute = automation;
                                            break;
                                        }
                                    }
                                }

                                if (automationToExecute) {
                                    transaction.set(eventRef, {
                                        processedAt: admin.firestore.FieldValue.serverTimestamp(),
                                        clientId: clientId,
                                        commenterId: commenterId,
                                        commentId: commentId,
                                        postId: postId,
                                        automationName: automationToExecute.name
                                    });
                                }
                            });

                            if (automationToExecute) {
                                await publishAnalyticsEvent(clientId, 'automated_comments');
                                // FIX: Increment total_automations for comment automation execution
                                await publishAnalyticsEvent(clientId, 'total_automations');

                                if (automationToExecute.reply?.text) {
                                    await axios.post(`https://graph.facebook.com/v20.0/me/messages`, {
                                        recipient: { id: commenterId },
                                        message: { text: automationToExecute.reply.text },
                                        messaging_type: "RESPONSE",
                                        access_token: metaPageToken,
                                    }).catch(e => console.error(`[ERROR] Failed to send comment automation DM to ${commenterId}:`, e.response?.data?.error || e.message));
                                } else {
                                }

                                const replyText = automationToExecute.commentReplyText || "Check your DM!!";
                                if (replyText) {
                                    await axios.post(`https://graph.facebook.com/v20.0/${commentId}/replies`,
                                        { message: replyText },
                                        { params: { access_token: metaPageToken } }
                                    ).then(response => {
                                    })
                                    .catch(e => {
                                        console.error(`[ERROR] Failed to post comment reply for ${commentId}:`, e.response?.data?.error || e.message);
                                        if (e.response?.data) {
                                            console.error("[ERROR DETAILS]", JSON.stringify(e.response.data, null, 2));
                                        }
                                    });
                                } else {
                                }
                            } else {
                            }

                        } catch (e) {
                            console.error(`[ERROR] Transaction to process comment ${commentId} failed: `, e);
                        }
                    }
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





export const getInstagramPosts = functions.https.onCall(async (request: CallableRequest<{ clientId: string }>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required to fetch posts.');
    }

    const { clientId } = request.data;
    if (!clientId) {
        throw new HttpsError('invalid-argument', 'Client ID is required.');
    }

    try {
        const clientDoc = await db.collection('clients').doc(clientId).get();
        if (!clientDoc.exists) {
            throw new HttpsError('not-found', `Client with ID ${clientId} not found.`);
        }

        const clientData = clientDoc.data();
        const metaPageToken = clientData?.metaPageToken;
        const instagramBusinessAccountId = clientData?.instagramPageId;

        if (!metaPageToken || !instagramBusinessAccountId) {
            throw new HttpsError('failed-precondition', 'Meta Page Token or Instagram Business Account ID missing for client.');
        }

        const instagramMediaResponse = await axios.get(
            `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}/media`,
            {
                params: {
                    fields: 'id,thumbnail_url,media_url,caption,permalink,media_type',
                    access_token: metaPageToken,
                    limit: 25,
                },
            }
        );

        const posts = instagramMediaResponse.data.data;
        const formattedPosts = posts.map((media: any) => ({
            id: media.id,
            thumbnail_url: media.thumbnail_url || media.media_url,
            media_url: media.media_url,
            caption: media.caption || '',
            permalink: media.permalink,
            media_type: media.media_type,
        }));

        return { success: true, posts: formattedPosts };

    } catch (error: any) {
        console.error(`[ERROR] Fetching IG posts for client ${clientId}:`, error.response?.data?.error || error.message);
        throw new HttpsError('unknown', 'Failed to fetch Instagram posts.', error.response?.data?.error || { message: error.message });
    }
});






export const getFacebookPages = functions.https.onCall(async (request: CallableRequest<{ code: string }>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { code } = request.data;
    if (!code) {
        throw new HttpsError('invalid-argument', 'An authorization code is required.');
    }

    const FB_APP_ID = process.env.FACEBOOK_APP_ID;
    const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
    const REDIRECT_URI = "https://app.synapticinfo.com/facebook/callback";

    if (!FB_APP_ID || !FB_APP_SECRET) {
        throw new HttpsError('internal', 'Facebook App credentials are not configured.');
    }

    try {
        const tokenResponse = await axios.get(`https://graph.facebook.com/v20.0/oauth/access_token`, {
            params: {
                client_id: FB_APP_ID,
                redirect_uri: REDIRECT_URI,
                client_secret: FB_APP_SECRET,
                code
            }
        });
        const userAccessToken = tokenResponse.data.access_token;

        const accountsResponse = await axios.get(`https://graph.facebook.com/v20.0/me/accounts`, {
            params: {
                fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}',
                access_token: userAccessToken
            }
        });

        const eligiblePages = accountsResponse.data.data.filter((page: any) => page.instagram_business_account);

        if (eligiblePages.length === 0) {
            throw new HttpsError('not-found', 'No Facebook Pages with a linked Instagram Business Account were found.');
        }

        return { success: true, pages: eligiblePages };

    } catch (error: any) {
        console.error("Failed to fetch Facebook pages:", error.response?.data?.error || error.message);
        throw new HttpsError('unknown', 'Failed to fetch Facebook pages.', error.response?.data?.error);
    }
});

export const finalizeFacebookConnection = functions.https.onCall(async (request: CallableRequest<{
    pageId: string;
    pageName: string;
    pageAccessToken: string;
    igId: string;
    igUsername?: string;
}>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { pageId, pageName, pageAccessToken, igId, igUsername } = request.data;
    if (!pageId || !pageName || !pageAccessToken || !igId) {
        throw new HttpsError('invalid-argument', 'Missing required page data (pageId, pageName, pageAccessToken, igId).');
    }

    const agencyId = request.auth.uid;
    const agencyName = request.auth.token?.name || 'Agency';

    const clientDocRef = db.collection('clients').doc(igId);
    const clientDoc = await clientDocRef.get();

    let newAccountId: string;

    if (clientDoc.exists) {
        newAccountId = clientDoc.id;
        await clientDocRef.update({
            metaPageToken: pageAccessToken,
            lastConnectedAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(e => console.error(`[FINALIZE_FB] Failed to update existing client ${igId}:`, e));

        throw new HttpsError('already-exists', 'This Instagram account has been connected.');

    } else {
        const newAccountData = {
            agencyId: agencyId,
            agencyName: agencyName,
            clientName: igUsername || pageName,
            facebookPageId: pageId,
            instagramPageId: igId,
            metaPageToken: pageAccessToken,
            subscriptionStatus: 'active',
            platform: 'INSTAGRAM',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            dmAutomations: [],
            commentAutomations: [],
            flow: {
                nodes: [],
                edges: []
            }
        };

        await clientDocRef.set(newAccountData);
        newAccountId = clientDocRef.id;
    }

    const WEBHOOK_FIELDS = 'messages,messaging_postbacks,message_reads,messaging_referrals,messaging_optins,message_echoes,message_reactions,response_feedback,standby,comments,live_comments,mentions,story_insights,feed';

    try {
        await axios.post(`https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`, {
            subscribed_fields: WEBHOOK_FIELDS,
            access_token: pageAccessToken
        });
    }
    catch (webhookError: any) {
        console.error(`Failed to subscribe Page ${pageId} to webhook fields:`, webhookError.response?.data?.error || webhookError.message);
        if (webhookError.response?.data) {
            console.error("Webhook subscription error details:", JSON.stringify(webhookError.response.data, null, 2));
        }
    }

    return { success: true, newAccountId: newAccountId };
});


export const createRazorpayOrder = functions.https.onCall(async (request: CallableRequest<{
    amount: number; // Amount in smallest currency unit (e.g., paisa for INR)
    currency: string; // e.g., "INR"
    receipt: string; // Unique identifier for the order (e.g., userId_planId_timestamp)
    userId: string; // Firebase Auth UID of the user initiating payment
    planId: string; // ID of the plan being purchased
}>) => {
    // 1. Authentication and Authorization Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required to create a payment order.');
    }
    const userId = request.auth.uid; // Get the authenticated user's UID

    // 2. Validate Input Data
    const { amount, currency, receipt, planId } = request.data;
    if (!amount || !currency || !receipt || !planId) {
        throw new HttpsError('invalid-argument', 'Missing required order details (amount, currency, receipt, planId).');
    }
    if (userId !== request.data.userId) { // Ensure the user calling is the user paying
        throw new HttpsError('permission-denied', 'User ID mismatch for payment order.');
    }
    if (amount <= 0) {
        throw new HttpsError('invalid-argument', 'Amount must be positive.');
    }

    // 3. Retrieve Razorpay API Keys from Environment Variables
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
        console.error("[RAZORPAY_ORDER] Razorpay API keys are not configured. Check environment variables.");
        throw new HttpsError('internal', 'Payment gateway not configured.');
    }

    // 4. Create Razorpay Order API Call
    try {
        // Razorpay API endpoint for creating orders
        const RAZORPAY_API_URL = 'https://api.razorpay.com/v1/orders';

        // Base64 encode the API Key Id and Secret for Basic Auth
        const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

        const orderData = {
            amount: amount, // Amount in paisa (e.g., 10000 for ₹100.00)
            currency: currency,
            receipt: receipt,
            payment_capture: 1 // Auto capture payment after successful authorization
        };

        console.log(`[RAZORPAY_ORDER] Creating order for user ${userId}, plan ${planId} with amount ${amount} ${currency}`);

        const response = await axios.post(RAZORPAY_API_URL, orderData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            }
        });

        const order = response.data;
        console.log(`[RAZORPAY_ORDER] Order created: ${order.id}`);

        // Return the order ID to the frontend
        return { success: true, orderId: order.id, keyId: razorpayKeyId };

    } catch (error: any) {
        console.error("[RAZORPAY_ORDER] Failed to create Razorpay order:", error.response?.data || error.message);
        throw new HttpsError('internal', 'Failed to create payment order.', error.response?.data);
    }
});


// =================================================================
//   razorpayWebhook: HTTP Cloud Function to handle Razorpay payment notifications
// =================================================================
export const razorpayWebhook = onRequest( async (req, res) => {
    // 1. Verify Request Method
    if (req.method !== 'POST') {
        console.warn("[RAZORPAY_WEBHOOK] Received non-POST request:", req.method);
        res.status(405).send('Method Not Allowed');
        return; // Explicitly return void
    }

    // 2. Retrieve Razorpay Webhook Secret from Environment Variables
    const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!razorpayWebhookSecret) {
        console.error("[RAZORPAY_WEBHOOK] Razorpay Webhook Secret is not configured. Check environment variables.");
        res.status(500).send('Webhook secret not configured.');
        return; // Explicitly return void
    }

    // 3. Verify Webhook Signature (CRITICAL SECURITY STEP)
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
        console.error("[RAZORPAY_WEBHOOK] Missing Razorpay signature header.");
        res.status(400).send('Missing signature');
        return; // Explicitly return void
    }

    const body = req.rawBody; // Get the raw body for signature verification

    const expectedSignature = crypto.createHmac('sha256', razorpayWebhookSecret)
                                    .update(body)
                                    .digest('hex');

    if (expectedSignature !== signature) {
        console.error("[RAZORPAY_WEBHOOK] Invalid Razorpay signature. Request potentially tampered.");
        res.status(400).send('Invalid signature');
        return; // Explicitly return void
    }

    // 4. Process the Webhook Event
    const event = req.body;
    console.log(`[RAZORPAY_WEBHOOK] Received event: ${event.event}`);

    try {
        // Declare paymentEntity and orderEntity outside the switch for broader scope
        let paymentEntity: any;
        let orderEntity: any;

        switch (event.event) {
            case 'payment.authorized':
            case 'payment.captured':
                paymentEntity = event.payload.payment.entity;
                orderEntity = event.payload.order.entity;

                console.log(`[RAZORPAY_WEBHOOK] Payment ${paymentEntity.id} for Order ${orderEntity.id} (${paymentEntity.status}) received.`);
                console.log(`[RAZORPAY_WEBHOOK] User ${orderEntity.receipt} paid ${paymentEntity.amount / 100} ${paymentEntity.currency} for receipt ${orderEntity.receipt}`);

                // Update user's subscription status in Firestore
                // Extract userId and planId from the receipt (e.g., "userId_planId_timestamp")
                const receiptParts = orderEntity.receipt.split('_');
                const actualUserId = receiptParts[0];
                const actualPlanId = receiptParts[1]; // Assuming planId is the second part

                if (actualUserId) {
                    const userDocRef = db.collection('users').doc(actualUserId);
                    await userDocRef.update({
                        subscription: {
                            planId: actualPlanId,
                            status: 'active',
                            razorpayPaymentId: paymentEntity.id,
                            razorpayOrderId: orderEntity.id,
                            amountPaid: paymentEntity.amount,
                            currency: paymentEntity.currency,
                            subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
                            // Add more details as needed, e.g., next billing date
                        }
                    });
                    console.log(`[RAZORPAY_WEBHOOK] User ${actualUserId} subscription updated to active for plan ${actualPlanId}.`);
                } else {
                    console.warn(`[RAZORPAY_WEBHOOK] Could not extract userId from receipt: ${orderEntity.receipt}`);
                }
                break;

            case 'payment.failed':
                // Payment failed
                paymentEntity = event.payload.payment.entity;
                console.error(`[RAZORPAY_WEBHOOK] Payment ${paymentEntity.id} failed: ${paymentEntity.error_description}`);
                // You might want to update user status to 'payment_failed' or notify them
                break;

            // Add other event types as needed (e.g., 'refund.processed', 'subscription.charged')
            default:
                console.log(`[RAZORPAY_WEBHOOK] Unhandled event type: ${event.event}`);
        }

        res.status(200).send('Webhook received successfully');
        return; // Explicitly return void

    } catch (error: any) {
        console.error("[RAZORPAY_WEBHOOK] Error processing webhook event:", error.message, error);
        res.status(500).send('Internal Server Error');
        return; // Explicitly return void
    }
});


// =================================================================
//   confirmSubscription: Callable Cloud Function to verify payment and update subscription
// =================================================================
export const confirmSubscription = functions.https.onCall(async (request: CallableRequest<{
    payment_id: string;
    order_id: string;
    signature: string;
}>) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required to confirm subscription.');
    }
    const userId = request.auth.uid;

    // 2. Validate Input Data
    const { payment_id, order_id, signature } = request.data;
    if (!payment_id || !order_id || !signature) {
        throw new HttpsError('invalid-argument', 'Missing payment verification details.');
    }

    // 3. Retrieve Razorpay API Keys and Webhook Secret from Environment Variables
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
        console.error("[CONFIRM_SUB] Razorpay API keys are not configured. Check environment variables.");
        throw new HttpsError('internal', 'Payment gateway not configured.');
    }

    // 4. Verify Payment Signature (CRITICAL SECURITY STEP)
    const generatedSignature = crypto.createHmac('sha256', razorpayKeySecret)
                                     .update(order_id + '|' + payment_id)
                                     .digest('hex');

    if (generatedSignature !== signature) {
        console.error("[CONFIRM_SUB] Invalid payment signature for order:", order_id);
        return { success: false, message: 'Payment verification failed: Invalid signature.' };
    }

    // 5. Optionally, Fetch Payment Details from Razorpay API (for stronger verification)
    try {
        const RAZORPAY_PAYMENT_API_URL = `https://api.razorpay.com/v1/payments/${payment_id}`;
        const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

        const paymentResponse = await axios.get(RAZORPAY_PAYMENT_API_URL, {
            headers: { 'Authorization': authHeader }
        });

        const paymentDetails = paymentResponse.data;
        if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
            console.error(`[CONFIRM_SUB] Payment ${payment_id} not in captured/authorized state: ${paymentDetails.status}`);
            return { success: false, message: `Payment not successful: ${paymentDetails.status}.` };
        }

        // Extract receipt from order details if needed, or pass plan info directly
        const orderIdFromPayment = paymentDetails.order_id;
        // You might need to fetch the order details to get the receipt and thus userId/planId
        const orderResponse = await axios.get(`https://api.razorpay.com/v1/orders/${orderIdFromPayment}`, {
            headers: { 'Authorization': authHeader }
        });
        const orderDetails = orderResponse.data;
        const receiptParts = orderDetails.receipt.split('_'); // Assuming format userId_planId_timestamp
        const actualPlanId = receiptParts[1];


        // 6. Update User's Subscription in Firestore
        const userDocRef = db.collection('users').doc(userId); // Use the authenticated user's UID
        await userDocRef.update({
            subscription: {
                planId: actualPlanId, // Use the plan ID from the receipt or passed data
                status: 'active',
                razorpayPaymentId: payment_id,
                razorpayOrderId: order_id,
                amountPaid: paymentDetails.amount,
                currency: paymentDetails.currency,
                subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
                // Add more details as needed, e.g., next billing date
            }
        });
        console.log(`[CONFIRM_SUB] User ${userId} subscription updated to active for plan ${actualPlanId}.`);

        return { success: true, message: 'Subscription confirmed.' };

    } catch (error: any) {
        console.error("[CONFIRM_SUB] Error during payment verification or subscription update:", error.response?.data || error.message);
        throw new HttpsError('internal', 'Payment verification failed.', error.response?.data);
    }
});

// =================================================================
//   cancelSubscription: Callable Cloud Function to cancel user subscription
// =================================================================
export const cancelSubscription = functions.https.onCall(async (request: CallableRequest<{
    // If you were integrating with Razorpay Subscriptions API, you might pass subscriptionId here
    // subscriptionId: string;
}>) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required to cancel subscription.');
    }
    const userId = request.auth.uid;

    // 2. (Optional) Call Razorpay Subscriptions API to cancel the subscription
    // If you were using Razorpay Subscriptions, you would make an axios call here
    // For example:
    /*
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
        throw new HttpsError('internal', 'Payment gateway credentials not configured for cancellation.');
    }
    const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    try {
        await axios.post(`https://api.razorpay.com/v1/subscriptions/${request.data.subscriptionId}/cancel`, {}, {
            headers: { 'Authorization': authHeader }
        });
        console.log(`[CANCEL_SUB] Razorpay subscription ${request.data.subscriptionId} cancelled.`);
    } catch (error: any) {
        console.error("[CANCEL_SUB] Failed to cancel Razorpay subscription:", error.response?.data || error.message);
        throw new HttpsError('internal', 'Failed to cancel subscription with payment gateway.', error.response?.data);
    }
    */

    // 3. Update User's Subscription Status in Firestore
    try {
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.update({
            'subscription.status': 'cancelled', // Update only the status field
            'subscription.cancelledAt': admin.firestore.FieldValue.serverTimestamp(), // Record cancellation time
            // You might also clear other Razorpay specific IDs if the subscription is truly ended
            // 'subscription.razorpaySubscriptionId': admin.firestore.FieldValue.delete(),
        });
        console.log(`[CANCEL_SUB] User ${userId} subscription status updated to 'cancelled'.`);
        return { success: true, message: 'Subscription cancelled successfully.' };
    } catch (error: any) {
        console.error("[CANCEL_SUB] Error updating Firestore for cancellation:", error.message);
        throw new HttpsError('internal', 'Failed to update subscription status in Firestore.', error.message);
    }
});

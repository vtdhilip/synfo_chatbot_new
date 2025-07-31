
import * as functions from "firebase-functions";
import { onRequest, onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { setGlobalOptions } from "firebase-functions/v2";
import axios from "axios";
import * as admin from "firebase-admin";
import { PubSub } from "@google-cloud/pubsub";
import * as crypto from 'crypto';
import { CloudTasksClient } from "@google-cloud/tasks";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

admin.initializeApp();
const db = admin.firestore();
const pubsubClient = new PubSub();
const tasksClient = new CloudTasksClient();
// Set global options for all functions in this file
setGlobalOptions({
    // memory: "512MiB",
    // timeoutSeconds: 30,
    // minInstances: 1,
});

type AnalyticsEventType = 'total_dms' | 'automated_dms' | 'total_comments' | 'automated_comments' | 'total_story_replies' | 'automated_story_replies';

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
        const dailyDateString = `${eventDate.getUTCFullYear()}-${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}-${String(eventDate.getUTCDate()).padStart(2, '0')}`;
        const monthlyDateString = `${eventDate.getUTCFullYear()}-${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}`;

        const dailyAnalyticsRef = db.doc(`analytics/${clientId}/daily/${dailyDateString}`);
        await dailyAnalyticsRef.set({
            [eventType]: admin.firestore.FieldValue.increment(1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const monthlyAnalyticsRef = db.doc(`analytics/${clientId}/monthly/${monthlyDateString}`);
        await monthlyAnalyticsRef.set({
            [eventType]: admin.firestore.FieldValue.increment(1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

    } catch (error) {
        console.error(`[ANALYTICS_PROC] Failed to update analytics:`, error);
    }
});



export const instagramWebhook = onRequest({
    memory: "512MiB",
    timeoutSeconds: 120,
}, async (req, res) => {
    // Basic validation
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    const body = req.body;
    if (!body || !body.entry) {
        res.status(400).send("Invalid webhook body.");
        return;
    }

    // Process each entry from the webhook
    for (const entry of body.entry) {
        const pageIgId = entry.id;

        // Find the client account linked to this Instagram page
        const clientsQuery = db.collection('clients').where("instagramPageId", "==", pageIgId).limit(1);
        const querySnapshot = await clientsQuery.get();

        if (querySnapshot.empty) {
            console.log(`[WEBHOOK] No client found for pageIgId: ${pageIgId}.`);
            continue;
        }

        const clientDoc = querySnapshot.docs[0];
        const clientId = clientDoc.id;
        const clientData = clientDoc.data();
        const metaPageToken = clientData?.metaPageToken;

        if (!metaPageToken) {
            console.warn(`[WEBHOOK] No metaPageToken for client ${clientId}. Skipping.`);
            continue;
        }

        // --- Step 1: Fetch User and Their Permissions ---
        const userDoc = await db.collection('users').doc(clientData.agencyId).get();
        if (!userDoc.exists) {
            console.warn(`[WEBHOOK] User document not found for agencyId: ${clientData.agencyId}. Skipping.`);
            continue;
        }
        const userData = userDoc.data()!;

        // Get the permissions object. Default to a restrictive "free" object if not found.
        const permissions = userData.permissions || {
            flowLimit: 1,
            executionLimit: 15, // Default to 1000 if not present
            pageLimit: 1,
            hasDelayedReplies: false,
            hasLinkEmbed: false,
            hasFollowerCheck: false,
            allowsCombinedReply: false,
        };

        // --- Define variables needed by attemptAutomation at a higher scope ---
        const today = new Date();
        const currentMonthYear = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
        const monthlyAnalyticsRef = db.doc(`analytics/${clientId}/monthly/${currentMonthYear}`);

        // --- CORRECTED: Use executionLimit for the check ---
        const maxExecutions = permissions.executionLimit;
        const currentPlanId = userData.plan || 'free';

        const attemptAutomation = async (): Promise<boolean> => {
            try {
                const canProceed = await db.runTransaction(async (transaction) => {
                    const analyticsDoc = await transaction.get(monthlyAnalyticsRef);
                    const currentExecutions = analyticsDoc.data()?.total_automations || 0;

                    // --- CORRECTED: Check against maxExecutions ---
                    if (maxExecutions !== 'unlimited' && currentExecutions >= maxExecutions) {
                        // This now correctly blocks both free and paid users who reach their limit.
                        console.warn(`[LIMIT] Execution limit reached for client ${clientId} on plan ${currentPlanId} (${currentExecutions}/${maxExecutions}).`);
                        transaction.update(clientDoc.ref, { limitExceeded: true });
                        return false; // This will now correctly stop the execution.
                    }

                    transaction.set(monthlyAnalyticsRef, {
                        total_automations: admin.firestore.FieldValue.increment(1),
                        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    return true;
                });
                return canProceed;
            } catch (error) {
                console.error(`[ERROR] Transaction for limit check failed for client ${clientId}:`, error);
                return false;
            }
        };
        // --- Process Direct Messages & Story Replies ---
        if (entry.messaging) {
            for (const messagingEvent of entry.messaging) {
                if (messagingEvent.message && !messagingEvent.message.is_echo) {
                    const senderId = messagingEvent.sender.id;
                    const messageText = messagingEvent.message.text || '';
                    let automationToExecute: any = null;
                    let analyticsEventType: 'automated_dms' | 'automated_story_replies' | null = null;

                    // --- Logic to find the correct automation ---
                    // Handle Story Replies
                    if (messagingEvent.message.story) {
                        await publishAnalyticsEvent(clientId, 'total_story_replies');
                        analyticsEventType = 'automated_story_replies';
                        const storyIdRepliedTo = messagingEvent.message.story.id;
                        const storyAutomations = clientData?.storyAutomations || [];
                        for (const automation of storyAutomations) {
                            if (automation.enabled && (automation.storyId === null || automation.storyId === storyIdRepliedTo)) {
                                if (automation.triggerType === 'all_replies' || (automation.triggerType === 'keyword_match' && (automation.keywords || []).some((k: string) => messageText.toLowerCase().includes(k.toLowerCase())))) {
                                    automationToExecute = automation;
                                    break;
                                }
                            }
                        }
                    }
                    // Handle DMs
                    else if (messageText) {
                        await publishAnalyticsEvent(clientId, 'total_dms');
                        analyticsEventType = 'automated_dms';
                        const dmAutomations = clientData?.dmAutomations || [];
                        automationToExecute = dmAutomations.find((auto: any) =>
                            auto.enabled && (auto.keywords || []).some((k: string) => messageText.toLowerCase().includes(k.toLowerCase()))
                        );
                    }

                    if (automationToExecute && analyticsEventType) {
                        // --- Check Delayed Reply Permission ---
                        if ((automationToExecute.delayInMinutes || 0) > 0 && !permissions.hasDelayedReplies) {
                            console.warn(`[PERMISSIONS] User ${clientId} tried delayed reply without permission. Overriding to 0.`);
                            automationToExecute.delayInMinutes = 0; // Send immediately
                        }

                        const canAutomate = await attemptAutomation();
                        if (canAutomate) {
                            await handleReply({
                                delayInMinutes: automationToExecute.delayInMinutes || 0,
                                metaPageToken,
                                recipientId: senderId,
                                messageText: automationToExecute.reply.text,
                                clientId,
                                analyticsEventType: analyticsEventType,
                            });
                        }
                    }
                }
            }
        }

        // --- Process Comments ---
        if (entry.changes) {
            for (const change of entry.changes) {
                if (change.field === 'comments' || change.field === 'feed') {
                    const commenterId = change.value.from.id;
                    if (commenterId === pageIgId) { continue; } // Ignore replies from the page itself

                    await publishAnalyticsEvent(clientId, 'total_comments');

                    const commentId = change.value.id;
                    const eventRef = db.collection('processed_comments').doc(commentId);
                    const eventDoc = await eventRef.get();
                    if (eventDoc.exists) { continue; } // Avoid processing the same comment twice

                    const postId = change.value.media.id;
                    const commentText = change.value.text || '';
                    const commentAutomations = clientData?.commentAutomations || [];
                    let automationToExecute: any = null;

                    // Find the matching comment automation
                    for (const automation of commentAutomations) {
                        if (automation.enabled && automation.postId === postId) {
                            if (automation.triggerType === 'all_comments' || (automation.triggerType === 'keyword_match' && (automation.keywords || []).some((k: string) => commentText.toLowerCase().includes(k.toLowerCase())))) {
                                automationToExecute = automation;
                                break;
                            }
                        }
                    }

                    if (automationToExecute) {
                        let canAutomate = await attemptAutomation(); // Check usage limits

                        // --- Check Follower-Only Permission ---
                        if (canAutomate && automationToExecute.followerOnly) {
                            if (!permissions.hasFollowerCheck) {
                                console.warn(`[PERMISSIONS] User ${clientId} tried follower-only check without permission. Skipping check.`);
                            } else {
                                try {
                                    const friendshipResponse = await axios.get(`https://graph.facebook.com/v20.0/${pageIgId}`, {
                                        params: {
                                            fields: `business_discovery.username(${change.value.from.username}){follows_viewer}`,
                                            access_token: metaPageToken,
                                        },
                                    });
                                    const isFollowing = friendshipResponse.data?.business_discovery?.follows_viewer;
                                    if (isFollowing === false) {
                                        console.log(`[WEBHOOK] User ${commenterId} is NOT following. Halting automation.`);
                                        canAutomate = false;
                                    }
                                } catch (error: any) {
                                    console.error(`[ERROR] Failed to check friendship status for user ${commenterId}:`, error.response?.data?.error || error.message);
                                    canAutomate = false;
                                }
                            }
                        }

                        // --- Check Delayed Reply Permission ---
                        if ((automationToExecute.delayInMinutes || 0) > 0 && !permissions.hasDelayedReplies) {
                            console.warn(`[PERMISSIONS] User ${clientId} tried delayed reply without permission. Overriding to 0.`);
                            automationToExecute.delayInMinutes = 0;
                        }

                        if (canAutomate) {
                            await eventRef.set({ processedAt: admin.firestore.FieldValue.serverTimestamp() });

                            const canSendPrivateReply = !!automationToExecute.reply?.text;
                            const canSendPublicReply = !!automationToExecute.commentReplyText;

                            // Send the private DM reply if configured
                            if (canSendPrivateReply) {
                                await handleReply({
                                    delayInMinutes: automationToExecute.delayInMinutes || 0,
                                    metaPageToken,
                                    recipientId: commenterId,
                                    messageText: automationToExecute.reply.text,
                                    clientId,
                                    analyticsEventType: 'automated_comments'
                                });
                            }

                            // --- Enforce the "Combined Reply" Rule ---
                            if (canSendPublicReply) {
                                if (permissions.allowsCombinedReply || !canSendPrivateReply) {
                                    await axios.post(`https://graph.facebook.com/v20.0/${commentId}/replies`,
                                        { message: automationToExecute.commentReplyText },
                                        { params: { access_token: metaPageToken } }
                                    );
                                } else {
                                    console.log(`[PERMISSIONS] User ${clientId} on Basic plan. Skipping public comment because a DM was sent.`);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).send("EVENT_RECEIVED");
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

    console.log(`[DEBUG] Using App ID (first 5 chars): ${FB_APP_ID?.substring(0, 5)}`);
    console.log(`[DEBUG] Using Redirect URI: ${REDIRECT_URI}`);

    if (!FB_APP_ID || !FB_APP_SECRET) {
        console.error("FATAL: Facebook App credentials are not configured in the function's environment variables.");
        throw new HttpsError('internal', 'Facebook App credentials are not configured on the server.');
    }

    try {
        let userAccessToken;
        try {
            console.log("[DEBUG] Step 1: Exchanging authorization code for access token...");
            const tokenResponse = await axios.get(`https://graph.facebook.com/v20.0/oauth/access_token`, {
                params: {
                    client_id: FB_APP_ID,
                    redirect_uri: REDIRECT_URI,
                    client_secret: FB_APP_SECRET,
                    code
                }
            });
            userAccessToken = tokenResponse.data.access_token;
            console.log("[DEBUG] Step 1 successful. User access token received.");
        } catch (tokenError: any) {
            console.error("[ERROR] Step 1 failed: Could not exchange code for token.", tokenError.response?.data || tokenError.message);
            throw new HttpsError('internal', 'Failed to verify authorization with Facebook. Check your Redirect URI and App Credentials.', tokenError.response?.data);
        }

        console.log("[DEBUG] Step 2: Fetching user's accounts/pages...");
        const accountsResponse = await axios.get(`https://graph.facebook.com/v20.0/me/accounts`, {
            params: {
                fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}',
                access_token: userAccessToken
            }
        });
        console.log("[DEBUG] Step 2 successful. Accounts received.");

        const eligiblePages = accountsResponse.data.data.filter((page: any) => page.instagram_business_account);

        if (eligiblePages.length === 0) {
            console.warn("[WARN] User has no Facebook Pages with a linked Instagram Business Account.");
            throw new HttpsError('not-found', 'No Facebook Pages with a linked Instagram Business Account were found.');
        }

        console.log(`[SUCCESS] Found ${eligiblePages.length} eligible pages.`);
        return { success: true, pages: eligiblePages };

    } catch (error: any) {
        console.error("Failed to fetch Facebook pages:", error.response?.data?.error || error.message || error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('unknown', 'Failed to fetch Facebook pages.', error.response?.data?.error);
    }
});


export const finalizeFacebookConnection = functions.https.onCall(async (request: CallableRequest<{
    pageId: string;
    pageName: string;
    pageAccessToken: string;
    igId: string;
    igUsername?: string;
    igProfilePicUrl?: string;
}>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { pageId, pageName, pageAccessToken, igId, igUsername, igProfilePicUrl } = request.data;
    if (!pageId || !pageName || !pageAccessToken || !igId) {
        throw new HttpsError('invalid-argument', 'Missing required page data.');
    }

    const agencyId = request.auth.uid;

    const userDocRef = db.collection('users').doc(agencyId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'Your user profile could not be found.');
    }

    const userData = userDoc.data();
    const currentPlanId = userData?.subscription?.planId || 'free';
    const planDoc = await db.collection('plans').doc(currentPlanId).get();

    let maxAccounts: number | 'Infinity' = 1; // It's good to keep the type here for clarity
    if (planDoc.exists) {
        maxAccounts = planDoc.data()?.maxAccounts || 1;
    } else {
        console.warn(`[FINALIZE_FB] Plan document '${currentPlanId}' not found for user ${agencyId}.`);
    }

    const clientsRef = db.collection('clients');
    const existingAccountsQuery = await clientsRef.where("agencyId", "==", agencyId).get();
    const currentAccountCount = existingAccountsQuery.size;

    const clientDocRef = db.collection('clients').doc(igId);
    const clientDoc = await clientDocRef.get();

    // --- THIS IS THE CORRECTED LINE ---
    // We check if maxAccounts is a number before comparing it.
    if (!clientDoc.exists && typeof maxAccounts === 'number' && currentAccountCount >= maxAccounts) {
        throw new HttpsError('permission-denied', `You have reached your limit of ${maxAccounts} accounts for the ${currentPlanId} plan.`);
    }

    const agencyName = request.auth.token?.name || 'Agency';
    let newAccountId: string;

    if (clientDoc.exists) {
        await clientDocRef.update({
            metaPageToken: pageAccessToken,
            profilePictureUrl: igProfilePicUrl || null,
            lastConnectedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: 'Account reconnected successfully.', accountId: clientDoc.id };
    } else {
        const newAccountData = {
            agencyId: agencyId,
            agencyName: agencyName,
            clientName: igUsername || pageName,
            facebookPageId: pageId,
            instagramPageId: igId,
            metaPageToken: pageAccessToken,
            profilePictureUrl: igProfilePicUrl || null,
            subscriptionStatus: 'active',
            platform: 'INSTAGRAM',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            dmAutomations: [],
            commentAutomations: [],
            storyAutomations: [],
            flow: { nodes: [], edges: [] }
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
        console.error(`Failed to subscribe Page ${pageId} to webhook fields:`, webhookError.response?.data?.error);
    }

    return { success: true, newAccountId: newAccountId };
});


export const createRazorpaySubscription = onCall(async (request) => {
    // 1. Authentication Check (No change, this is correct)
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required.');
    }
    const userId = request.auth.uid;
    const userEmail = request.auth.token.email;
    const { planId } = request.data; // e.g., "Free", "Basic", "Pro"

    if (!planId || !userEmail) {
        throw new HttpsError('invalid-argument', 'Plan ID and user email are required.');
    }

    // --- NEW LOGIC: Handle the Free Plan ---
    // If the user selects the free plan, we update the DB directly and skip Razorpay.
    if (planId === 'Free') {
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.set({
            plan: 'Free',
            subscription: { // Clear any old subscription data
                razorpaySubscriptionId: null,
                status: 'active_free'
            }
        }, { merge: true });

        return { success: true, message: 'Successfully subscribed to the Free plan.' };
    }

    // 2. Fetch Plan Details from Firestore (No change, this is correct)
    const planDoc = await db.collection('plans').doc(planId).get();
    if (!planDoc.exists) {
        throw new HttpsError('not-found', 'The selected plan does not exist.');
    }

    const razorpayPlanId = planDoc.data()?.razorpayPlanId;
    if (!razorpayPlanId) {
        // This handles cases where the plan exists but isn't configured for payment (like a future enterprise plan)
        throw new HttpsError('failed-precondition', 'This plan is not available for online purchase.');
    }

    // 3. Razorpay API Setup (Using environment variables is correct)
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

    try {
        // 4. Find or Create Customer in Razorpay (No change, this logic is excellent)
        let customerId;
        const searchResponse = await axios.get(`https://api.razorpay.com/v1/customers?email=${userEmail}`, {
            headers: { 'Authorization': authHeader }
        });

        if (searchResponse.data.count > 0) {
            customerId = searchResponse.data.items[0].id;
        } else {
            const customerResponse = await axios.post('https://api.razorpay.com/v1/customers', {
                email: userEmail,
                name: request.auth.token.name || 'New User',
                notes: { firebase_uid: userId }
            }, { headers: { 'Authorization': authHeader } });
            customerId = customerResponse.data.id;
        }

        // 5. Create Subscription in Razorpay (No change in this part)
        const subscriptionResponse = await axios.post('https://api.razorpay.com/v1/subscriptions', {
            plan_id: razorpayPlanId,
            customer_id: customerId,
            total_count: 24, // Set a reasonable cycle count, e.g., 24 months
            customer_notify: 1,
            notes: { userId, firestorePlanId: planId }
        }, { headers: { 'Authorization': authHeader } });

        const subscriptionData = subscriptionResponse.data;

        // --- CRITICAL CHANGE: REMOVED DATABASE WRITE ---
        // We DO NOT save anything to our database here.
        // We simply return the ID needed for the frontend to open the checkout.
        // The webhook will handle the database update upon successful payment.

        return {
            success: true,
            subscriptionId: subscriptionData.id,
            keyId: razorpayKeyId // The keyId is needed by the Razorpay frontend SDK
        };

    } catch (error: any) {
        console.error("[RAZORPAY_SUB] Failed to create subscription:", error.response?.data);
        throw new HttpsError('internal', 'Failed to create subscription.', error.response?.data);
    }
});

export const createRazorpayOrder = functions.https.onCall(async (request: CallableRequest<{
    amount: number;
    currency: string;
    receipt: string;
    userId: string;
    planId: string;
}>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required to create a payment order.');
    }
    const userId = request.auth.uid;

    const { amount, currency, receipt, planId } = request.data;
    if (!amount || !currency || !receipt || !planId) {
        throw new HttpsError('invalid-argument', 'Missing required order details (amount, currency, receipt, planId).');
    }
    if (userId !== request.data.userId) {
        throw new HttpsError('permission-denied', 'User ID mismatch for payment order.');
    }
    if (amount <= 0) {
        throw new HttpsError('invalid-argument', 'Amount must be positive.');
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
        console.error("[RAZORPAY_ORDER] Razorpay API keys are not configured. Check environment variables.");
        throw new HttpsError('internal', 'Payment gateway not configured.');
    }

    try {
        const RAZORPAY_API_URL = 'https://api.razorpay.com/v1/orders';
        const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

        const orderData = {
            amount: amount,
            currency: currency,
            receipt: receipt,
            payment_capture: 1
        };

        const response = await axios.post(RAZORPAY_API_URL, orderData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            }
        });

        const order = response.data;
        return { success: true, orderId: order.id, keyId: razorpayKeyId };

    } catch (error: any) {
        console.error("[RAZORPAY_ORDER] Failed to create Razorpay order:", error.response?.data || error.message);
        throw new HttpsError('internal', 'Failed to create payment order.', error.response?.data);
    }
});



export const razorpayWebhook = onRequest(async (req, res) => {
    // --- Step 1: Verify Signature (Your existing code is correct) ---
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
        console.error("Razorpay Webhook Secret is not configured.");
        res.status(500).send('Webhook secret not configured.');
        return;
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    const body = req.rawBody; // Use rawBody for accurate signature verification

    const expectedSignature = crypto.createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    if (expectedSignature !== signature) {
        res.status(400).send('Invalid signature');
        return;
    }

    // --- Step 2: Process the Event ---
    const event = req.body;
    try {
        // --- Logic for SUCCESSFUL PAYMENT ---
        if (event.event === 'subscription.charged') {
            const subscription = event.payload.subscription.entity;
            const userId = subscription.notes.userId;
            const planId = subscription.notes.firestorePlanId;

            if (!userId || !planId) {
                console.error("Webhook missing critical notes:", subscription.notes);
                res.status(400).send("Missing userId or planId in subscription notes.");
                return;
            }

            // Fetch the master plan details from the 'plans' collection
            const planDoc = await db.collection('plans').doc(planId).get();
            if (!planDoc.exists) {
                console.error(`Plan with ID '${planId}' not found.`);
                res.status(404).send("Plan not found.");
                return;
            }
            const planData = planDoc.data()!;

            // --- CRITICAL STEP: Create the Permissions Object ---
            // This translates the plan's marketing text into true/false feature flags.
            const userPermissions = {
                flowLimit: planData.flowLimit || 1,
                pageLimit: planData.pageLimit || 1,
                hasDelayedReplies: planData.features.includes("Delayed Replies"),
                hasLinkEmbed: planData.features.includes("Embed Links in DM"),
                hasFollowerCheck: planData.features.includes("“Reply After Follow” Logic"),
                allowsCombinedReply: planData.features.includes("DM + Comment Automation")
            };

            // Update the user's document with the new plan and permissions
            const userDocRef = db.collection('users').doc(userId);
            await userDocRef.set({
                plan: planId,
                permissions: userPermissions, // <-- Grant the features
                subscription: {
                    status: 'active',
                    razorpaySubscriptionId: subscription.id,
                    subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
                }
            }, { merge: true });

            console.log(`✅ Successfully activated plan '${planId}' for user '${userId}'.`);
        }
        // --- Logic for CANCELLATION (Your existing code is good) ---
        else if (event.event === 'subscription.cancelled') {
            const subscription = event.payload.subscription.entity;
            const userId = subscription.notes.userId;
            if (userId) {
                const userDocRef = db.collection('users').doc(userId);

                // Revert user to the free plan's permissions
                await userDocRef.update({
                    plan: 'Free',
                    'subscription.status': 'cancelled',
                    'subscription.cancelledAt': admin.firestore.FieldValue.serverTimestamp(),
                    'permissions.flowLimit': 1,
                    'permissions.pageLimit': 1,
                    'permissions.hasDelayedReplies': false,
                    'permissions.hasLinkEmbed': false,
                    'permissions.hasFollowerCheck': false,
                    'permissions.allowsCombinedReply': false,
                });
                console.log(`❌ Successfully cancelled plan for user '${userId}'.`);
            }
        }

        res.status(200).send('Webhook received');

    } catch (error) {
        console.error("[RAZORPAY_WEBHOOK] Error:", error);
        res.status(500).send('Internal Server Error');
    }
});



export const confirmSubscription = functions.https.onCall(async (request: CallableRequest<{
    razorpay_payment_id: string; // <-- CHANGE THIS NAME
    razorpay_order_id: string;   // <-- CHANGE THIS NAME
    razorpay_signature: string;  // <-- CHANGE THIS NAME
}>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required to confirm subscription.');
    }
    const userId = request.auth.uid;

    // Destructure using the CORRECT key names from the frontend
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = request.data; // <-- CHANGE DESTRUCTURING

    // Log to confirm what's received (for debugging purposes, can remove later)
    console.log("ConfirmSubscription received:", { razorpay_payment_id, razorpay_order_id, razorpay_signature });

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        throw new HttpsError('invalid-argument', 'Missing payment verification details.');
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
        console.error("[CONFIRM_SUB] Razorpay API keys are not configured.");
        throw new HttpsError('internal', 'Payment gateway not configured.');
    }

    const generatedSignature = crypto.createHmac('sha256', razorpayKeySecret)
        .update(razorpay_order_id + '|' + razorpay_payment_id) // Use the correct order_id and payment_id
        .digest('hex');

    if (generatedSignature !== razorpay_signature) { // Compare against the correct signature
        console.warn("[CONFIRM_SUB] Payment verification failed: Invalid signature.");
        return { success: false, message: 'Payment verification failed: Invalid signature.' };
    }

    try {
        const RAZORPAY_PAYMENT_API_URL = `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`; // Use correct payment_id
        const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

        const paymentResponse = await axios.get(RAZORPAY_PAYMENT_API_URL, {
            headers: { 'Authorization': authHeader }
        });

        const paymentDetails = paymentResponse.data;
        if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
            console.warn(`[CONFIRM_SUB] Payment not successful: ${paymentDetails.status}.`);
            return { success: false, message: `Payment not successful: ${paymentDetails.status}.` };
        }

        const orderResponse = await axios.get(`https://api.razorpay.com/v1/orders/${paymentDetails.order_id}`, {
            headers: { 'Authorization': authHeader }
        });
        const orderDetails = orderResponse.data;
        const receiptParts = orderDetails.receipt.split('_');
        const actualPlanId = receiptParts[1];

        // Assuming 'db' is correctly initialized elsewhere in your functions/src/index.ts
        const userDocRef = admin.firestore().collection('users').doc(userId); // Use admin.firestore()
        await userDocRef.update({
            subscription: {
                planId: actualPlanId,
                status: 'active',
                razorpayPaymentId: razorpay_payment_id, // Use correct payment_id
                razorpayOrderId: razorpay_order_id,     // Use correct order_id
                amountPaid: paymentDetails.amount,
                currency: paymentDetails.currency,
                subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
            }
        });

        console.log("[CONFIRM_SUB] Subscription confirmed and user updated for:", userId);
        return { success: true, message: 'Subscription confirmed.' };

    } catch (error: any) {
        console.error("[CONFIRM_SUB] Error during payment verification or subscription update:", error.response?.data || error.message);
        throw new HttpsError('internal', 'Payment verification failed.', error.response?.data);
    }
});
// Add this new function to your index.ts

export const cancelSubscription = onCall(async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const userId = request.auth.uid;
    const userDocRef = db.collection('users').doc(userId);

    try {
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User document not found.');
        }

        const subscription = userDoc.data()?.subscription;
        const razorpaySubscriptionId = subscription?.razorpaySubscriptionId;

        if (!subscription || subscription.status !== 'active' || !razorpaySubscriptionId) {
            throw new HttpsError('failed-precondition', 'No active subscription found to cancel.');
        }

        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
        const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

        // Step 1: Tell Razorpay to cancel the subscription immediately
        await axios.post(`https://api.razorpay.com/v1/subscriptions/${razorpaySubscriptionId}/cancel`,
            { cancel_at_cycle_end: 0 }, // 0 = cancel immediately
            { headers: { 'Authorization': authHeader } }
        );

        // Step 2: Update the user's document in Firestore to reflect the change
        await userDocRef.update({
            subscription: {
                planId: 'free',
                status: 'cancelled',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            }
        });

        return { success: true, message: 'Subscription cancelled successfully. You are now on the Free plan.' };

    } catch (error: any) {
        console.error("Error cancelling subscription for user:", userId, error.response?.data || error);
        throw new HttpsError('internal', 'Failed to cancel subscription.', error.message);
    }
});

export const updateUserRoleAndSubscription = functions.https.onCall(async (request: CallableRequest<{
    userId: string;
    role?: 'admin' | 'agency';
    planId?: string; // Assuming PlanId is imported or defined
}>) => {
    // 1. Authenticate and Authorize: Only admins can call this function
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const callerUid = request.auth.uid;
    const callerUserDocRef = admin.firestore().collection('users').doc(callerUid);
    const callerUserDoc = await callerUserDocRef.get();

    if (!callerUserDoc.exists) {
        throw new HttpsError('not-found', 'Caller user profile not found.');
    }

    const callerRole = (callerUserDoc.data() as any)?.role;
    if (callerRole !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admin users can perform this action.');
    }

    // 2. Validate Request Data
    const { userId, role, planId } = request.data;

    if (!userId) {
        throw new HttpsError('invalid-argument', 'Target User ID is required.');
    }

    if (role && !['admin', 'agency'].includes(role)) {
        throw new HttpsError('invalid-argument', 'Invalid role provided.');
    }

    // Assuming PlanId is a defined type like 'free' | 'basic' | 'professional' | 'enterprise'
    // You might want to import PlanId and planFeatures from your config/plans.ts
    // For this function, we'll assume valid planIds are passed.
    // if (planId && !Object.keys(planFeatures).includes(planId)) {
    //     throw new HttpsError('invalid-argument', 'Invalid plan ID provided.');
    // }

    // Prevent an admin from demoting themselves (optional but good practice)
    if (userId === callerUid && role && role !== 'admin') {
        throw new HttpsError('permission-denied', 'Admins cannot demote themselves.');
    }

    // 3. Construct Update Payload
    const userDocRef = admin.firestore().collection('users').doc(userId);
    const updatePayload: { [key: string]: any } = {};

    if (role) {
        updatePayload.role = role;
    }

    if (planId) {
        // Fetch current subscription to merge, or set to active if changing plan
        const targetUserDoc = await userDocRef.get();
        const currentSubscription = (targetUserDoc.data() as any)?.subscription || {};

        updatePayload.subscription = {
            ...currentSubscription, // Keep existing subscription details
            planId: planId,
            // If changing plan, assume it becomes active, or you might have more complex logic
            status: 'active', // Setting to active on admin-forced plan change
            subscribedAt: admin.firestore.FieldValue.serverTimestamp(), // Update timestamp
        };
    }

    // Ensure there's something to update
    if (Object.keys(updatePayload).length === 0) {
        throw new HttpsError('invalid-argument', 'No valid fields to update.');
    }

    // 4. Perform Update
    try {
        await userDocRef.update(updatePayload);
        console.log(`[ADMIN_UPDATE] User ${userId} updated by admin ${callerUid}. Payload:`, updatePayload);
        return { success: true, message: 'User updated successfully.' };
    } catch (error: any) {
        console.error("[ADMIN_UPDATE] Error updating user:", error);
        throw new HttpsError('internal', 'Failed to update user data.', error.message);
    }
});




// functions/src/index.ts

export const getInstagramStories = functions.https.onCall(async (request: CallableRequest<{ clientId: string }>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required.');
    }
    const { clientId } = request.data;
    if (!clientId) {
        throw new HttpsError('invalid-argument', 'Client ID is required.');
    }

    try {
        const clientDoc = await db.collection('clients').doc(clientId).get();
        if (!clientDoc.exists) {
            throw new HttpsError('not-found', `Client ${clientId} not found.`);
        }

        const clientData = clientDoc.data();
        const metaPageToken = clientData?.metaPageToken;
        const instagramBusinessAccountId = clientData?.instagramPageId;

        if (!metaPageToken || !instagramBusinessAccountId) {
            throw new HttpsError('failed-precondition', 'Client is missing required tokens.');
        }

        // This is the Graph API endpoint for active stories
        const storiesResponse = await axios.get(
            `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}/stories`,
            {
                params: {
                    fields: 'id,thumbnail_url,media_url,media_type,permalink',
                    access_token: metaPageToken,
                },
            }
        );

        const stories = storiesResponse.data.data.map((story: any) => ({
            id: story.id,
            thumbnail_url: story.thumbnail_url || story.media_url, // Fallback for video thumbnails
        }));

        return { success: true, stories: stories };

    } catch (error: any) {
        console.error(`[ERROR] Fetching IG stories for client ${clientId}:`, error.response?.data?.error || error.message);
        throw new HttpsError('unknown', 'Failed to fetch Instagram stories.');
    }
});



export const deleteCommentAutomation = onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { clientId, automationId } = req.body;
        if (!clientId || !automationId) {
            console.error("Missing clientId or automationId in task payload");
            res.status(400).send("Bad Request");
            return;
        }

        const clientDocRef = db.collection('clients').doc(clientId);
        await db.runTransaction(async (transaction) => {
            const clientDoc = await transaction.get(clientDocRef);
            if (!clientDoc.exists) return;

            const clientData = clientDoc.data();
            const automations = clientData?.commentAutomations || [];

            const updatedAutomations = automations.filter((auto: any) => auto.id !== automationId);

            transaction.update(clientDocRef, { commentAutomations: updatedAutomations });
        });

        console.log(`Successfully deleted comment automation ${automationId} for client ${clientId}.`);
        res.status(200).send("Successfully deleted automation.");

    } catch (error) {
        console.error("Error in deleteCommentAutomation:", error);
        res.status(500).send("Internal Server Error");
    }
});


export const scheduleCommentAutomationDeletion = onDocumentUpdated("clients/{clientId}", async (event) => {

    // --- FIX 1: Add this safety check ---
    // This resolves the "'event.data' is possibly 'undefined'" error.
    if (!event.data) {
        console.log("No data associated with the event, skipping.");
        return null;
    }

    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    const beforeAutomations = beforeData.commentAutomations || [];
    const afterAutomations = afterData.commentAutomations || [];

    const newAutomations = afterAutomations.filter(
        (afterAuto: any) => !beforeAutomations.some((beforeAuto: any) => beforeAuto.id === afterAuto.id)
    );

    if (newAutomations.length === 0) {
        return null;
    }

    const project = 'synapticinfo-chatbot';
    const location = 'asia-south1';
    const queue = 'comment-deletion-queue';

    // --- FIX 2: This was a duplicate and is now removed from here ---
    // const tasksClient = new CloudTasksClient(); 

    const queuePath = tasksClient.queuePath(project, location, queue);
    const serviceUrl = `https://${location}-${project}.cloudfunctions.net/deleteCommentAutomation`;

    for (const newAuto of newAutomations) {
        const payload = { clientId: event.params.clientId, automationId: newAuto.id };
        const scheduleTimeInSeconds = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

        try {
            await tasksClient.createTask({
                parent: queuePath,
                task: {
                    httpRequest: {
                        httpMethod: 'POST',
                        url: serviceUrl,
                        headers: { 'Content-Type': 'application/json' },
                        body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                    },
                    scheduleTime: { seconds: scheduleTimeInSeconds },
                },
            });
            console.log(`Scheduled deletion for comment automation ${newAuto.id} in 24 hours.`);
        } catch (error) {
            console.error("Error scheduling task:", error);
        }
    }
    return null;
});


const ensureIsAdmin = async (callerUid: string | undefined) => {
    // 1. Add this check for unauthenticated users
    if (!callerUid) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    // 2. The rest of the function remains the same
    const callerUserDoc = await db.collection('users').doc(callerUid).get();
    if (!callerUserDoc.exists || callerUserDoc.data()?.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can perform this action.');
    }
};
export const adminApi = onCall(async (request) => {
    // This helper function already checks for authentication and admin role
    await ensureIsAdmin(request.auth?.uid);

    const { action, payload } = request.data;

    switch (action) {
        // --- Plan Management Cases ---
        case 'createPlan':
            const { id, ...planData } = payload;
            await db.collection('plans').doc(id).set(planData);
            return { success: true, message: 'Plan created.' };

        case 'updatePlan':
            await db.collection('plans').doc(payload.planId).update(payload.updates);
            return { success: true, message: 'Plan updated.' };

        case 'deletePlan':
            await db.collection('plans').doc(payload.planId).delete();
            return { success: true, message: 'Plan deleted.' };

        // --- ADD THIS NEW CASE FOR USER MANAGEMENT ---
        case 'updateUser':
            const { userId, role, planId } = payload;
            if (!userId) {
                throw new HttpsError('invalid-argument', 'User ID is required.');
            }

            const userDocRef = db.collection('users').doc(userId);
            const updatePayload: { [key: string]: any } = {};

            if (role) {
                updatePayload.role = role;
            }
            if (planId) {
                // To prevent overwriting the whole subscription object, use dot notation
                updatePayload['subscription.planId'] = planId;
                updatePayload['subscription.status'] = 'active'; // Assume admin changes activate the plan
            }

            if (Object.keys(updatePayload).length === 0) {
                throw new HttpsError('invalid-argument', 'No valid fields to update were provided.');
            }

            await userDocRef.update(updatePayload);
            return { success: true, message: 'User updated successfully.' };

        default:
            throw new HttpsError('invalid-argument', 'Invalid action specified.');
    }
});

export const createPortalSession = onCall(async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const userId = request.auth.uid;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User not found.');
        }

        const managementUrl = userDoc.data()?.subscription?.managementUrl;

        if (!managementUrl) {
            throw new HttpsError('not-found', 'No active subscription management link found for this user.');
        }

        // Return the unique URL for the client to redirect to
        return { success: true, url: managementUrl };

    } catch (error: any) {
        console.error("Error creating portal session for user:", userId, error);
        // If it's already an HttpsError, rethrow it
        if (error instanceof HttpsError) {
            throw error;
        }
        // Otherwise, wrap it in a generic internal error
        throw new HttpsError('internal', 'Could not create billing portal session.', error.message);
    }
});

// In functions/src/index.ts

export const sendDelayedReply = onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { metaPageToken, senderId, messageText } = req.body;
        if (!metaPageToken || !senderId || !messageText) {
            console.error("[DELAYED_REPLY] Missing required parameters in task payload.");
            res.status(400).send("Bad Request: Missing parameters.");
            return;
        }

        await axios.post(`https://graph.facebook.com/v20.0/me/messages`, {
            recipient: { id: senderId },
            message: { text: messageText },
            messaging_type: "RESPONSE",
            access_token: metaPageToken,
        });

        console.log(`[DELAYED_REPLY] Successfully sent delayed DM to ${senderId}.`);
        res.status(200).send("Successfully sent delayed reply.");

    } catch (error: any) {
        console.error("[DELAYED_REPLY] Error sending delayed reply:", error.response?.data || error.message);
        res.status(500).send("Internal Server Error");
    }
});




async function handleReply(payload: {
    delayInMinutes: number;
    metaPageToken: string;
    recipientId: string;
    messageText: string;
    clientId: string;
    analyticsEventType: any;
}) {
    const { delayInMinutes, metaPageToken, recipientId, messageText, clientId, analyticsEventType } = payload;

    if (delayInMinutes > 0) {
        // --- Schedule a delayed reply via Cloud Tasks ---
        
        // --- CORRECTED: Use environment variables for project and location ---
        const project = 'synapticinfo-chatbot';
        const location = 'asia-south1'; // Or process.env.FUNCTION_REGION if your functions are in different regions
        const queue = 'delayed-replies-queue';

        const queuePath = tasksClient.queuePath(project, location, queue);
        // This now constructs the correct URL for your project
        const serviceUrl = `https://${location}-${project}.cloudfunctions.net/sendDelayedReply`;
        const scheduleTimeInSeconds = Math.floor(Date.now() / 1000) + (delayInMinutes * 60);

        const taskPayload = { metaPageToken, senderId: recipientId, messageText };

        try {
            await tasksClient.createTask({
                parent: queuePath,
                task: {
                    httpRequest: {
                        httpMethod: 'POST',
                        url: serviceUrl,
                        headers: { 'Content-Type': 'application/json' },
                        body: Buffer.from(JSON.stringify(taskPayload)).toString('base64'),
                    },
                    scheduleTime: { seconds: scheduleTimeInSeconds },
                },
            });
            console.log(`[WEBHOOK] Scheduled a reply to ${recipientId} in ${delayInMinutes} minutes.`);
        } catch (error) {
            console.error(`[ERROR] Failed to create Cloud Task:`, error);
        }

    } else {
        // --- Send instantly ---
        await axios.post(`https://graph.facebook.com/v20.0/me/messages`, {
            recipient: { id: recipientId },
            message: { text: messageText },
            messaging_type: "RESPONSE",
            access_token: metaPageToken,
        });
        console.log(`[WEBHOOK] Sent instant reply to ${recipientId}.`);
    }
    await publishAnalyticsEvent(clientId, analyticsEventType);
}
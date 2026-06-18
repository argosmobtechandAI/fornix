import { supabase } from "@/lib/supabaseAdmin";
import admin from "@/lib/firebaseAdmin";

/**
 * Utility to delay execution by ms milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves user records (IDs and FCM tokens) based on filter criteria.
 * 
 * @param {string} filterType - Type of filter ('all_users', 'all_students', 'recently_joined', 'course_students', 'custom')
 * @param {object} filterDetails - Object containing details like course_id, days, or user_ids
 */
export async function resolveRecipients(filterType, filterDetails = {}) {
  let recipients = [];

  if (filterType === "all_users") {
    const { data, error } = await supabase
      .from("users")
      .select("id, fcm_token")
      .eq("is_active", true);
    if (error) throw error;
    recipients = data || [];
  } 
  else if (filterType === "all_students") {
    const { data, error } = await supabase
      .from("users")
      .select("id, fcm_token")
      .eq("role", "user")
      .eq("is_active", true);
    if (error) throw error;
    recipients = data || [];
  } 
  else if (filterType === "recently_joined") {
    const days = filterDetails.days || 7;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    
    const { data, error } = await supabase
      .from("users")
      .select("id, fcm_token")
      .eq("role", "user")
      .eq("is_active", true)
      .gte("created_at", dateLimit.toISOString());
    if (error) throw error;
    recipients = data || [];
  } 
  else if (filterType === "course_students") {
    const courseId = filterDetails.course_id;
    if (!courseId) {
      throw new Error("course_id is required for course_students filter");
    }
    
    // Get active user subscriptions for the course
    const nowIso = new Date().toISOString();
    const { data: subs, error: subsErr } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("course_id", courseId)
      .eq("is_active", true)
      .gte("end_date", nowIso);
      
    if (subsErr) throw subsErr;
    
    const userIds = Array.from(new Set((subs || []).map(s => s.user_id).filter(Boolean)));
    
    if (userIds.length > 0) {
      const { data, error } = await supabase
        .from("users")
        .select("id, fcm_token")
        .eq("is_active", true)
        .in("id", userIds);
      if (error) throw error;
      recipients = data || [];
    }
  } 
  else if (filterType === "custom") {
    const userIds = filterDetails.user_ids || [];
    if (userIds.length > 0) {
      const { data, error } = await supabase
        .from("users")
        .select("id, fcm_token")
        .eq("is_active", true)
        .in("id", userIds);
      if (error) throw error;
      recipients = data || [];
    }
  }

  return recipients;
}

/**
 * Background worker to process the delivery queue for a given campaign.
 * It fetches the pending/failed queue items, attempts to send them (in-app + FCM),
 * and updates their status in the database.
 * 
 * @param {string} campaignId - UUID of the bulk campaign
 */
export async function processCampaignQueue(campaignId) {
  try {
    console.log(`[Worker] Starting queue processing for campaign ${campaignId}`);

    // 1. Update campaign status to 'processing'
    await supabase
      .from("bulk_message_campaigns")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    // 2. Fetch the campaign details
    const { data: campaign, error: campErr } = await supabase
      .from("bulk_message_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      console.error(`[Worker] Campaign ${campaignId} not found. Aborting.`, campErr);
      return;
    }

    // 3. Fetch all pending or failed items for this campaign
    // We join with the users table to get the fcm_token and details
    const { data: queueItems, error: queueErr } = await supabase
      .from("bulk_message_queue")
      .select(`
        id,
        user_id,
        status,
        users:user_id (
          id,
          fcm_token,
          full_name,
          email
        )
      `)
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "failed"]);

    if (queueErr) {
      console.error(`[Worker] Failed to fetch queue for campaign ${campaignId}:`, queueErr);
      await supabase
        .from("bulk_message_campaigns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", campaignId);
      return;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log(`[Worker] No pending or failed items found for campaign ${campaignId}. Marking as completed.`);
      await supabase
        .from("bulk_message_campaigns")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", campaignId);
      return;
    }

    console.log(`[Worker] Found ${queueItems.length} items to deliver for campaign ${campaignId}`);

    // Keep track of counts
    let sentCount = campaign.sent_count || 0;
    let failedCount = campaign.failed_count || 0;

    for (const item of queueItems) {
      const { id: queueItemId, user_id: userId, users: user } = item;

      // Update queue item to 'processing'
      await supabase
        .from("bulk_message_queue")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", queueItemId);

      try {
        if (!user) {
          throw new Error("User record not found in database");
        }

        // 1. Create in-app notification record
        const { data: dbNotification, error: dbErr } = await supabase
          .from("notifications")
          .insert([{
            user_id: userId,
            title: campaign.title,
            message: campaign.message,
            type: "system",
            category: "bulk_notification",
            image_url: campaign.image_url || null,
            document_url: campaign.document_url || null,
            external_link: campaign.external_link || null
          }])
          .select()
          .single();

        if (dbErr) {
          throw new Error(`Failed to save in-app notification: ${dbErr.message}`);
        }

        // 2. Send physical push via Firebase if token exists
        let pushSent = false;
        let pushError = null;

        if (user.fcm_token && admin.apps.length > 0) {
          try {
            const payload = {
              token: user.fcm_token,
              notification: {
                title: campaign.title,
                body: campaign.message,
                ...(campaign.image_url && { imageUrl: campaign.image_url })
              },
              data: {
                category: "bulk_notification",
                notification_id: dbNotification ? dbNotification.id : "",
                title: campaign.title,
                message: campaign.message,
                ...(campaign.image_url && { imageUrl: campaign.image_url }),
                ...(campaign.document_url && { documentUrl: campaign.document_url }),
                ...(campaign.external_link && { externalLink: campaign.external_link })
              }
            };

            await admin.messaging().send(payload);
            pushSent = true;
          } catch (fcmErr) {
            console.error(`[Worker] FCM send failed for user ${userId}:`, fcmErr);
            pushError = fcmErr.message;
          }
        }

        // If user had FCM token and it failed, we mark as failed so admin can retry
        // Otherwise, if they had no token, we count it as delivered (in-app only)
        if (user.fcm_token && !pushSent) {
          const defaultError = admin.apps.length === 0 
            ? "Firebase Admin SDK is not initialized (verify your FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local)"
            : "Unknown error";
          throw new Error(`FCM push delivery failed: ${pushError || defaultError}`);
        }

        // Mark queue item as delivered
        await supabase
          .from("bulk_message_queue")
          .update({
            status: "delivered",
            sent_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", queueItemId);

        sentCount++;
      } catch (err) {
        console.error(`[Worker] Delivery failed for queue item ${queueItemId}:`, err);
        
        // Mark queue item as failed
        await supabase
          .from("bulk_message_queue")
          .update({
            status: "failed",
            error_message: err.message,
            updated_at: new Date().toISOString()
          })
          .eq("id", queueItemId);

        failedCount++;
      }

      // Periodically update the campaign progress counts
      await supabase
        .from("bulk_message_campaigns")
        .update({
          sent_count: sentCount,
          failed_count: failedCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", campaignId);

      // Throttling: wait 80ms before next send to not overload the API or connection pool
      await sleep(80);
    }

    // Mark campaign as completed
    await supabase
      .from("bulk_message_campaigns")
      .update({
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", campaignId);

    console.log(`[Worker] Finished queue processing for campaign ${campaignId}. Sent: ${sentCount}, Failed: ${failedCount}`);
  } catch (globalErr) {
    console.error(`[Worker] Fatal error in processCampaignQueue for campaign ${campaignId}:`, globalErr);
    await supabase
      .from("bulk_message_campaigns")
      .update({
        status: "failed",
        updated_at: new Date().toISOString()
      })
      .eq("id", campaignId);
  }
}

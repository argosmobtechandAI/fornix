import admin from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * Sends a push notification to a user's device and logs it in the database.
 * Designed to be "fail-safe" so it won't break the main API flow if it fails.
 *
 * @param {string} userId - The UUID of the user to notify
 * @param {string} title - The notification title
 * @param {string} message - The notification body
 * @param {string} category - Category for navigation (e.g. 'system', 'exam')
 */
export async function sendPushNotification(userId, title, message, category = "system") {
    try {
        if (!userId) return false;

        // 1. Fetch user's FCM token
        const { data: user, error: userErr } = await supabase
            .from("users")
            .select("fcm_token")
            .eq("id", userId)
            .single();

        if (userErr || !user || !user.fcm_token) {
            // Important: We still want to save it to the DB so they see it in-app!
        }

        // 2. Save notification to the database directly
        const { data: dbNotification, error: dbErr } = await supabase
            .from("notifications")
            .insert([{
                user_id: userId,
                title,
                message,
                type: "system",
                category
            }])
            .select()
            .single();

        if (dbErr) {
            console.error(`DB Notification save failed for user ${userId}:`, dbErr);
            // It's okay, we can still try to push to the device
        }

        // 3. Send physical push via Firebase if token exists
        if (user && user.fcm_token && admin.apps.length > 0) {
            const payload = {
                token: user.fcm_token,
                notification: {
                    title,
                    body: message
                },
                data: {
                    category,
                    notification_id: dbNotification ? dbNotification.id : ""
                }
            };

            await admin.messaging().send(payload);
        }

        return true;
    } catch (err) {
        // We catch all errors here so the parent API flow (like OTP or payments) NEVER breaks
        console.error(`Fatal error in sendPushNotification for user ${userId}:`, err);
        return false;
    }
}

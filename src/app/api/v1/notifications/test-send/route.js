import { supabase } from "@/lib/supabaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(req) {
    try {
        // Authenticate the user making the request (optional depending on your security needs, 
        // but included here since we need to know who to test send to if user_id isn't provided)
        let body = {};
        try { body = await req.json(); } catch(e) {}
        
        // Let them specify which user gets the test push, or fallback to themselves
        let targetUserId = body.user_id;

        if (!targetUserId) {
            const cookieStore = await cookies();
            const token = cookieStore.get("token")?.value;
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    targetUserId = decoded.sub;
                } catch (e) {}
            }
        }

        if (!targetUserId) {
            return Response.json({ success: false, error: "user_id is required to send test notification" }, { status: 400 });
        }

        const { title = "Test Notification", message = "This is a test push notification from Fornix", category = "system" } = body;

        // 1. Fetch the user's FCM token from the database
        const { data: user, error: userErr } = await supabase
            .from("users")
            .select("fcm_token")
            .eq("id", targetUserId)
            .single();

        if (userErr || !user) {
            return Response.json({ success: false, error: "User not found" }, { status: 404 });
        }

        if (!user.fcm_token) {
            return Response.json({ success: false, error: "User does not have an active fcm_token. They need to call /api/v1/user/device-token first." }, { status: 400 });
        }

        // 2. Insert into the database first so the user can see it in their notification history
        const { data: dbNotification, error: dbErr } = await supabase
            .from("notifications")
            .insert([{
                user_id: targetUserId,
                title,
                message,
                type: "system",
                category
            }])
            .select()
            .single();

        if (dbErr) {
            console.error("Error saving to DB:", dbErr);
            // We continue sending the push even if saving to DB fails, or you could abort here
        }

        // 3. Send via Firebase Admin SDK
        const payload = {
            token: user.fcm_token,
            notification: {
                title,
                body: message
            },
            data: {
                category, // Important: custom data payload helps your mobile app route the user
                notification_id: dbNotification ? dbNotification.id : ""
            }
        };

        try {
            const response = await admin.messaging().send(payload);
            return Response.json({ 
                success: true, 
                message: "Test notification sent successfully", 
                message_id: response,
                db_id: dbNotification?.id 
            });
        } catch (fcmError) {
            console.error("FCM Send Error:", fcmError);
            return Response.json({ success: false, error: "Failed to send to FCM. The token might be invalid or expired.", details: fcmError.message }, { status: 500 });
        }

    } catch (err) {
        console.error("Test Send API Error:", err);
        return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

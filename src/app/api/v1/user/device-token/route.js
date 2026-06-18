import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(req) {
    try {
        const body = await req.json();
        let userId = body.user_id;

        // Fallback to cookie token if user_id is not in body
        if (!userId) {
            const cookieStore = await cookies();
            const token = cookieStore.get("token")?.value;
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    userId = decoded.sub;
                } catch (e) {
                    // Ignore expired/invalid if we're just falling back
                }
            }
        }

        if (!userId) {
            return Response.json({ success: false, error: "user_id is required" }, { status: 401 });
        }

        const { fcm_token } = body;

        if (!fcm_token) {
            return Response.json({ success: false, error: "fcm_token is required" }, { status: 400 });
        }

        // Update the user's FCM token
        const { error } = await supabase
            .from("users")
            .update({ fcm_token })
            .eq("id", userId);

        if (error) throw error;

        return Response.json({ success: true, message: "Device token updated successfully" });
    } catch (err) {
        console.error("Error updating device token:", err);
        return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

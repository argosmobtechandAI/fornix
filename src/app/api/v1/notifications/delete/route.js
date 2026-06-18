import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function DELETE(req) {
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
                } catch (e) {}
            }
        }

        if (!userId) {
            return Response.json({ success: false, error: "user_id is required" }, { status: 401 });
        }

        const { notification_id } = body;

        let query = supabase.from("notifications").delete().eq("user_id", userId);

        if (notification_id) {
            query = query.eq("id", notification_id);
        }

        const { error } = await query;

        if (error) throw error;

        return Response.json({ 
            success: true, 
            message: notification_id ? "Notification deleted successfully" : "All notifications cleared" 
        });
    } catch (err) {
        console.error("Error deleting notification:", err);
        return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

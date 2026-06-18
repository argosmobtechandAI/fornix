import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function DELETE(req) {
    try {
        let body = {};
        try { body = await req.json(); } catch(e) {}
        
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

        // Delete all notifications for this user
        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("user_id", userId);

        if (error) throw error;

        return Response.json({ success: true, message: "All notifications cleared successfully" });
    } catch (err) {
        console.error("Error clearing notifications:", err);
        return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        let userId = url.searchParams.get("user_id");

        // Fallback to cookie token if user_id is not in query
        if (!userId) {
            const cookieStore = await cookies();
            const token = cookieStore.get("token")?.value;
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    userId = decoded.sub;
                } catch (e) {
                    // Ignore
                }
            }
        }

        if (!userId) {
            return Response.json({ success: false, error: "user_id is required" }, { status: 401 });
        }

        // Parse pagination params
        const page = parseInt(url.searchParams.get("page")) || 1;
        const limit = parseInt(url.searchParams.get("limit")) || 20;
        const offset = (page - 1) * limit;

        // Get total count
        const { count, error: countErr } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        if (countErr) throw countErr;

        // Get paginated notifications
        const { data, error } = await supabase
            .from("notifications")
            .select("id, title, message, type, category, reference_id, is_read, created_at, image_url, document_url, external_link")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Get unread count
        const { count: unreadCount, error: unreadErr } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_read", false);

        if (unreadErr) throw unreadErr;

        return Response.json({
            success: true,
            data,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit),
                unreadCount: unreadCount || 0
            }
        });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

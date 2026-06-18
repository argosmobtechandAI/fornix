import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(req) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "university") return Response.json({ success: false, error: "Forbidden" }, { status: 403 });

        const { data: profile } = await supabase
            .from("university_profiles")
            .select("id")
            .eq("user_id", decoded.sub)
            .single();

        if (!profile) return Response.json({ success: false, error: "Profile not found" }, { status: 404 });

        const { data: logs, error: logsError } = await supabase
            .from("university_activity_logs")
            .select("*")
            .eq("university_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(100);

        if (logsError) throw logsError;

        return Response.json({ success: true, data: logs });
    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

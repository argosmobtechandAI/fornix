import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/activityLogger";

async function authenticateUniversity(req) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) throw new Error("Unauthorized");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "university") throw new Error("Forbidden");

    const { data: profile, error } = await supabase
        .from("university_profiles")
        .select("id")
        .eq("user_id", decoded.sub)
        .single();

    if (error || !profile) throw new Error("Profile not found");
    return profile.id;
}

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const { is_active } = await req.json();

        if (typeof is_active !== "boolean") {
            return Response.json({ success: false, error: "is_active must be boolean" }, { status: 422 });
        }

        let universityProfileId;
        try {
            universityProfileId = await authenticateUniversity(req);
        } catch (e) {
            if (e.message === "Unauthorized") return Response.json({ success: false, error: e.message }, { status: 401 });
            if (e.message === "Forbidden") return Response.json({ success: false, error: e.message }, { status: 403 });
            return Response.json({ success: false, error: "Authentication failed" }, { status: 500 });
        }

        if (!id) return Response.json({ success: false, error: "Student ID required" }, { status: 400 });

        const { data: student, error: fetchErr } = await supabase
            .from("users")
            .select("id, university_id, full_name")
            .eq("id", id)
            .single();

        if (fetchErr || !student) {
            return Response.json({ success: false, error: "Student not found" }, { status: 404 });
        }

        if (student.university_id !== universityProfileId) {
            return Response.json({ success: false, error: "Not authorized to modify this student" }, { status: 403 });
        }

        const { data, error } = await supabase
            .from("users")
            .update({ is_active, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select("id, is_active")
            .single();

        if (error) throw error;

        const action = is_active ? "student_activated" : "student_suspended";
        await logActivity(universityProfileId, action, `${is_active ? "Activated" : "Suspended"} student: ${student.full_name}`, "student", id);

        return Response.json({ success: true, user: data, message: is_active ? "Student activated" : "Student suspended" });

    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

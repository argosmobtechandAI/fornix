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

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;

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
            return Response.json({ success: false, error: "Not authorized to delete this student" }, { status: 403 });
        }

        // Delete user (cascade should handle related rows)
        const { error: delErr } = await supabase.from("users").delete().eq("id", id);
        if (delErr) throw delErr;

        await logActivity(universityProfileId, "student_deleted", `Deleted student: ${student.full_name}`, "student", id);

        return Response.json({ success: true, message: "Student deleted successfully" });

    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

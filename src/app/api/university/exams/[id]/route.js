import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/activityLogger";

async function getUniversityProfile() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) throw { status: 401, message: "Unauthorized" };

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        throw { status: 401, message: "Invalid token" };
    }

    if (decoded.role !== "university") throw { status: 403, message: "Forbidden" };

    const { data: profile, error } = await supabase
        .from("university_profiles")
        .select("id")
        .eq("user_id", decoded.sub)
        .single();

    if (error || !profile) throw { status: 404, message: "University profile not found" };
    return profile;
}

// GET: Get single exam details
export async function GET(req, { params }) {
    try {
        const profile = await getUniversityProfile();
        const { id } = await params;

        const { data: exam, error } = await supabase
            .from("university_exams")
            .select("*")
            .eq("id", id)
            .eq("university_id", profile.id)
            .single();

        if (error || !exam) {
            return Response.json({ success: false, error: "Exam not found" }, { status: 404 });
        }

        return Response.json({ success: true, data: exam });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

// PUT: Update exam details
export async function PUT(req, { params }) {
    try {
        const profile = await getUniversityProfile();
        const { id } = await params;
        const body = await req.json();
        const { name, subjects, description, duration_minutes, status, plan_id, academic_year } = body;

        // Verify ownership
        const { data: existing } = await supabase
            .from("university_exams")
            .select("id")
            .eq("id", id)
            .eq("university_id", profile.id)
            .single();

        if (!existing) {
            return Response.json({ success: false, error: "Exam not found or not authorized" }, { status: 404 });
        }

        const updatePayload = {};
        if (name !== undefined) updatePayload.name = name;
        if (subjects !== undefined) updatePayload.subjects = subjects;
        if (description !== undefined) updatePayload.description = description;
        if (duration_minutes !== undefined) updatePayload.duration_minutes = Number(duration_minutes);
        if (status !== undefined) updatePayload.status = status;
        if (plan_id !== undefined) updatePayload.plan_id = plan_id || null;
        if (academic_year !== undefined) updatePayload.academic_year = academic_year || null;
        updatePayload.updated_at = new Date().toISOString();

        const { data: exam, error } = await supabase
            .from("university_exams")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        await logActivity(
            profile.id,
            "exam_updated",
            `Updated exam: ${exam.name}`,
            "exam",
            exam.id
        );

        return Response.json({ success: true, data: exam });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

// DELETE: Delete exam (cascades to questions)
export async function DELETE(req, { params }) {
    try {
        const profile = await getUniversityProfile();
        const { id } = await params;

        // Verify ownership
        const { data: existing } = await supabase
            .from("university_exams")
            .select("id")
            .eq("id", id)
            .eq("university_id", profile.id)
            .single();

        if (!existing) {
            return Response.json({ success: false, error: "Exam not found or not authorized" }, { status: 404 });
        }

        const { data: examDetails } = await supabase
            .from("university_exams")
            .select("name")
            .eq("id", id)
            .single();

        const { error } = await supabase
            .from("university_exams")
            .delete()
            .eq("id", id);

        if (error) throw error;

        await logActivity(
            profile.id,
            "exam_deleted",
            `Deleted exam: ${examDetails?.name || id}`,
            "exam",
            id
        );

        return Response.json({ success: true, message: "Exam deleted successfully" });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

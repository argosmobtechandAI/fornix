import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/activityLogger";

async function getUniversityProfile(req) {
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
        .select("id, university_name, assigned_courses")
        .eq("user_id", decoded.sub)
        .single();

    if (error || !profile) throw { status: 404, message: "University profile not found" };
    return profile;
}

// GET: List all exams for the authenticated university
export async function GET(req) {
    try {
        const profile = await getUniversityProfile(req);

        const { data: exams, error } = await supabase
            .from("university_exams")
            .select("*")
            .eq("university_id", profile.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return Response.json({ success: true, data: exams || [] });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

// POST: Create a new exam
export async function POST(req) {
    try {
        const profile = await getUniversityProfile(req);
        const body = await req.json();
        const { name, subjects, description, duration_minutes, status, plan_id, academic_year } = body;

        if (!name) {
            return Response.json({ success: false, error: "Exam name is required" }, { status: 400 });
        }

        const { data: exam, error } = await supabase
            .from("university_exams")
            .insert([{
                university_id: profile.id,
                name,
                subjects: subjects || "",
                description: description || null,
                duration_minutes: Number(duration_minutes) || 60,
                status: status || "draft",
                plan_id: plan_id || null,
                academic_year: academic_year || null,
            }])
            .select()
            .single();

        if (error) throw error;

        await logActivity(
            profile.id,
            "exam_created",
            `Created new exam: ${name}`,
            "exam",
            exam.id
        );

        return Response.json({ success: true, data: exam }, { status: 201 });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

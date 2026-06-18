import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

async function verifyUniversity() {
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
    return decoded;
}

// GET: Fetch subjects for a course (university-scoped, no admin required)
export async function GET(req) {
    try {
        await verifyUniversity();

        const url = new URL(req.url);
        const courseId = url.searchParams.get("course_id");
        const academicYear = url.searchParams.get("academic_year");

        if (!courseId) {
            return Response.json({ success: false, error: "course_id is required" }, { status: 400 });
        }

        let query = supabase
            .from("subjects")
            .select("id, name, academic_year, course_id")
            .eq("course_id", courseId)
            .order("name");

        if (academicYear) {
            query = query.eq("academic_year", academicYear);
        }

        const { data, error } = await query;
        if (error) throw error;

        return Response.json({ success: true, data: data || [] });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

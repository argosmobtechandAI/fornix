import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

async function verifyUniversity(req) {
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

// POST: Fetch filtered questions from the main question bank
export async function POST(req) {
    try {
        await verifyUniversity(req);

        const body = await req.json();
        const {
            course_id,
            academic_year = null,
            subject_ids = [],
            chapter_ids = [],
            question_types = [],
            page = 1,
            limit = 20,
        } = body;

        if (!course_id) {
            return Response.json({ success: false, error: "course_id is required" }, { status: 400 });
        }

        // 1) Determine which subjects belong to the selected course (+ optional year filter)
        let targetSubjectIds = [];

        if (subject_ids.length > 0) {
            // Use explicitly selected subjects
            targetSubjectIds = subject_ids;
        } else {
            // Fetch all subjects for the course (filtered by year if provided)
            let subQuery = supabase
                .from("subjects")
                .select("id")
                .eq("course_id", course_id);

            if (academic_year) {
                subQuery = subQuery.eq("academic_year", academic_year);
            }

            const { data: subs } = await subQuery;
            targetSubjectIds = (subs || []).map(s => s.id);
        }

        if (targetSubjectIds.length === 0) {
            return Response.json({
                success: true,
                data: [],
                pagination: { currentPage: page, totalPages: 0, total: 0, limit },
            });
        }

        // 2) Determine target chapter_ids
        let targetChapterIds = [];

        if (chapter_ids.length > 0) {
            targetChapterIds = chapter_ids;
        } else {
            // Fetch all chapters for the selected subjects
            const { data: chaps } = await supabase
                .from("chapters")
                .select("id")
                .in("subject_id", targetSubjectIds);
            targetChapterIds = (chaps || []).map(c => c.id);
        }

        if (targetChapterIds.length === 0) {
            return Response.json({
                success: true,
                data: [],
                pagination: { currentPage: page, totalPages: 0, total: 0, limit },
            });
        }

        // 3) Count total matching questions
        let countQuery = supabase
            .from("questions")
            .select("*", { count: "exact", head: true })
            .in("chapter_id", targetChapterIds);

        if (question_types.length > 0) {
            countQuery = countQuery.in("question_type", question_types.map(t => t.toLowerCase()));
        }

        const { count: totalCount, error: countErr } = await countQuery;
        if (countErr) throw countErr;

        const total = totalCount || 0;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;

        // 4) Fetch paginated questions
        let dataQuery = supabase
            .from("questions")
            .select("id, question_text, question_type, explanation, marks, subject_id, chapter_id, question_image_url")
            .in("chapter_id", targetChapterIds)
            .order("created_at", { ascending: false })
            .range(startIndex, startIndex + limit - 1);

        if (question_types.length > 0) {
            dataQuery = dataQuery.in("question_type", question_types.map(t => t.toLowerCase()));
        }

        const { data: questions, error: qErr } = await dataQuery;
        if (qErr) throw qErr;

        // 5) Attach options and correct answer for each question
        const enriched = [];
        for (const q of questions || []) {
            const { data: options } = await supabase
                .from("question_options")
                .select("option_key, content")
                .eq("question_id", q.id)
                .order("option_key");

            const { data: correct } = await supabase
                .from("correct_answers")
                .select("correct_key")
                .eq("question_id", q.id)
                .single();

            enriched.push({
                ...q,
                options: options || [],
                correct_answer: correct?.correct_key || null,
            });
        }

        return Response.json({
            success: true,
            data: enriched,
            pagination: {
                currentPage: page,
                totalPages,
                total,
                limit,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

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

// POST: Create exam + copy selected questions into university_questions
export async function POST(req) {
    try {
        const profile = await getUniversityProfile(req);
        const body = await req.json();

        const {
            name,
            description = "",
            duration_minutes = 60,
            status = "draft",
            plan_id = null,
            academic_year = null,
            subjects = "",
            question_ids = [],
        } = body;

        if (!name) {
            return Response.json({ success: false, error: "Exam name is required" }, { status: 400 });
        }

        if (!question_ids.length) {
            return Response.json({ success: false, error: "At least one question must be selected" }, { status: 400 });
        }

        // 1) Create the university_exams record (same as existing exam creation)
        const { data: exam, error: examErr } = await supabase
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

        if (examErr) throw examErr;

        // 2) Fetch full question data from the main question bank
        const { data: questions, error: qErr } = await supabase
            .from("questions")
            .select("id, question_text, explanation, marks")
            .in("id", question_ids);

        if (qErr) throw qErr;

        if (!questions || questions.length === 0) {
            return Response.json({ success: false, error: "No valid questions found for the given IDs" }, { status: 400 });
        }

        // 3) Fetch options for all questions  
        const { data: allOptions } = await supabase
            .from("question_options")
            .select("question_id, option_key, content")
            .in("question_id", question_ids)
            .order("option_key");

        // 4) Fetch correct answers for all questions
        const { data: allCorrect } = await supabase
            .from("correct_answers")
            .select("question_id, correct_key")
            .in("question_id", question_ids);

        // Build lookup maps
        const optionsByQuestion = {};
        for (const opt of allOptions || []) {
            if (!optionsByQuestion[opt.question_id]) optionsByQuestion[opt.question_id] = {};
            optionsByQuestion[opt.question_id][opt.option_key.toLowerCase()] = opt.content;
        }

        const correctByQuestion = {};
        for (const c of allCorrect || []) {
            correctByQuestion[c.question_id] = c.correct_key?.toLowerCase() || null;
        }

        // 5) Map into university_questions schema (identical to CSV upload)
        const universityQuestions = questions.map(q => {
            const opts = optionsByQuestion[q.id] || {};
            return {
                exam_id: exam.id,
                question: q.question_text,
                option_a: opts.a || "",
                option_b: opts.b || "",
                option_c: opts.c || "",
                option_d: opts.d || "",
                option_e: opts.e || null,
                option_f: opts.f || null,
                correct_option: correctByQuestion[q.id] || "a",
                marks: q.marks || 1,
                explanation: q.explanation || null,
            };
        });

        // 6) Insert into university_questions
        const { data: inserted, error: insertErr } = await supabase
            .from("university_questions")
            .insert(universityQuestions)
            .select();

        if (insertErr) throw insertErr;

        await logActivity(
            profile.id,
            "exam_created",
            `Created manual quiz: ${name} with ${inserted.length} questions`,
            "exam",
            exam.id
        );

        return Response.json({
            success: true,
            message: `Quiz "${name}" created with ${inserted.length} questions`,
            data: {
                exam,
                questions_count: inserted.length,
            },
        }, { status: 201 });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

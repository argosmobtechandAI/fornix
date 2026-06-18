import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

async function verifyExamOwnership(examId) {
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

    const { data: profile } = await supabase
        .from("university_profiles")
        .select("id")
        .eq("user_id", decoded.sub)
        .single();

    if (!profile) throw { status: 404, message: "University profile not found" };

    const { data: exam } = await supabase
        .from("university_exams")
        .select("id")
        .eq("id", examId)
        .eq("university_id", profile.id)
        .single();

    if (!exam) throw { status: 404, message: "Exam not found or not authorized" };

    return { profile, exam };
}

// GET: List all questions for an exam
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        await verifyExamOwnership(id);

        const { data: questions, error } = await supabase
            .from("university_questions")
            .select("*")
            .eq("exam_id", id)
            .order("created_at", { ascending: true });

        if (error) throw error;

        return Response.json({ success: true, data: questions || [] });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

// POST: Create a single question
export async function POST(req, { params }) {
    try {
        const { id } = await params;
        await verifyExamOwnership(id);

        const body = await req.json();
        const { question, option_a, option_b, option_c, option_d, option_e, option_f, correct_option, marks, explanation } = body;

        if (!question || !option_a || !option_b || !option_c || !option_d) {
            return Response.json({ success: false, error: "Question and at least 4 options are required" }, { status: 400 });
        }

        const validOptions = ["a", "b", "c", "d", "e", "f"];
        if (!correct_option || !validOptions.includes(correct_option.toLowerCase())) {
            return Response.json({ success: false, error: "Valid correct_option is required (a/b/c/d/e/f)" }, { status: 400 });
        }

        const { data: q, error } = await supabase
            .from("university_questions")
            .insert([{
                exam_id: id,
                question,
                option_a,
                option_b,
                option_c,
                option_d,
                option_e: option_e || null,
                option_f: option_f || null,
                correct_option: correct_option.toLowerCase(),
                marks: Number(marks) || 1,
                explanation: explanation || null,
            }])
            .select()
            .single();

        if (error) throw error;

        return Response.json({ success: true, data: q }, { status: 201 });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

// PUT: Update a question
export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        await verifyExamOwnership(id);

        const body = await req.json();
        const { question_id, question, option_a, option_b, option_c, option_d, option_e, option_f, correct_option, marks, explanation } = body;

        if (!question_id) {
            return Response.json({ success: false, error: "question_id is required" }, { status: 400 });
        }

        const updatePayload = {};
        if (question !== undefined) updatePayload.question = question;
        if (option_a !== undefined) updatePayload.option_a = option_a;
        if (option_b !== undefined) updatePayload.option_b = option_b;
        if (option_c !== undefined) updatePayload.option_c = option_c;
        if (option_d !== undefined) updatePayload.option_d = option_d;
        if (option_e !== undefined) updatePayload.option_e = option_e;
        if (option_f !== undefined) updatePayload.option_f = option_f;
        if (correct_option !== undefined) updatePayload.correct_option = correct_option.toLowerCase();
        if (marks !== undefined) updatePayload.marks = Number(marks);
        if (explanation !== undefined) updatePayload.explanation = explanation;

        const { data: q, error } = await supabase
            .from("university_questions")
            .update(updatePayload)
            .eq("id", question_id)
            .eq("exam_id", id)
            .select()
            .single();

        if (error) throw error;

        return Response.json({ success: true, data: q });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

// DELETE: Delete a question
export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        await verifyExamOwnership(id);

        const url = new URL(req.url);
        const questionId = url.searchParams.get("question_id");

        if (!questionId) {
            return Response.json({ success: false, error: "question_id query param is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("university_questions")
            .delete()
            .eq("id", questionId)
            .eq("exam_id", id);

        if (error) throw error;

        return Response.json({ success: true, message: "Question deleted" });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

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

function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                result.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
    }
    result.push(current.trim());
    return result;
}

// POST: Bulk upload questions via CSV
export async function POST(req, { params }) {
    try {
        const { id } = await params;
        await verifyExamOwnership(id);

        const body = await req.json();
        const { csv_content } = body;

        if (!csv_content) {
            return Response.json({ success: false, error: "csv_content is required" }, { status: 400 });
        }

        const lines = csv_content.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) {
            return Response.json({ success: false, error: "CSV must have a header row and at least one data row" }, { status: 400 });
        }

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

        // Required columns
        const requiredCols = ["question", "option_a", "option_b", "option_c", "option_d", "correct_option"];
        const missing = requiredCols.filter(c => !headers.includes(c));
        if (missing.length > 0) {
            return Response.json({ success: false, error: `Missing required columns: ${missing.join(", ")}` }, { status: 400 });
        }

        const created = [];
        const errors = [];
        const validOptions = ["a", "b", "c", "d", "e", "f"];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || "";
            });

            const questionText = row.question?.trim();
            const optA = row.option_a?.trim();
            const optB = row.option_b?.trim();
            const optC = row.option_c?.trim();
            const optD = row.option_d?.trim();
            const optE = row.option_e?.trim() || null;
            const optF = row.option_f?.trim() || null;
            const correctOpt = row.correct_option?.trim().toLowerCase();
            const marks = parseInt(row.marks) || 1;
            const explanation = row.explanation?.trim() || null;

            // Validate
            if (!questionText || !optA || !optB || !optC || !optD) {
                errors.push({ row: i + 1, error: "Missing question or required options (a-d)" });
                continue;
            }

            if (!correctOpt || !validOptions.includes(correctOpt)) {
                errors.push({ row: i + 1, error: `Invalid correct_option "${correctOpt}". Must be a/b/c/d/e/f` });
                continue;
            }

            // Verify correct_option has a value
            if (correctOpt === "e" && !optE) {
                errors.push({ row: i + 1, error: "correct_option is 'e' but option_e is empty" });
                continue;
            }
            if (correctOpt === "f" && !optF) {
                errors.push({ row: i + 1, error: "correct_option is 'f' but option_f is empty" });
                continue;
            }

            created.push({
                exam_id: id,
                question: questionText,
                option_a: optA,
                option_b: optB,
                option_c: optC,
                option_d: optD,
                option_e: optE,
                option_f: optF,
                correct_option: correctOpt,
                marks,
                explanation,
            });
        }

        let inserted = [];
        if (created.length > 0) {
            const { data, error: insertErr } = await supabase
                .from("university_questions")
                .insert(created)
                .select();

            if (insertErr) throw insertErr;
            inserted = data || [];
        }

        return Response.json({
            success: true,
            message: `${inserted.length} questions uploaded successfully`,
            data: {
                created: inserted.length,
                errors: errors.length,
                errorDetails: errors,
            },
        });
    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

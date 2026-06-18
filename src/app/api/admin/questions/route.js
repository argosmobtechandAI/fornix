import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

function normalizeNullableUuid(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined")
    return null;
  // Basic UUID v1-v5 validation (accepts lowercase/uppercase)
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(s) ? s : null;
}

export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();

    const {
      subject_id,
      chapter_id,
      topic_id = null,
      question_text,
      explanation = null,
      image_url = null,
      question_image_url = null,
      options = [],
      correct_key = null,
      status = null,
      question_type = "easy",
      marks = 1,
      negative_marks = 0,
    } = body;

    if (!subject_id || !question_text)
      throw new Error("subject_id and question_text are required");
    
    // chapter_id is now optional - can add questions directly to subject
    if (!Array.isArray(options) || options.length < 2)
      throw new Error("At least two options required");

    // Validate correct_key supports A-H
    if (correct_key && !["a", "b", "c", "d", "e", "f", "g", "h"].includes(correct_key.toLowerCase())) {
      throw new Error("Correct key must be a letter from A to H");
    }

    // Validate that correct_key exists in provided options
    if (correct_key) {
      const correctOptionExists = options.some(opt => 
        opt.option_key.toLowerCase() === correct_key.toLowerCase()
      );
      if (!correctOptionExists) {
        throw new Error(`Correct option '${correct_key.toUpperCase()}' not found in provided options`);
      }
    }

    // insert question - chapter_id is now optional
    const { data: q, error: qErr } = await supabase
      .from("questions")
      .insert([
        {
          subject_id: normalizeNullableUuid(subject_id),
          chapter_id: normalizeNullableUuid(chapter_id), // Allow null for subject-only questions
          topic_id: normalizeNullableUuid(topic_id),
          question_text,
          explanation,
          image_url,
          question_image_url,
          status,
          question_type: question_type || "easy",
          marks: Number(marks),
          negative_marks: Number(negative_marks),
          created_by: admin.sub || admin.id || null,
          updated_by: admin.sub || admin.id || null,
        },
      ])
      .select()
      .single();
    if (qErr) throw qErr;

    // insert options - now supports A-H
    const optInsert = options.map((o) => ({
      question_id: q.id,
      option_key: o.option_key.toLowerCase(), // Ensure lowercase
      content: o.content,
      created_by: admin.sub || admin.id || null,
      updated_by: admin.sub || admin.id || null,
    }));
    const { error: optErr } = await supabase
      .from("question_options")
      .insert(optInsert);
    if (optErr) {
      // try cleanup
      await supabase.from("questions").delete().eq("id", q.id);
      throw optErr;
    }

    // insert correct answer - now supports A-H
    if (correct_key && ["a", "b", "c", "d", "e", "f", "g", "h"].includes(correct_key.toLowerCase())) {
      const { error: caErr } = await supabase.from("correct_answers").insert([
        {
          question_id: q.id,
          correct_key: correct_key.toLowerCase(), // Ensure lowercase
          created_by: admin.sub || admin.id || null,
          updated_by: admin.sub || admin.id || null,
        },
      ]);
      if (caErr) {
        await supabase
          .from("question_options")
          .delete()
          .eq("question_id", q.id);
        await supabase.from("questions").delete().eq("id", q.id);
        throw caErr;
      }
    }

    // Fetch the complete question with options and correct answer
    const { data: completeQuestion, error: fetchError } = await supabase
      .from("questions")
      .select(`
        *,
        question_options:question_options!question_options_question_id_fkey (*),
        correct_answers (*)
      `)
      .eq("id", q.id)
      .single();

    if (fetchError) {
      console.error("Error fetching complete question:", fetchError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      question: completeQuestion || q 
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("questions POST err:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function GET(req) {
  try {
    await ensureAdmin(req);
    const url = new URL(req.url);

    // Accept only real UUIDs; treat "null"/"undefined"/invalid UUIDs as empty.
    const subjectId = normalizeNullableUuid(url.searchParams.get("subject_id"));
    const chapterId = normalizeNullableUuid(url.searchParams.get("chapter_id"));
    const topicId = normalizeNullableUuid(url.searchParams.get("topic_id"));

    // Support fetching by subject_id only (questions without chapters)
    let q = supabase.from("questions").select(`
      *,
      subjects(id, name),
      chapters(id, name),
      topics(id, name)
    `);
    if (topicId) {
      q = q.eq("topic_id", topicId);
    } else if (chapterId) {
      q = q.eq("chapter_id", chapterId);
    } else if (subjectId) {
      // Fetch all questions for this subject (including those with chapters)
      q = q.eq("subject_id", subjectId);
    } else {
      throw new Error("subject_id, chapter_id, or topic_id required");
    }

    const { data: questions, error: qErr } = await q.order("created_at", {
      ascending: false,
    });
    if (qErr) throw qErr;

    if (!questions?.length)
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const ids = questions.map((q) => q.id);

    // Fetch options and correct answers
    const [{ data: options }, { data: corrects }] = await Promise.all([
      supabase
        .from("question_options")
        .select("question_id, option_key, content, chance_percent")
        .in("question_id", ids)
        .order("option_key"),
      supabase
        .from("correct_answers")
        .select("question_id, correct_key")
        .in("question_id", ids),
    ]);

    const optionMap = new Map();
    options?.forEach((o) => {
      const key = String(o.question_id);
      if (!optionMap.has(key)) optionMap.set(key, []);
      optionMap.get(key).push(o);
    });

    const correctMap = new Map();
    corrects?.forEach((c) =>
      correctMap.set(String(c.question_id), c.correct_key)
    );

    const combined = questions.map((q) => ({
      ...q,
      question_options: (optionMap.get(String(q.id)) || []).sort((a, b) =>
        a.option_key.localeCompare(b.option_key)
      ),
      correct_answers: {
        correct_key: correctMap.get(String(q.id)) || null
      },
      correct_option: correctMap.get(String(q.id)) || null, // Keep for backward compatibility
    }));

    return new Response(JSON.stringify({ success: true, data: combined }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Questions list API error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();
    const url = new URL(req.url);
    const questionId = url.pathname.split('/').pop();

    if (!questionId) throw new Error("Question ID required");

    const {
      subject_id,
      chapter_id,
      topic_id = null,
      question_text,
      explanation = null,
      image_url = null,
      question_image_url = null,
      options = [],
      correct_key = null,
      status = null,
      question_type = "easy",
      marks = 1,
      negative_marks = 0,
    } = body;

    if (!subject_id || !question_text)
      throw new Error("subject_id and question_text are required");
    
    // chapter_id is now optional - can add questions directly to subject
    if (!Array.isArray(options) || options.length < 2)
      throw new Error("At least two options required");

    // Validate correct_key supports A-H
    if (correct_key && !["a", "b", "c", "d", "e", "f", "g", "h"].includes(correct_key.toLowerCase())) {
      throw new Error("Correct key must be a letter from A to H");
    }

    // Validate that correct_key exists in provided options
    if (correct_key) {
      const correctOptionExists = options.some(opt => 
        opt.option_key.toLowerCase() === correct_key.toLowerCase()
      );
      if (!correctOptionExists) {
        throw new Error(`Correct option '${correct_key.toUpperCase()}' not found in provided options`);
      }
    }

    // Update question - chapter_id is now optional
    const { data: updatedQuestion, error: updateError } = await supabase
      .from("questions")
      .update({
        subject_id: normalizeNullableUuid(subject_id),
        chapter_id: normalizeNullableUuid(chapter_id), // Allow null for subject-only questions
        topic_id: normalizeNullableUuid(topic_id),
        question_text,
        explanation,
        image_url,
        question_image_url,
        status,
        question_type: question_type || "easy",
        marks: Number(marks),
        negative_marks: Number(negative_marks),
        updated_by: admin.sub || admin.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Delete existing options and correct answers
    await Promise.all([
      supabase.from("question_options").delete().eq("question_id", questionId),
      supabase.from("correct_answers").delete().eq("question_id", questionId)
    ]);

    // Insert new options - now supports A-H
    const optInsert = options.map((o) => ({
      question_id: questionId,
      option_key: o.option_key.toLowerCase(),
      content: o.content,
      created_by: admin.sub || admin.id || null,
      updated_by: admin.sub || admin.id || null,
    }));
    const { error: optErr } = await supabase
      .from("question_options")
      .insert(optInsert);
    if (optErr) throw optErr;

    // Insert correct answer - now supports A-H
    if (correct_key && ["a", "b", "c", "d", "e", "f", "g", "h"].includes(correct_key.toLowerCase())) {
      const { error: caErr } = await supabase.from("correct_answers").insert([
        {
          question_id: questionId,
          correct_key: correct_key.toLowerCase(),
          created_by: admin.sub || admin.id || null,
          updated_by: admin.sub || admin.id || null,
        },
      ]);
      if (caErr) throw caErr;
    }

    // Fetch complete updated question
    const { data: completeQuestion, error: fetchError } = await supabase
      .from("questions")
      .select(`
        *,
        question_options:question_options!question_options_question_id_fkey (*),
        correct_answers (*)
      `)
      .eq("id", questionId)
      .single();

    if (fetchError) {
      console.error("Error fetching complete question:", fetchError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      question: completeQuestion || updatedQuestion 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("questions PUT err:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
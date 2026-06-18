import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function GET(req, { params }) {
  try {
    await ensureDoctor(req);
    const {id} = await params;
    const { data: q, error: qErr } = await supabase.from("questions").select("*").eq("id", id).single();
    if (qErr) throw qErr;
    const { data: options } = await supabase.from("question_options").select("*").eq("question_id", id).order("option_key");
    const { data: correct } = await supabase.from("correct_answers").select("*").eq("question_id", id).single();
    return new Response(JSON.stringify({ success: true, question: q, options, correct: correct || null }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}

export async function PUT(req, { params }) {
  try {
    // 🔒 Verify doctor user
    const doctor = await ensureDoctor(req);
    const { id } = await params;
    if (!id) throw new Error("Question ID required");

    // 🔹 Parse request body
    const body = await req.json();
    const {
      subject_id,
      chapter_id,
      topic_id,
      question_text,
      explanation,
      image_url,
      question_image_url,
      options,
      correct_key,
      status,
    } = body;

    const validStatuses = ["pending", "approved", "rejected"];
    if (status && !validStatuses.includes(status))
      throw new Error(
        "Invalid status. Must be pending, approved, or rejected."
      );

    // 🔹 Fetch existing question
    const { data: existing, error: qErr } = await supabase
      .from("questions")
      .select("*")
      .eq("id", id)
      .single();
    if (qErr) throw qErr;
    if (!existing) throw new Error("Question not found");

    // 🔹 Prepare update payload
    const updates = {
      updated_by: doctor.sub || doctor.id || null,
      updated_at: new Date().toISOString(),
    };
    if (subject_id !== undefined) updates.subject_id = subject_id;
    if (chapter_id !== undefined) updates.chapter_id = chapter_id;
    if (topic_id !== undefined) updates.topic_id = topic_id;
    if (question_text !== undefined) updates.question_text = question_text;
    if (explanation !== undefined)
      updates.explanation = explanation?.trim() || null;
    if (image_url !== undefined) updates.image_url = image_url?.trim() || null;
    if (question_image_url !== undefined)
      updates.question_image_url = question_image_url?.trim() || null;
    if (status !== undefined) {
      updates.status = status;
      if (["approved", "rejected"].includes(status)) {
        updates.status_by = doctor.sub || doctor.id || null;
      }
    }

    // 🔹 Update question
    const { data: updatedQuestion, error: updErr } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (updErr) throw updErr;

    // 🔹 Handle options only if explicitly provided
    if (body.hasOwnProperty("options")) {
      if (Array.isArray(options)) {
        // Normalize safely - now supports A-H
        const normalized = options
          .map((o) => ({
            option_key: String(o.option_key || "")
              .trim()
              .toLowerCase(),
            content: typeof o.content === "string" ? o.content.trim() : "",
          }))
          .filter(
            (o) => o.option_key && ["a", "b", "c", "d", "e", "f", "g", "h"].includes(o.option_key)
          );

        // Warn if any options dropped
        if (normalized.length < options.length) {
          console.warn(
            `⚠️ Some options dropped during normalization for question ${id}`,
            { sent: options, kept: normalized }
          );
        }

        // Delete old options before re-inserting
        const { error: delErr } = await supabase
          .from("question_options")
          .delete()
          .eq("question_id", id);
        if (delErr) throw delErr;

        if (normalized.length > 0) {
          const toInsert = normalized.map((o) => ({
            question_id: id,
            option_key: o.option_key,
            content: o.content, // keep blank if empty
            created_by: doctor.sub || doctor.id || null,
            updated_by: doctor.sub || doctor.id || null,
          }));

          const { data: insData, error: insErr } = await supabase
            .from("question_options")
            .insert(toInsert)
            .select();
          if (insErr) throw insErr;
        } else {
          console.warn(
            `⚠️ No valid options to insert for question ${id} (normalized empty)`
          );
        }
      } else {
        console.warn("⚠️ Invalid options format; expected array.");
      }
    }

    // 🔹 Replace correct answer if present - now supports A-H
    if (Object.prototype.hasOwnProperty.call(body, "correct_key")) {
      await supabase.from("correct_answers").delete().eq("question_id", id);

      const cleanKey = String(correct_key || "").toLowerCase();
      if (["a", "b", "c", "d", "e", "f", "g", "h"].includes(cleanKey)) {
        const { error: insCorrErr } = await supabase
          .from("correct_answers")
          .insert([
            {
              question_id: id,
              correct_key: cleanKey,
              created_by: doctor.sub || doctor.id || null,
              updated_by: doctor.sub || doctor.id || null,
            },
          ]);
        if (insCorrErr) throw insCorrErr;
      } else if (correct_key !== null && correct_key !== "") {
        console.warn(`⚠️ Invalid correct_key provided: ${correct_key}`);
      }
    }

    // 🔹 Fetch final state (fresh data)
    const { data: optionsAfter, error: optFetchErr } = await supabase
      .from("question_options")
      .select("*")
      .eq("question_id", id)
      .order("option_key", { ascending: true });
    if (optFetchErr) throw optFetchErr;

    const { data: correctAfter, error: corrFetchErr } = await supabase
      .from("correct_answers")
      .select("*")
      .eq("question_id", id)
      .maybeSingle();
    if (corrFetchErr) throw corrFetchErr;

    // 🔹 Return final updated data
    return new Response(
      JSON.stringify({
        success: true,
        message: "Question updated successfully",
        question: updatedQuestion,
        options: optionsAfter || [],
        correct: correctAfter || null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ questions PUT error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || String(err) }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureDoctor(req);
    const {id} = await params;
    await supabase.from("question_options").delete().eq("question_id", id);
    await supabase.from("correct_answers").delete().eq("question_id", id);
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}
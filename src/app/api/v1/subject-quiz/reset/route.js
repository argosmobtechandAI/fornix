import { supabase } from "@/lib/supabaseAdmin";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id } = body || {};
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }
    const { scope = "all", subject_id = null, question_type = null } = body || {};

    // Get all attempt IDs for this user
    const { data: attempts, error: aErr } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("user_id", user_id);
    if (aErr) throw aErr;

    const attemptIds = (attempts || []).map((a) => a.id);
    if (!attemptIds.length) {
      return Response.json({ success: true, cleared: 0 }, { status: 200 });
    }

    // Global reset: delete all quiz_answers for user's attempts
    if (!scope || scope === "all") {
      for (const part of chunk(attemptIds, 50)) {
        const { error: delErr } = await supabase
          .from("quiz_answers")
          .delete()
          .in("attempt_id", part);
        if (delErr) throw delErr;
      }
      return Response.json({ success: true, scope: "all", cleared: "all_answers" }, { status: 200 });
    }

    // Scoped reset: by subject and/or question_type
    if (!subject_id && !question_type) {
      return Response.json(
        { success: false, error: "For scoped reset, provide subject_id and/or question_type" },
        { status: 400 }
      );
    }

    let q = supabase.from("questions").select("id");
    if (subject_id) q = q.eq("subject_id", subject_id);
    if (question_type) q = q.eq("question_type", String(question_type).toLowerCase());

    const { data: qs, error: qErr } = await q;
    if (qErr) throw qErr;

    const qIds = (qs || []).map((x) => x.id);
    if (!qIds.length) {
      return Response.json(
        { success: true, scope: "filtered", cleared: 0, message: "No questions found for this filter" },
        { status: 200 }
      );
    }

    // Delete quiz_answers for those questions + user's attempts
    // (do in chunks to avoid large IN lists)
    let cleared = 0;
    // We must chunk BOTH attemptIds and qIds if we want to be safe, 
    // but cross-product chunking is slow. Let's chunk qIds and then chunk attemptIds inside.
    for (const qPart of chunk(qIds, 50)) {
      for (const aPart of chunk(attemptIds, 50)) {
        const { error: delErr } = await supabase
          .from("quiz_answers")
          .delete()
          .in("attempt_id", aPart)
          .in("question_id", qPart);
        if (delErr) throw delErr;
      }
      cleared += qPart.length; 
    }

    return Response.json(
      {
        success: true,
        scope: "filtered",
        filter: { subject_id, question_type: question_type ? String(question_type).toLowerCase() : null },
        cleared,
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}



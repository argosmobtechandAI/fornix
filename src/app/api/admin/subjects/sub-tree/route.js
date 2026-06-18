import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    await ensureAdmin(req);
    const url = new URL(req.url);
    const chapterId = url.searchParams.get("chapter_id");
    if (!chapterId) throw new Error("chapter_id is required");

    // ✅ Fetch topics under this chapter
    const { data: topics, error: tErr } = await supabase
      .from("topics")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("name", { ascending: true });
    if (tErr) throw tErr;

    // ✅ Fetch all questions for this chapter (including topic ones)
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false });
    if (qErr) throw qErr;

    const questionIds = questions.map((q) => q.id);

    // ✅ Fetch options and correct answers in one go
    const [{ data: options }, { data: corrects }] = await Promise.all([
      supabase
        .from("question_options")
        .select("question_id, option_key, content")
        .in("question_id", questionIds),
      supabase
        .from("correct_answers")
        .select("question_id, correct_key")
        .in("question_id", questionIds),
    ]);

    // ✅ Build lookup maps
    const optionMap = new Map();
    options?.forEach((o) => {
      const key = String(o.question_id);
      if (!optionMap.has(key)) optionMap.set(key, []);
      optionMap.get(key).push(o);
    });

    const correctMap = new Map();
    corrects?.forEach((c) => correctMap.set(String(c.question_id), c.correct_key));

    // ✅ Merge question data
    const questionsWithDetails = questions.map((q) => ({
      ...q,
      options: (optionMap.get(String(q.id)) || []).sort((a, b) =>
        a.option_key.localeCompare(b.option_key)
      ),
      correct_option: correctMap.get(String(q.id)) || null,
    }));

    // ✅ Separate direct questions and topic questions
    const directQuestions = questionsWithDetails.filter((q) => !q.topic_id);

    const topicsWithQuestions = topics.map((t) => ({
      ...t,
      questions: questionsWithDetails.filter((q) => q.topic_id === t.id),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        chapter_id: chapterId,
        direct_questions: directQuestions,
        topics: topicsWithQuestions,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Tree API error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

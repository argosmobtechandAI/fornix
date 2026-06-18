import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    await ensureAdmin(req);
    const url = new URL(req.url);
    const subjectId = url.searchParams.get("subject_id");
    const chapterId = url.searchParams.get("chapter_id");
    const topicId = url.searchParams.get("topic_id");

    // ✅ Fetch base tables
    const [{ data: subjects }, { data: chapters }, { data: topics }] =
      await Promise.all([
        supabase.from("subjects").select("*").order("name", { ascending: true }),
        supabase.from("chapters").select("*").order("name", { ascending: true }),
        supabase.from("topics").select("*").order("name", { ascending: true }),
      ]);

    // ✅ Build filters
    let qFilter = {};
    if (topicId) qFilter.topic_id = topicId;
    else if (chapterId) qFilter.chapter_id = chapterId;
    else if (subjectId) qFilter.subject_id = subjectId;

    // ✅ Fetch questions
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("*")
      .match(qFilter)
      .order("created_at", { ascending: false });
    if (qErr) throw qErr;

    // ✅ Get all options and correct answers without relying on .in()
    const { data: allOptions, error: optErr } = await supabase
      .from("question_options")
      .select("id, question_id, option_key, content")
      .order("option_key", { ascending: true });
    if (optErr) throw optErr;

    const { data: allCorrects, error: corrErr } = await supabase
      .from("correct_answers")
      .select("question_id, correct_key");
    if (corrErr) throw corrErr;

    // ✅ Merge manually (ensures all questions get their options)
    const questionsWithDetails = questions.map((q) => ({
      ...q,
      options: allOptions
        .filter((opt) => String(opt.question_id) === String(q.id))
        .sort((a, b) => a.option_key.localeCompare(b.option_key)),
      correct_option:
        allCorrects.find((c) => String(c.question_id) === String(q.id))
          ?.correct_key || null,
    }));

    // ✅ Build tree
    const tree = (subjects || []).map((subject) => ({
      ...subject,
      chapters: (chapters || [])
        .filter((c) => c.subject_id === subject.id)
        .map((chapter) => ({
          ...chapter,
          topics: (topics || [])
            .filter((t) => t.chapter_id === chapter.id && !t.parent_id)
            .map((topic) => ({
              ...topic,
              sub_topics: (topics || [])
                .filter((st) => st.parent_id === topic.id)
                .map((subtopic) => ({
                  ...subtopic,
                  questions: questionsWithDetails.filter(
                    (q) => q.topic_id === subtopic.id
                  ),
                })),
              questions: questionsWithDetails.filter(
                (q) => q.topic_id === topic.id
              ),
            })),
          questions: questionsWithDetails.filter(
            (q) => q.chapter_id === chapter.id && !q.topic_id
          ),
        })),
    }));

    // ✅ Response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Data fetched successfully",
        total_questions: questionsWithDetails.length,
        total_options: allOptions.length,
        tree,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Tree API error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

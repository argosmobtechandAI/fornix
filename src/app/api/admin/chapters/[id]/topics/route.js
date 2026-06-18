import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function GET(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;

    // ----------------------------------
    // 1. Get Chapter
    // ----------------------------------
    // console.log(`[API] Fetching chapter with ID: "${id}"`);

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (chapterError) {
      console.error("[API] Chapter fetch error:", chapterError);
      return Response.json(
        { success: false, error: "Chapter fetch error: " + chapterError.message, details: chapterError },
        { status: 400 }
      );
    }

    if (!chapter) {
      // console.error(`[API] Chapter not found for ID: "${id}"`);
      // Debug: Check if any chapter exists
      const { count } = await supabase.from("chapters").select("*", { count: "exact", head: true });
      // console.log(`[API] Total chapters in DB: ${count}`);

      return Response.json(
        { success: false, error: `Chapter not found for ID: ${id}`, debug_count: count },
        { status: 404 }
      );
    }

    // ----------------------------------
    // 2. Get Topics
    // ----------------------------------
    const { data: topics } = await supabase
      .from("topics")
      .select("*")
      .eq("chapter_id", id)
      .order("name", { ascending: true });

    // ----------------------------------
    // 3. Get Chapter-Level Questions
    // ----------------------------------
    const { data: questions } = await supabase
      .from("questions")
      .select(`
        *,
        question_options:question_options!question_options_question_id_fkey (*),
        correct_answers:correct_answers!correct_answers_question_id_fkey (*),
        status_user:users!questions_status_by_fkey (id, full_name, role)
      `)
      .eq("chapter_id", id)
      .is("topic_id", null)
      .order("created_at", { ascending: false });

    // ----------------------------------
    // 4. Attach Questions Inside Each Topic
    // ----------------------------------
    let topicsWithQuestions = [];

    if (topics?.length) {
      for (const topic of topics) {
        const { data: topicQs } = await supabase
          .from("questions")
          .select(`
            *,
            question_options:question_options!question_options_question_id_fkey (*),
            correct_answers:correct_answers!correct_answers_question_id_fkey (*),
            status_user:users!questions_status_by_fkey (id, full_name, role)
          `)
          .eq("topic_id", topic.id)
          .order("created_at", { ascending: false });

        topicsWithQuestions.push({
          ...topic,
          questions: topicQs || [],
        });
      }
    }

    return Response.json({
      success: true,
      chapter,
      questions,
      topics: topicsWithQuestions, // now includes questions inside each topic
    });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function GET(req, { params }) {
  try {
    await ensureDoctor(req);
    const { id } = await params;

    // ----------------------------------
    // 1. Get Chapter
    // ----------------------------------
    const { data: chapter } = await supabase
      .from("chapters")
      .select("*")
      .eq("id", id)
      .single();

    if (!chapter) {
      return Response.json(
        { success: false, error: "Chapter not found" },
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

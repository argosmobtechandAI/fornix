import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function GET(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;

    if (!id) {
      return Response.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("mock_test_questions")
      .select(`
        id,
        mock_test_id,
        question_id,
        "order"
      `)
      .eq("mock_test_id", id)
      .order("order");

    if (error) throw error;

    // Now fetch full question details separately
    if (data && data.length > 0) {
      const questionIds = data.map(d => d.question_id);
      
      // Fetch questions with relationships
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select(`
          id,
          question_text,
          question_type,
          question_image_url,
          explanation,
          subjects(id, name),
          chapters(id, name),
          topics(id, name)
        `)
        .in("id", questionIds);

      if (questionsError) {
        console.error("Error fetching questions:", questionsError);
        throw questionsError;
      }

      // Fetch options and correct answers
      const [{ data: options }, { data: corrects }] = await Promise.all([
        supabase
          .from("question_options")
          .select("question_id, option_key, content, chance_percent")
          .in("question_id", questionIds)
          .order("option_key"),
        supabase
          .from("correct_answers")
          .select("question_id, correct_key")
          .in("question_id", questionIds),
      ]);

      // Build maps for options and correct answers
      const optionMap = {};
      (options || []).forEach(opt => {
        if (!optionMap[opt.question_id]) optionMap[opt.question_id] = [];
        optionMap[opt.question_id].push(opt);
      });

      const correctMap = {};
      (corrects || []).forEach(c => {
        correctMap[c.question_id] = c.correct_key;
      });

      const questionMap = {};
      (questions || []).forEach(q => {
        questionMap[q.id] = {
          ...q,
          question_options: (optionMap[q.id] || []).sort((a, b) => 
            a.option_key.localeCompare(b.option_key)
          ),
          correct_option: correctMap[q.id] || null,
        };
      });

      const enrichedData = data.map(mtq => ({
        ...mtq,
        questions: questionMap[mtq.question_id] || null,
      }));

      return Response.json({ success: true, questions: enrichedData }, { status: 200 });
    }

    return Response.json({ success: true, questions: data || [] }, { status: 200 });
  } catch (err) {
    console.error("Mock test questions GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const admin = await ensureAdmin(req);
    const resolvedParams = await params;
    const testId = resolvedParams?.id;
    const body = await req.json();

    const { question_id, order } = body;

    if (!testId) {
      console.error("No test ID in params:", resolvedParams);
      return Response.json({ success: false, error: "Mock test ID is required" }, { status: 400 });
    }

    if (!question_id) {
      return Response.json({ success: false, error: "question_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("mock_test_questions")
      .insert([{
        mock_test_id: testId,
        question_id,
        order: order || 1,
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    return Response.json({ success: true, question: data }, { status: 201 });
  } catch (err) {
    console.error("Mock test question POST error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id, questionId } = params;

    const { error } = await supabase
      .from("mock_test_questions")
      .delete()
      .eq("id", questionId);

    if (error) throw error;

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Mock test question DELETE error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

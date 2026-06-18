import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken"; 

export async function GET(req) {
  try {
    const doctor = await ensureDoctor(req);
    const url = new URL(req.url);
    const doctorId = url.searchParams.get("doctor_id") || doctor.id;

    if (!doctorId) {
      throw new Error("Missing doctor_id");
    }

    const { data: doctorSubjects, error: assignErr } = await supabase
      .from("doctor_subjects")
      .select("subject_id")
      .eq("doctor_id", doctorId);

    if (assignErr) throw assignErr;
    const assignedSubjectIds = doctorSubjects.map((r) => r.subject_id);

    if (assignedSubjectIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tree: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: subjects, error: subjErr } = await supabase
      .from("subjects")
      .select("*")
      .in("id", assignedSubjectIds)
      .order("name", { ascending: true });
    if (subjErr) throw subjErr;

    const { data: chapters, error: chapErr } = await supabase
      .from("chapters")
      .select("*")
      .in("subject_id", assignedSubjectIds);
    if (chapErr) throw chapErr;

    const chapterIds = chapters.map((c) => c.id);

    const { data: topics, error: topErr } = await supabase
      .from("topics")
      .select("*")
      .in("chapter_id", chapterIds);
    if (topErr) throw topErr;

    const topicIds = topics.map((t) => t.id);

    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("*")
      .in("subject_id", assignedSubjectIds);
    if (qErr) throw qErr;

    const questionIds = questions.map((q) => q.id);

    const { data: options, error: optErr } = await supabase
      .from("question_options")
      .select("*")
      .in("question_id", questionIds);
    if (optErr) throw optErr;

    const { data: corrects, error: corrErr } = await supabase
      .from("correct_answers")
      .select("*")
      .in("question_id", questionIds);
    if (corrErr) throw corrErr;

    const questionsWithDetails = questions.map((q) => ({
      ...q,
      options: options
        .filter((opt) => opt.question_id === q.id)
        .sort((a, b) => a.option_key.localeCompare(b.option_key)),
      correct_option:
        corrects.find((c) => c.question_id === q.id)?.correct_key || null,
    }));

    const tree = subjects.map((subject) => ({
      ...subject,
      chapters: chapters
        .filter((c) => c.subject_id === subject.id)
        .map((chapter) => ({
          ...chapter,
          topics: topics
            .filter((t) => t.chapter_id === chapter.id)
            .map((topic) => ({
              ...topic,
              questions: questionsWithDetails.filter(
                (q) => q.topic_id === topic.id
              ),
            })),
          questions: questionsWithDetails.filter(
            (q) => q.chapter_id === chapter.id && !q.topic_id
          ),
        })),
    }));

    return new Response(
      JSON.stringify({ success: true, tree }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Doctor Subjects Tree Error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

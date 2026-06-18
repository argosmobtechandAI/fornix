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
      .from("mock_tests")
      .select(`
        id,
        title,
        description,
        course_id,
        total_questions,
        duration_minutes,
        is_published,
        created_at,
        updated_at,
        courses (id, name),
        mock_test_questions (
          id,
          question_id,
          "order"
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return Response.json({ success: false, error: "Mock test not found" }, { status: 404 });
    }

    // Get subjects from junction table
    let subjectsArray = [];
    const { data: junctionData, error: junctionError } = await supabase
      .from("mock_test_subjects")
      .select("subject_id, subjects(id, name)")
      .eq("mock_test_id", id);
    
    if (!junctionError && junctionData && junctionData.length > 0) {
      subjectsArray = junctionData.map(mts => mts.subjects).filter(Boolean);
    }

    return Response.json({
      success: true,
      test: {
        ...data,
        course: data.courses,
        subjects: subjectsArray,
        subject_ids: subjectsArray.map(s => s.id), // For convenience
        questions_count: (data.mock_test_questions || []).length,
        courses: undefined,
        mock_test_questions: undefined,
      }
    }, { status: 200 });
  } catch (err) {
    console.error("Mock test GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const admin = await ensureAdmin(req);
    const { id } = await params;
    const body = await req.json();

    const { title, description, total_questions, duration_minutes } = body;

    const { data, error } = await supabase
      .from("mock_tests")
      .update({
        title,
        description,
        total_questions,
        duration_minutes,
        updated_by: admin.sub || admin.id || null,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, test: data }, { status: 200 });
  } catch (err) {
    console.error("Mock test PUT error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;

    // Delete test questions first
    await supabase
      .from("mock_test_questions")
      .delete()
      .eq("mock_test_id", id);

    // Delete test attempts
    await supabase
      .from("test_attempts")
      .delete()
      .eq("mock_test_id", id);

    // Delete the test
    const { error } = await supabase
      .from("mock_tests")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Mock test DELETE error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

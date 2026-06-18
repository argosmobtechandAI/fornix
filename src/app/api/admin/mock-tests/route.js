import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    await ensureAdmin(req);
    
    const url = new URL(req.url);
    const course_id = url.searchParams.get("course_id");
    const subject_id = url.searchParams.get("subject_id");
    const search = url.searchParams.get("search") || "";
    
    // If filtering by subject_id, first get the mock_test_ids that have this subject
    let mockTestIds = null;
    if (subject_id) {
      const { data: junctionData } = await supabase
        .from("mock_test_subjects")
        .select("mock_test_id")
        .eq("subject_id", subject_id);
      
      mockTestIds = (junctionData || []).map(j => j.mock_test_id);
      if (mockTestIds.length === 0) {
        return Response.json({ success: true, tests: [] }, { status: 200 });
      }
    }
    
    let query = supabase
      .from("mock_tests")
      .select(`
        *,
        courses (id, name),
        mock_test_subjects (subjects(id, name)),
        mock_test_questions (id)
      `)
      .order("created_at", { ascending: false });

    if (course_id) query = query.eq("course_id", course_id);
    if (mockTestIds) query = query.in("id", mockTestIds);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    const tests = (data || []).map((test) => ({
      ...test,
      course: test.courses || null,
      subjects: (test.mock_test_subjects || []).map(mts => mts.subjects).filter(Boolean),
      questions_count: test.mock_test_questions?.length || 0,
      courses: undefined,
      mock_test_subjects: undefined,
      mock_test_questions: undefined,
    }));

    return Response.json({ success: true, tests }, { status: 200 });
  } catch (err) {
    console.error("Mock tests GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();

    const {
      title,
      description = "",
      course_id,
      subject_id,
      subject_ids,
      total_questions,
      duration_minutes = 60,
      auto_fill = false,
    } = body;

    if (!title) return Response.json({ success: false, error: "title is required" }, { status: 400 });
    if (!course_id) return Response.json({ success: false, error: "course_id is required" }, { status: 400 });
    if (!total_questions) return Response.json({ success: false, error: "total_questions is required" }, { status: 400 });

    const targetSubjects = Array.isArray(subject_ids) && subject_ids.length > 0
      ? subject_ids
      : subject_id
        ? [subject_id]
        : [];

    if (targetSubjects.length === 0) {
      return Response.json({ success: false, error: "At least one subject is required" }, { status: 400 });
    }

    const createdTests = [];

    // For multi-subject creation, create ONE test with MULTIPLE subjects
    if (targetSubjects.length > 1 && !subject_id) {
      // Create single test for all selected subjects
      const { data: test, error: testError } = await supabase
        .from("mock_tests")
        .insert([{
          title,
          description,
          course_id,
          total_questions,
          duration_minutes,
          created_by: admin.sub || admin.id || null,
          updated_by: admin.sub || admin.id || null,
        }])
        .select(`
          *,
          courses (id, name)
        `)
        .single();

      if (testError) throw testError;

      // Insert subjects for this test
      const subjectRows = targetSubjects.map(subjId => ({
        mock_test_id: test.id,
        subject_id: subjId,
      }));

      const { error: subjError } = await supabase
        .from("mock_test_subjects")
        .insert(subjectRows);

      if (subjError) throw subjError;

      let insertedQuestions = 0;

      // Auto-fill questions from all selected subjects
      if (auto_fill) {
        const { data: pool, error: poolErr } = await supabase
          .from("questions")
          .select("id")
          .in("subject_id", targetSubjects);

        if (poolErr) throw poolErr;

        const questionsPool = pool || [];
        // Shuffle in JS
        for (let i = questionsPool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questionsPool[i], questionsPool[j]] = [questionsPool[j], questionsPool[i]];
        }

        const selected = questionsPool.slice(0, total_questions);
        if (selected.length > 0) {
          const rows = selected.map((q, idx) => ({
            mock_test_id: test.id,
            question_id: q.id,
            order: idx + 1,
          }));

          const { error: insertErr } = await supabase
            .from("mock_test_questions")
            .insert(rows);

          if (insertErr) throw insertErr;
          insertedQuestions = rows.length;

          // Update total if fewer questions available
          if (insertedQuestions !== total_questions) {
            await supabase
              .from("mock_tests")
              .update({ total_questions: insertedQuestions })
              .eq("id", test.id);
          }
        }
      }

      // Fetch subjects for response
      const { data: subjects } = await supabase
        .from("mock_test_subjects")
        .select("subjects(id, name)")
        .eq("mock_test_id", test.id);

      createdTests.push({
        ...test,
        course: test.courses,
        subjects: (subjects || []).map(s => s.subjects),
        auto_filled: auto_fill,
        inserted_questions: insertedQuestions,
        courses: undefined,
      });
    } else {
      // Single subject - create one test per subject (for backward compatibility)
      for (const subjId of targetSubjects) {
        const { data: test, error } = await supabase
          .from("mock_tests")
          .insert([{
            title,
            description,
            course_id,
            total_questions,
            duration_minutes,
            created_by: admin.sub || admin.id || null,
            updated_by: admin.sub || admin.id || null,
          }])
          .select(`
            *,
            courses (id, name)
          `)
          .single();

        if (error) throw error;

        // Insert the subject
        const { error: subjError } = await supabase
          .from("mock_test_subjects")
          .insert([{
            mock_test_id: test.id,
            subject_id: subjId,
          }]);

        if (subjError) throw subjError;

        let insertedQuestions = 0;

        // Auto-fill questions if requested
        if (auto_fill) {
          const { data: pool, error: poolErr } = await supabase
            .from("questions")
            .select("id")
            .eq("subject_id", subjId);

          if (poolErr) throw poolErr;

          const questionsPool = pool || [];
          // Shuffle in JS
          for (let i = questionsPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questionsPool[i], questionsPool[j]] = [questionsPool[j], questionsPool[i]];
          }

          const selected = questionsPool.slice(0, total_questions);
          if (selected.length > 0) {
            const rows = selected.map((q, idx) => ({
              mock_test_id: test.id,
              question_id: q.id,
              order: idx + 1,
            }));

            const { error: insertErr } = await supabase
              .from("mock_test_questions")
              .insert(rows);

            if (insertErr) throw insertErr;
            insertedQuestions = rows.length;

            // Update total if fewer questions available
            if (insertedQuestions !== total_questions) {
              await supabase
                .from("mock_tests")
                .update({ total_questions: insertedQuestions })
                .eq("id", test.id);
            }
          }
        }

        // Fetch subjects for response
        const { data: subjects } = await supabase
          .from("mock_test_subjects")
          .select("subjects(id, name)")
          .eq("mock_test_id", test.id);

        createdTests.push({
          ...test,
          course: test.courses,
          subjects: (subjects || []).map(s => s.subjects),
          auto_filled: auto_fill,
          inserted_questions: insertedQuestions,
          courses: undefined,
        });
      }
    }

    return Response.json({
      success: true,
      tests: createdTests,
    }, { status: 201 });
  } catch (err) {
    console.error("Mock tests POST error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

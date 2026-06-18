import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { user_id, limit = 100, offset = 0 } = await req.json();
    if (!user_id) {
      return NextResponse.json({ success: false, error: 'user_id required' }, { status: 400 });
    }

    const lim = Math.max(1, Math.min(500, Number(limit) || 100));
    const off = Math.max(0, Number(offset) || 0);

    // 1. Fetch regular quiz attempts (only completed)
    const { data: quizAttempts, error: qErr } = await supabase
      .from('quiz_attempts')
      .select("*")
      .eq('user_id', user_id)
      .not('completed_at', 'is', null) // Only completed
      .order('started_at', { ascending: false });

    if (qErr) console.error('Quiz attempts error:', qErr);
    console.log(`[History] Found ${quizAttempts?.length || 0} completed quiz attempts for user ${user_id}`);

    // 2. Fetch mock test attempts (only completed)
    const { data: testAttempts, error: tErr } = await supabase
      .from('test_attempts')
      .select(`
        *,
        mock_tests (id, title, course_id, courses (id, name))
      `)
      .eq('user_id', user_id)
      .eq('status', 'completed') // Only completed
      .order('started_at', { ascending: false });

    if (tErr) console.error('Test attempts error:', tErr);
    console.log(`[History] Found ${testAttempts?.length || 0} completed test attempts for user ${user_id}`);

    // 3. Manually fetch chapters for regular quizzes
    const chapterIds = [...new Set((quizAttempts || []).map(a => a.chapter_id).filter(Boolean))];
    let chaptersMap = {};
    if (chapterIds.length > 0) {
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select(`
          id, 
          name, 
          subject_id, 
          subjects (id, name, course_id, courses (id, name))
        `)
        .in('id', chapterIds);
      
      (chaptersData || []).forEach(ch => {
        chaptersMap[ch.id] = ch;
      });
    }

    // 4. For attempts without chapters, try to find subject names from quiz_answers
    const regularAttemptsWithoutChapter = (quizAttempts || []).filter(a => !a.chapter_id || !chaptersMap[a.chapter_id]);
    const regularIds = regularAttemptsWithoutChapter.map(a => a.id);
    
    let subjectNamesMap = {};
    if (regularIds.length > 0) {
      const { data: answers } = await supabase
        .from("quiz_answers")
        .select("attempt_id, questions (subject_id, subjects (name))")
        .in("attempt_id", regularIds);

      (answers || []).forEach(ans => {
        const attemptId = ans.attempt_id;
        const subjectName = ans.questions?.subjects?.name;
        if (subjectName) {
          if (!subjectNamesMap[attemptId]) subjectNamesMap[attemptId] = new Set();
          subjectNamesMap[attemptId].add(subjectName);
        }
      });
    }

    // 5. Transform and unify
    const regularHistory = (quizAttempts || []).map(a => {
      let title = "Practice Quiz";
      const chapter = chaptersMap[a.chapter_id];
      const subjects = subjectNamesMap[a.id];
      
      let subjectName = chapter?.subjects?.name;
      if (!subjectName && subjects && subjects.size > 0) {
        subjectName = Array.from(subjects).join(", ");
      }

      if (chapter) {
        title = `${chapter.subjects?.name || 'Subject'}: ${chapter.name}`;
      } else if (subjectName) {
        title = subjectName;
      }

      return {
        id: a.id,
        type: 'regular',
        title: title,
        quiz_title: title,
        course_name: chapter?.subjects?.courses?.name || "Medical Course",
        subject_name: subjectName || "General",
        chapter_name: chapter?.name || "Practice Set",
        total_questions: a.total_questions,
        correct_answers: a.correct_answers,
        score: a.score,
        time_taken_seconds: a.time_taken_seconds,
        started_at: a.started_at,
        completed_at: a.completed_at,
        status: a.completed_at ? 'completed' : 'in_progress',
        chapter_id: a.chapter_id
      };
    });

    const mockHistory = (testAttempts || []).map(a => {
      return {
        id: a.id,
        type: 'mock',
        title: a.mock_tests?.title || "Mock Test",
        quiz_title: a.mock_tests?.title || "Mock Test",
        course_name: a.mock_tests?.courses?.name || "Mock Exam",
        subject_name: "Multi-Subject",
        chapter_name: "Full Length Mock",
        total_questions: a.total_questions,
        correct_answers: a.correct_answers,
        score: a.score,
        time_taken_seconds: a.time_taken_seconds,
        started_at: a.started_at,
        completed_at: a.completed_at,
        status: a.status || (a.completed_at ? 'completed' : 'in_progress')
      };
    });

    // 6. Merge, sort and apply range
    const unifiedHistory = [...regularHistory, ...mockHistory]
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

    const result = unifiedHistory.slice(off, off + lim);

    return NextResponse.json({ 
      success: true, 
      data: result,
      debug: {
        total_regular: regularHistory.length,
        total_mock: mockHistory.length,
        user_id
      }
    });
  } catch (err) {
    console.error("Unified history error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

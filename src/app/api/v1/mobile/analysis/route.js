import { supabase } from "@/lib/supabaseAdmin";

function toDateKey(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Mobile API: Student analysis for a specific user and course
// POST body: { user_id: "UUID", course_id: "UUID" }
export async function POST(req) {
  try {
    const { user_id, course_id } = await req.json();

    if (!user_id || !course_id) {
      return Response.json(
        { success: false, error: "user_id and course_id are required" },
        { status: 400 }
      );
    }

    // ============================================================
    // 1) QUIZ ATTEMPTS (from quiz_attempts / quiz_answers)
    // ============================================================
    const { data: quizAttemptsRaw, error: quizAttemptsErr } = await supabase
      .from("quiz_attempts")
      .select("id, user_id, total_questions, correct_answers, score, chapter_id, started_at, completed_at")
      .eq("user_id", user_id)
      .order("started_at", { ascending: false })
      .limit(1000);

    if (quizAttemptsErr) throw quizAttemptsErr;

    const quizAttempts = quizAttemptsRaw || [];
    const quizAttemptIds = quizAttempts.map((a) => a.id);

    // Load quiz answers
    let quizAnswers = [];
    if (quizAttemptIds.length) {
      const { data, error } = await supabase
        .from("quiz_answers")
        .select("attempt_id, question_id, is_correct")
        .in("attempt_id", quizAttemptIds);
      if (error) throw error;
      quizAnswers = data || [];
    }

    // Load questions for quiz answers to map subjects
    const quizQuestionIds = Array.from(new Set(quizAnswers.map((a) => a.question_id).filter(Boolean)));
    let questionsById = new Map();
    let subjectsById = new Map();

    if (quizQuestionIds.length) {
      const { data: questionsRaw, error: qErr } = await supabase
        .from("questions")
        .select("id, subject_id, question_type")
        .in("id", quizQuestionIds);
      if (qErr) throw qErr;

      questionsById = new Map((questionsRaw || []).map((q) => [q.id, q]));

      const subjectIds = Array.from(new Set((questionsRaw || []).map((q) => q.subject_id).filter(Boolean)));

      if (subjectIds.length) {
        const { data: subjectsRaw, error: sErr } = await supabase
          .from("subjects")
          .select("id, name, course_id")
          .in("id", subjectIds);
        if (sErr) throw sErr;
        subjectsById = new Map((subjectsRaw || []).map((s) => [s.id, s]));
      }
    }

    // Group quiz answers by attempt
    const quizAnswersByAttempt = new Map();
    for (const ans of quizAnswers) {
      if (!quizAnswersByAttempt.has(ans.attempt_id)) quizAnswersByAttempt.set(ans.attempt_id, []);
      quizAnswersByAttempt.get(ans.attempt_id).push(ans);
    }

    // Map each quiz attempt to course (via questions -> subjects -> course_id)
    const quizAttemptCourse = new Map();
    for (const at of quizAttempts) {
      const ansList = quizAnswersByAttempt.get(at.id) || [];
      const courseSet = new Set();
      for (const ans of ansList) {
        const q = questionsById.get(ans.question_id);
        if (!q) continue;
        const subj = subjectsById.get(q.subject_id);
        if (!subj || !subj.course_id) continue;
        courseSet.add(String(subj.course_id));
      }
      if (courseSet.size === 1) {
        quizAttemptCourse.set(at.id, Array.from(courseSet)[0]);
      } else if (courseSet.has(course_id)) {
        quizAttemptCourse.set(at.id, course_id);
      } else {
        quizAttemptCourse.set(at.id, null);
      }
    }

    // Filter quiz attempts for requested course
    const filteredQuizAttempts = quizAttempts.filter((at) => quizAttemptCourse.get(at.id) === course_id);

    // ============================================================
    // 2) MOCK TEST ATTEMPTS (from test_attempts)
    // ============================================================
    const { data: mockTestAttemptsRaw, error: mockTestErr } = await supabase
      .from("test_attempts")
      .select(`
        id, user_id, mock_test_id, total_questions, correct_answers, score, status, started_at, completed_at,
        mock_tests (id, title, course_id, total_questions)
      `)
      .eq("user_id", user_id)
      .order("completed_at", { ascending: false })
      .limit(500);

    if (mockTestErr) throw mockTestErr;

    // Filter mock test attempts by course (comparing strings)
    const filteredMockAttempts = (mockTestAttemptsRaw || []).filter(
      (at) => at.mock_tests && at.mock_tests.course_id === course_id
    );

    // ============================================================
    // 3) LOAD ALL SUBJECTS FOR THIS COURSE (for progress %)
    // ============================================================
    const { data: courseSubjects, error: csErr } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("course_id", course_id);
    if (csErr) throw csErr;

    const allCourseSubjectIds = new Set((courseSubjects || []).map((s) => String(s.id)));
    const subjectNameMap = new Map((courseSubjects || []).map((s) => [String(s.id), s.name]));

    // ============================================================
    // 4) AGGREGATE QUIZ DATA
    // ============================================================
    let quizTotalAttempts = 0;
    let quizTotalQuestions = 0;
    let quizTotalCorrect = 0;
    let quizTotalScore = 0;
    let quizScoreCount = 0;
    let quizLastActivity = null;

    const perSubject = new Map();
    const perQuestionType = new Map();
    const perDate = new Map();
    const visitedSubjectIds = new Set();

    for (const at of filteredQuizAttempts) {
      quizTotalAttempts += 1;
      const ansList = quizAnswersByAttempt.get(at.id) || [];
      const qCount = Number(at.total_questions) || ansList.length;
      quizTotalQuestions += qCount;
      const correct = Number(at.correct_answers) || 0;
      quizTotalCorrect += correct;

      if (typeof at.score === "number") {
        quizTotalScore += at.score;
        quizScoreCount += 1;
      }

      const activityTs = at.completed_at || at.started_at;
      if (activityTs) {
        const t = new Date(activityTs).getTime();
        if (!quizLastActivity || t > quizLastActivity) quizLastActivity = t;

        const dateKey = toDateKey(activityTs);
        if (dateKey) {
          if (!perDate.has(dateKey)) perDate.set(dateKey, { date: dateKey, quiz_attempts: 0, mock_attempts: 0, totalScore: 0, scoreCount: 0 });
          const d = perDate.get(dateKey);
          d.quiz_attempts += 1;
          if (typeof at.score === "number") {
            d.totalScore += at.score;
            d.scoreCount += 1;
          }
        }
      }

      for (const ans of ansList) {
        const q = questionsById.get(ans.question_id);
        if (!q) continue;
        const subj = subjectsById.get(q.subject_id);
        if (!subj || String(subj.course_id) !== course_id) continue;

        const sid = String(subj.id);
        visitedSubjectIds.add(sid);

        if (!perSubject.has(sid)) {
          perSubject.set(sid, {
            subject_id: sid,
            subject_name: subjectNameMap.get(sid) || subj.name || null,
            quiz_questions: 0,
            quiz_correct: 0,
            mock_questions: 0,
            mock_correct: 0,
          });
        }
        const sAgg = perSubject.get(sid);
        sAgg.quiz_questions += 1;
        if (ans.is_correct) sAgg.quiz_correct += 1;

        const qType = q.question_type || "unknown";
        if (!perQuestionType.has(qType)) {
          perQuestionType.set(qType, { question_type: qType, total: 0, correct: 0 });
        }
        const qtAgg = perQuestionType.get(qType);
        qtAgg.total += 1;
        if (ans.is_correct) qtAgg.correct += 1;
      }
    }

    // ============================================================
    // 5) AGGREGATE MOCK TEST DATA
    // ============================================================
    let mockTotalAttempts = 0;
    let mockTotalQuestions = 0;
    let mockTotalCorrect = 0;
    let mockTotalScore = 0;
    let mockScoreCount = 0;
    let mockLastActivity = null;

    const mockTestDetails = [];

    for (const at of filteredMockAttempts) {
      mockTotalAttempts += 1;
      const qCount = Number(at.total_questions) || Number(at.mock_tests?.total_questions) || 0;
      mockTotalQuestions += qCount;
      const correct = Number(at.correct_answers) || 0;
      mockTotalCorrect += correct;

      if (typeof at.score === "number") {
        mockTotalScore += at.score;
        mockScoreCount += 1;
      }

      const activityTs = at.completed_at || at.started_at;
      if (activityTs) {
        const t = new Date(activityTs).getTime();
        if (!mockLastActivity || t > mockLastActivity) mockLastActivity = t;

        const dateKey = toDateKey(activityTs);
        if (dateKey) {
          if (!perDate.has(dateKey)) perDate.set(dateKey, { date: dateKey, quiz_attempts: 0, mock_attempts: 0, totalScore: 0, scoreCount: 0 });
          const d = perDate.get(dateKey);
          d.mock_attempts += 1;
          if (typeof at.score === "number") {
            d.totalScore += at.score;
            d.scoreCount += 1;
          }
        }
      }

      mockTestDetails.push({
        attempt_id: at.id,
        mock_test_id: at.mock_test_id,
        mock_test_title: at.mock_tests?.title || null,
        total_questions: qCount,
        correct_answers: correct,
        score: at.score,
        status: at.status,
        completed_at: at.completed_at,
      });
    }

    // ============================================================
    // 6) BUILD RESPONSE
    // ============================================================
    const grandTotalQuestions = quizTotalQuestions + mockTotalQuestions;
    const grandTotalCorrect = quizTotalCorrect + mockTotalCorrect;
    const grandScoreSum = quizTotalScore + mockTotalScore;
    const grandScoreCount = quizScoreCount + mockScoreCount;
    const lastActivity = Math.max(quizLastActivity || 0, mockLastActivity || 0) || null;

    const overview = {
      total_quiz_attempts: quizTotalAttempts,
      total_mock_attempts: mockTotalAttempts,
      total_attempts: quizTotalAttempts + mockTotalAttempts,
      total_questions: grandTotalQuestions,
      total_correct: grandTotalCorrect,
      accuracy_percent: grandTotalQuestions > 0 ? Math.round((grandTotalCorrect / grandTotalQuestions) * 100) : 0,
      average_score: grandScoreCount ? Math.round(grandScoreSum / grandScoreCount) : 0,
      last_activity_at: lastActivity ? new Date(lastActivity).toISOString() : null,
      subject_progress_percent: allCourseSubjectIds.size > 0 ? Math.round((visitedSubjectIds.size / allCourseSubjectIds.size) * 100) : 0,
      subjects_visited: visitedSubjectIds.size,
      subjects_total: allCourseSubjectIds.size,
    };

    const quizSummary = {
      attempts: quizTotalAttempts,
      total_questions: quizTotalQuestions,
      total_correct: quizTotalCorrect,
      accuracy_percent: quizTotalQuestions > 0 ? Math.round((quizTotalCorrect / quizTotalQuestions) * 100) : 0,
      average_score: quizScoreCount ? Math.round(quizTotalScore / quizScoreCount) : 0,
    };

    const mockSummary = {
      attempts: mockTotalAttempts,
      total_questions: mockTotalQuestions,
      total_correct: mockTotalCorrect,
      accuracy_percent: mockTotalQuestions > 0 ? Math.round((mockTotalCorrect / mockTotalQuestions) * 100) : 0,
      average_score: mockScoreCount ? Math.round(mockTotalScore / mockScoreCount) : 0,
      tests: mockTestDetails,
    };

    const subjects = Array.from(perSubject.values()).map((s) => {
      const totalQ = s.quiz_questions + s.mock_questions;
      const totalC = s.quiz_correct + s.mock_correct;
      return {
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        total_questions: totalQ,
        total_correct: totalC,
        accuracy_percent: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
        quiz_questions: s.quiz_questions,
        quiz_correct: s.quiz_correct,
      };
    });

    const attemptsOverTime = Array.from(perDate.values())
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((d) => ({
        date: d.date,
        quiz_attempts: d.quiz_attempts,
        mock_attempts: d.mock_attempts,
        total_attempts: d.quiz_attempts + d.mock_attempts,
        average_score: d.scoreCount ? Math.round(d.totalScore / d.scoreCount) : 0,
      }));

    const questionTypeAccuracy = Array.from(perQuestionType.values()).map((qt) => ({
      question_type: qt.question_type,
      total_questions: qt.total,
      total_correct: qt.correct,
      accuracy_percent: qt.total > 0 ? Math.round((qt.correct / qt.total) * 100) : 0,
    }));

    const subjectAccuracy = subjects.map((s) => ({
      subject_id: s.subject_id,
      subject_name: s.subject_name,
      accuracy_percent: s.accuracy_percent,
    }));

    return Response.json(
      {
        success: true,
        debug: {
          user_id,
          course_id,
          raw_mock_attempts_count: (mockTestAttemptsRaw || []).length,
          filtered_mock_attempts_count: filteredMockAttempts.length,
          raw_mock_attempts: (mockTestAttemptsRaw || []).slice(0, 3).map(a => ({
            id: a.id,
            mock_tests_course_id: a.mock_tests?.course_id,
            status: a.status
          }))
        },
        overview,
        quiz: quizSummary,
        mock_tests: mockSummary,
        subjects,
        charts: {
          attempts_over_time: attemptsOverTime,
          subject_accuracy: subjectAccuracy,
          question_type_accuracy: questionTypeAccuracy,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

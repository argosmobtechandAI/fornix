// app/api/smart-tracking/route.js
import OpenAI from "openai";
import { supabase } from "@/lib/supabaseAdmin";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function ensureEnv() {
  if (!openai) throw new Error("Missing OPENAI_API_KEY");
}

function avg(arr = []) {
  if (!arr.length) return 0;
  return (
    Math.round(
      (arr.reduce((s, r) => s + (r.score || 0), 0) / arr.length) * 100,
    ) / 100
  );
}

function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (initialError) {
    try {
      const fixed = jsonString
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\n/g, ' ');
      return JSON.parse(fixed);
    } catch (secondError) {
      try {
        const match = jsonString.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1'));
        }
      } catch (finalError) {
        console.warn("Failed to parse JSON, returning default structure");
      }
    }
  }
  
  return { weaknesses: [], study_plan: [], pacing: {}, next_actions: [] };
}

async function getUserAttempts(userId) {
  const [testAttemptsRes, quizAttemptsRes] = await Promise.all([
    supabase
      .from("test_attempts")
      .select(
        "id, mock_test_id, score, correct_answers, total_questions, answers, completed_at, status",
      )
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase
      .from("quiz_attempts")
      .select(
        "id, chapter_id, topic_ids, score, correct_answers, total_questions, completed_at",
      )
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(100),
  ]);
  
  const testAttempts = (testAttemptsRes?.data || []).filter(a => a.status === 'completed');
  const quizAttempts = (quizAttemptsRes?.data || [])
    .filter(a => a.completed_at)
    .filter(a => typeof a.score === 'number' && !Number.isNaN(a.score));
  
  return { testAttempts, quizAttempts };
}

async function getCourseInfo(userId, courseId) {
  let resolvedCourseId = courseId;
  
  if (!resolvedCourseId) {
    const { data: subs } = await supabase
      .from("user_subscriptions")
      .select("course_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1);
    resolvedCourseId = subs?.[0]?.course_id || null;
  }
  
  const [courseRes, subjectsRes] = await Promise.all([
    resolvedCourseId
      ? supabase
          .from("courses")
          .select("id, name")
          .eq("id", resolvedCourseId)
          .single()
      : Promise.resolve({ data: null }),
    resolvedCourseId
      ? supabase
          .from("subjects")
          .select("id, name, course_id")
          .eq("course_id", resolvedCourseId)
      : Promise.resolve({ data: [] }),
  ]);
  
  return {
    courseId: resolvedCourseId,
    courseInfo: courseRes?.data || null,
    subjects: subjectsRes?.data || []
  };
}

async function getChaptersAndTopics() {
  const [chaptersRes, topicsRes] = await Promise.all([
    supabase.from("chapters").select("id, subject_id, name"),
    supabase.from("topics").select("id, chapter_id, name"),
  ]);
  
  return {
    chapters: chaptersRes?.data || [],
    topics: topicsRes?.data || []
  };
}

function calculateBasicMetrics(testAttempts, quizAttempts) {
  const lastQuizAttempt = (quizAttempts || []).find(
    (q) => typeof q.score === "number" && !Number.isNaN(q.score)
  );

  return {
    test_attempts_count: testAttempts.length,
    quiz_attempts_count: quizAttempts.length,
    avg_test_score: avg(testAttempts),
    avg_quiz_score: avg(quizAttempts),
    last_test_score: testAttempts?.[0]?.score || null,
    last_quiz_score: lastQuizAttempt ? lastQuizAttempt.score : null,
    last_activity:
      testAttempts?.[0]?.completed_at ||
      quizAttempts?.[0]?.completed_at ||
      null,
  };
}

async function getQuestionStats(testAttempts, quizAttempts) {
  const questionStats = {};
  const quizAttemptIds = quizAttempts.map((q) => q.id).filter(Boolean);
  
  if (quizAttemptIds.length) {
    const { data: quizAnswers = [] } = await supabase
      .from("quiz_answers")
      .select("question_id, is_correct")
      .in("attempt_id", quizAttemptIds);

    for (const ans of quizAnswers) {
      questionStats[ans.question_id] = questionStats[ans.question_id] || { attempts: 0, correct: 0 };
      questionStats[ans.question_id].attempts++;
      if (ans.is_correct) questionStats[ans.question_id].correct++;
    }
  }

  for (const ta of testAttempts) {
    const answers = Array.isArray(ta.answers) ? ta.answers : [];
    for (const item of answers) {
      const qid = item.question_id || item.id;
      if (!qid) continue;

      questionStats[qid] = questionStats[qid] || { attempts: 0, correct: 0 };
      questionStats[qid].attempts++;
      if (item.is_correct === true) questionStats[qid].correct++;
    }
  }
  
  return questionStats;
}

async function getQuestionMeta(questionStats) {
  const questionIds = Object.keys(questionStats);
  let questionMeta = [];

  if (questionIds.length) {
    const { data } = await supabase
      .from("questions")
      .select("id, subject_id, chapter_id, topic_id")
      .in("id", questionIds);

    questionMeta = data || [];
  }
  
  return questionMeta;
}

function calculateSubjectAndTopicStats(questionStats, questionMeta) {
  const subjectStats = {};
  const topicStats = {};
  
  for (const qm of questionMeta) {
    const stat = questionStats[qm.id] || { attempts: 0, correct: 0 };

    if (qm.subject_id) {
      subjectStats[qm.subject_id] = subjectStats[qm.subject_id] || { attempts: 0, correct: 0 };
      subjectStats[qm.subject_id].attempts += stat.attempts;
      subjectStats[qm.subject_id].correct += stat.correct;
    }

    if (qm.topic_id) {
      topicStats[qm.topic_id] = topicStats[qm.topic_id] || { attempts: 0, correct: 0 };
      topicStats[qm.topic_id].attempts += stat.attempts;
      topicStats[qm.topic_id].correct += stat.correct;
    }
  }
  
  const subjectAccuracy = {};
  for (const [sid, s] of Object.entries(subjectStats)) {
    subjectAccuracy[sid] = {
      attempts: s.attempts,
      correct: s.correct,
      accuracy: s.attempts
        ? Math.round((s.correct / s.attempts) * 10000) / 100
        : 0,
    };
  }

  const topicAccuracy = {};
  for (const [tid, s] of Object.entries(topicStats)) {
    topicAccuracy[tid] = {
      attempts: s.attempts,
      correct: s.correct,
      accuracy: s.attempts
        ? Math.round((s.correct / s.attempts) * 10000) / 100
        : 0,
    };
  }
  
  return { subjectAccuracy, topicAccuracy };
}

function createSubjectSummaries(subjects, subjectAccuracy) {
  return subjects.map((s) => ({
    subject_id: s.id,
    subject_name: s.name,
    accuracy: subjectAccuracy[s.id]?.accuracy || 0,
    attempts: subjectAccuracy[s.id]?.attempts || 0,
  }));
}

function determineExamFocus(courseName) {
  const name = (courseName || "").toUpperCase();
  
  if (name.includes("AMC")) {
    return "AMC exam — clinical reasoning, Australian guidelines, applied medicine";
  }
  if (name.includes("FMGE")) {
    return "FMGE — recall-based PYQs, memory retention, repeated topics";
  }
  if (name.includes("NEET UG")) {
    return "NEET UG — NCERT concepts, foundations, accuracy and speed";
  }
  if (name.includes("NEET PG")) {
    return "NEET PG — high-yield clinical MCQs, elimination techniques, ranking strategy";
  }
  if (name.includes("INI")) {
    return "INI-CET — deep clinical reasoning, multi-step logic";
  }
  if (name.includes("USMLE")) {
    return "USMLE — Step-based clinical vignettes and diagnosis reasoning";
  }
  
  return "high-yield medical entrance preparation";
}

function createAiPromptContext(isAMC, courseName, metrics, subjectSummaries, topicAccuracy) {
  if (isAMC) {
    return {
      course: courseName,
      metrics,
      subjectSummaries,
    };
  }
  
  return {
    course: courseName,
    metrics,
    subjectSummaries,
    topicAccuracy,
  };
}

async function callOpenAI(systemPrompt, userContent) {
  ensureEnv();
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    max_tokens: 600,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  return completion?.choices?.[0]?.message?.content?.trim() || "{}";
}

// Generate default recommendations for AMC (subjects only, no chapters/topics)
function generateDefaultAMCResponse(subjectSummaries, hasAttempts = false) {
  // Sort by accuracy (lowest first), then by attempts (lowest first)
  const sorted = [...subjectSummaries].sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return a.attempts - b.attempts;
  });

  // Take up to 3 weakest subjects for the weaknesses section
  const weakSubjects = sorted.slice(0, Math.min(3, sorted.length));

  if (weakSubjects.length === 0) {
    return {
      weaknesses: [{
        area_type: "subject",
        area_id: "general",
        area_name: "General AMC Preparation",
        reason: "Start your AMC preparation by covering all core subjects.",
        severity: 3,
        confidence: 70,
        weightage: "High"
      }],
      study_plan: [{
        area_type: "subject",
        area_id: "general",
        area_name: "General AMC Preparation",
        topics: ["Clinical reasoning", "Australian medical guidelines", "Core medical concepts"],
        weeks: 8,
        hours_per_week: 10,
        milestone: "Complete foundational AMC subject review",
        resources: ["AMC Handbooks", "Australian Clinical Guidelines", "AMC Practice MCQs"]
      }],
      pacing: {
        total_weeks: 8,
        weekly_hours: 10,
        by_subject: [{
          subject_id: "general",
          subject_name: "General AMC Preparation",
          weeks: 8,
          hours_per_week: 10
        }]
      },
      next_actions: [
        "Start with AMC MCQ Cat 1 preparation",
        "Review Australian clinical guidelines",
        "Practice clinical reasoning questions",
        "Attempt at least one mock test to assess your level"
      ]
    };
  }

  const weaknesses = weakSubjects.map((s, idx) => ({
    area_type: "subject",
    area_id: s.subject_id,
    area_name: s.subject_name,
    reason: hasAttempts 
      ? `Accuracy: ${s.accuracy}% with ${s.attempts} attempts. Needs improvement.`
      : `No attempts yet. This is a high-priority subject for AMC.`,
    severity: Math.min(5, 5 - idx),
    confidence: hasAttempts ? 85 : 70,
    weightage: idx === 0 ? "Very High" : idx === 1 ? "High" : "Medium"
  }));

  // Build a study plan for ALL subjects so the UI can show one card per subject
  const study_plan = subjectSummaries.map((s) => {
    const rank = sorted.findIndex(x => x.subject_id === s.subject_id);
    const baseWeeks = hasAttempts ? (rank <= 1 ? 4 : rank <= 3 ? 3 : 2) : 3;
    const baseHours = hasAttempts ? (rank <= 1 ? 8 : rank <= 3 ? 6 : 4) : 5;
    return {
      area_type: "subject",
      area_id: s.subject_id,
      area_name: s.subject_name,
      topics: [
        "Core concepts",
        "Clinical applications",
        "AMC-style MCQs",
      ],
      weeks: baseWeeks,
      hours_per_week: baseHours,
      milestone: hasAttempts
        ? `Improve accuracy in ${s.subject_name} by focusing on weak question patterns and timed AMC practice`
        : `Build strong foundations in ${s.subject_name} and complete first round of AMC-style practice questions`,
      resources: [
        "AMC Handbooks",
        "Australian Guidelines",
        "Online AMC practice questions",
      ],
    };
  });

  const total_weeks = study_plan.length
    ? Math.max(...study_plan.map((p) => p.weeks))
    : 0;
  const weekly_hours = study_plan.reduce((sum, p) => sum + p.hours_per_week, 0);

  return {
    weaknesses,
    study_plan,
    pacing: {
      total_weeks,
      weekly_hours,
      by_subject: study_plan.map(p => ({
        subject_id: p.area_id,
        subject_name: p.area_name,
        weeks: p.weeks,
        hours_per_week: p.hours_per_week
      }))
    },
    next_actions: hasAttempts ? [
      `Focus on ${weakSubjects[0]?.subject_name || 'weakest subject'} first`,
      "Attempt more practice questions in weak areas",
      "Review incorrect answers and understand concepts",
      "Schedule regular revision sessions"
    ] : [
      "Start by attempting a mock test to assess your current level",
      `Begin studying ${weakSubjects[0]?.subject_name || 'core subjects'}`,
      "Practice AMC-style clinical reasoning questions",
      "Set up a study schedule with dedicated hours per subject"
    ]
  };
}

// Generate default recommendations for non-AMC courses (has chapters and topics)
function generateDefaultNonAMCResponse(subjectSummaries, chapters, topics, hasAttempts = false) {
  // Sort by accuracy (lowest first), then by attempts (lowest first)
  const sorted = [...subjectSummaries].sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return a.attempts - b.attempts;
  });

  // Up to 3 weakest subjects for the weaknesses section
  const weakSubjects = sorted.slice(0, Math.min(3, sorted.length));
  
  if (weakSubjects.length === 0) {
    return {
      weaknesses: [{
        area_type: "subject",
        area_id: "general",
        area_name: "General Preparation",
        reason: "Start your preparation by covering all core subjects.",
        severity: 3,
        confidence: 70,
        weightage: "High"
      }],
      study_plan: [{
        area_type: "subject",
        area_id: "general",
        area_name: "General Preparation",
        topics: ["Core concepts", "Practice questions", "Revision"],
        weeks: 8,
        hours_per_week: 10,
        milestone: "Complete foundational subject review",
        resources: ["Study materials", "Practice tests", "Video lectures"]
      }],
      pacing: {
        total_weeks: 8,
        weekly_hours: 10,
        by_subject: [{
          subject_id: "general",
          subject_name: "General Preparation",
          weeks: 8,
          hours_per_week: 10
        }]
      },
      next_actions: [
        "Start with the first subject in syllabus",
        "Attempt practice questions after each chapter",
        "Take a mock test to assess your level",
        "Create a study schedule"
      ]
    };
  }

  // Get chapters for weak subjects
  const subjectChapters = {};
  for (const subj of weakSubjects) {
    subjectChapters[subj.subject_id] = chapters.filter(ch => ch.subject_id === subj.subject_id);
  }

  const weaknesses = weakSubjects.map((s, idx) => {
    const subjChapters = subjectChapters[s.subject_id] || [];
    return {
      area_type: "subject",
      area_id: s.subject_id,
      area_name: s.subject_name,
      reason: hasAttempts 
        ? `Accuracy: ${s.accuracy}% with ${s.attempts} attempts. Needs improvement.`
        : `No attempts yet. This subject has ${subjChapters.length} chapters to cover.`,
      severity: Math.min(5, 5 - idx),
      confidence: hasAttempts ? 85 : 70,
      weightage: idx === 0 ? "Very High" : idx === 1 ? "High" : "Medium",
      chapters_count: subjChapters.length,
      chapters: subjChapters.slice(0, 5).map(ch => ch.name)
    };
  });

  // Build a study plan for ALL subjects so UI sees every subject
  const study_plan = subjectSummaries.map((s) => {
    const subjChapters = subjectChapters[s.subject_id] || [];
    const chapterNames = subjChapters.slice(0, 8).map((ch) => ch.name);
    const rank = sorted.findIndex(x => x.subject_id === s.subject_id);
    const baseWeeks = hasAttempts ? (rank <= 1 ? 4 : rank <= 3 ? 3 : 2) : 3;
    const baseHours = hasAttempts ? (rank <= 1 ? 8 : rank <= 3 ? 6 : 4) : 5;

    return {
      area_type: "subject",
      area_id: s.subject_id,
      area_name: s.subject_name,
      topics:
        chapterNames.length > 0
          ? chapterNames
          : ["Core concepts", "Important chapters", "PYQs"],
      weeks: baseWeeks,
      hours_per_week: baseHours,
      milestone: subjChapters.length
        ? `Complete ${s.subject_name} - ${subjChapters.length} chapters with topic-wise quizzes`
        : `Cover core ${s.subject_name} concepts and attempt practice questions`,
      resources: [
        "NCERT/Standard textbooks",
        "Previous year questions",
        "Video lectures",
      ],
    };
  });

  const total_weeks = study_plan.length
    ? Math.max(...study_plan.map((p) => p.weeks))
    : 0;
  const weekly_hours = study_plan.reduce((sum, p) => sum + p.hours_per_week, 0);

  return {
    weaknesses,
    study_plan,
    pacing: {
      total_weeks,
      weekly_hours,
      by_subject: study_plan.map(p => ({
        subject_id: p.area_id,
        subject_name: p.area_name,
        weeks: p.weeks,
        hours_per_week: p.hours_per_week
      }))
    },
    next_actions: hasAttempts ? [
      `Focus on ${weakSubjects[0]?.subject_name || 'weakest subject'} first`,
      "Complete all chapters in weak subjects",
      "Attempt topic-wise quizzes after each chapter",
      "Review incorrect answers and revise concepts"
    ] : [
      "Start by attempting a mock test to assess your current level",
      `Begin studying ${weakSubjects[0]?.subject_name || 'core subjects'}`,
      "Complete chapters one by one with topic quizzes",
      "Set up a study schedule with dedicated hours per subject"
    ]
  };
}

async function saveSmartTracking(userId, courseId, metrics, recommendations, aiRaw) {
  try {
    await supabase.from("smart_tracking").insert([
      {
        user_id: userId,
        course_id: courseId,
        metrics,
        recommendations,
        ai_raw: aiRaw,
      },
    ]);
  } catch (error) {
    console.warn("Smart tracking save failed:", error.message);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, course_id = null, force_refresh = false, use_ai = false } = body;
    
    if (!user_id) {
      return Response.json(
        { success: false, error: "user_id required" },
        { status: 400 },
      );
    }

    // Check cache first (unless force_refresh)
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from("smart_tracking")
        .select("recommendations, metrics, created_at")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cached?.recommendations && cached.created_at) {
        const age = Date.now() - new Date(cached.created_at).getTime();
        const TTL = 1000 * 60 * 60 * 6; // 6 hours cache
        if (age < TTL) {
          return Response.json({
            success: true,
            cached: true,
            data: cached.recommendations,
            metrics: cached.metrics,
          });
        }
      }
    }

    // 1. Fetch user attempts AND course info in parallel
    const [attemptsResult, courseResult] = await Promise.all([
      getUserAttempts(user_id),
      getCourseInfo(user_id, course_id)
    ]);
    
    const { testAttempts, quizAttempts } = attemptsResult;
    const hasAttempts = testAttempts.length > 0 || quizAttempts.length > 0;
    const { courseId: resolvedCourseId, courseInfo, subjects } = courseResult;
    
    // 3. Determine if AMC and get course name (use already fetched data)
    let courseName = courseInfo?.name || "";
    const isAMC = courseName.toUpperCase().includes("AMC");
    
    // 4. Get chapters and topics if not AMC (only fetch what we need)
    let chapters = [];
    let topics = [];
    if (!isAMC && subjects.length > 0) {
      // Only fetch chapters for the course's subjects to reduce data
      const subjectIds = subjects.map(s => s.id);
      const { data: chaptersData } = await supabase
        .from("chapters")
        .select("id, subject_id, name")
        .in("subject_id", subjectIds);
      chapters = chaptersData || [];
      // Skip topics fetch - not needed for recommendations
    }
    
    // 5. Calculate basic metrics
    const metrics = calculateBasicMetrics(testAttempts, quizAttempts);
    
    // 6. Create subject summaries (even without attempts, for recommendations)
    let subjectSummaries = subjects.map((s) => ({
      subject_id: s.id,
      subject_name: s.name,
      accuracy: 0,
      attempts: 0,
    }));
    
    // 7. If has attempts, calculate actual stats
    let parsed;
    if (hasAttempts) {
      // Get question-level statistics (sync, no DB call needed)
      const questionStats = await getQuestionStats(testAttempts, quizAttempts);
      
      // Get question metadata (only if we have question stats)
      const questionIds = Object.keys(questionStats);
      let questionMeta = [];
      if (questionIds.length > 0 && questionIds.length <= 500) {
        const { data } = await supabase
          .from("questions")
          .select("id, subject_id")
          .in("id", questionIds.slice(0, 500));
        questionMeta = data || [];
      }
      
      // Calculate subject and topic accuracy
      const { subjectAccuracy, topicAccuracy } = calculateSubjectAndTopicStats(questionStats, questionMeta);
      
      // Update subject summaries with actual data
      subjectSummaries = createSubjectSummaries(subjects, subjectAccuracy);
      
      if (use_ai) {
        // Prepare AI prompt (optional, slower path)
        const examFocus = determineExamFocus(courseName);
        const context = createAiPromptContext(
          isAMC,
          courseName,
          metrics,
          subjectSummaries,
          topicAccuracy
        );

        const systemPrompt = `You are an expert ${courseName || "medical exam"} coach. Exam focus: ${examFocus}. Using the provided metrics and subject summaries, identify up to 3 weakest areas and create a detailed, practical study plan. Always respond with ONLY valid JSON following the schema in the user message. Do not add any extra text.`;

        const userContent = `Here is the data about the student's performance and subjects:\n${JSON.stringify(
          context
        )}\n\nReturn ONLY a JSON object with this structure (fill all fields with meaningful values):\n{"weaknesses":[{"area_type":"subject","area_id":"SUBJECT_ID","area_name":"Subject name","reason":"Short explanation based on low accuracy or low attempts.","severity":3,"confidence":80,"weightage":"High"}],"study_plan":[{"area_type":"subject","area_id":"SUBJECT_ID","area_name":"Subject name","topics":["Topic 1","Topic 2"],"weeks":4,"hours_per_week":8,"milestone":"Concrete milestone for this subject","resources":["Resource 1","Resource 2"]}],"pacing":{"total_weeks":8,"weekly_hours":10,"by_subject":[{"subject_id":"SUBJECT_ID","subject_name":"Subject name","weeks":4,"hours_per_week":8}]},"next_actions":["Short actionable step 1","Short actionable step 2"]}`;

        // Call OpenAI API
        const aiText = await callOpenAI(systemPrompt, userContent);

        // Parse AI response
        parsed = safeJsonParse(aiText);

        // Handle empty response - generate default based on course type
        if (!parsed || !parsed.weaknesses || parsed.weaknesses.length === 0) {
          if (isAMC) {
            parsed = generateDefaultAMCResponse(subjectSummaries, true);
          } else {
            parsed = generateDefaultNonAMCResponse(
              subjectSummaries,
              chapters,
              topics,
              true
            );
          }
        }

        // Save results (async, don't await)
        saveSmartTracking(user_id, resolvedCourseId, metrics, parsed, aiText);
      } else {
        // Fast path: purely deterministic recommendations (no external AI call)
        if (isAMC) {
          parsed = generateDefaultAMCResponse(subjectSummaries, true);
        } else {
          parsed = generateDefaultNonAMCResponse(
            subjectSummaries,
            chapters,
            topics,
            true
          );
        }

        // Save results (async, don't await)
        saveSmartTracking(
          user_id,
          resolvedCourseId,
          metrics,
          parsed,
          "AI disabled - default deterministic recommendations"
        );
      }
    } else {
      // No attempts - generate recommendations based on course structure
      if (isAMC) {
        parsed = generateDefaultAMCResponse(subjectSummaries, false);
      } else {
        parsed = generateDefaultNonAMCResponse(subjectSummaries, chapters, topics, false);
      }
      
      // Save results (async, don't await)
      saveSmartTracking(user_id, resolvedCourseId, metrics, parsed, "No attempts - default recommendations");
    }
    
    // Return final response
    return Response.json({
      success: true,
      cached: false,
      course: courseName || "Unknown Course",
      has_attempts: hasAttempts,
      metrics,
      subjects_count: subjects.length,
      chapters_count: isAMC ? 0 : chapters.length,
      data: parsed,
    });
    
  } catch (error) {
    console.error("Smart tracking error:", error);
    return Response.json(
      { success: false, error: error.message || "Server Error" },
      { status: 500 },
    );
  }
}
import { supabase } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ═══════════════════════════════════════════════════════════════════
// IN-MEMORY CACHE — avoids ALL DB calls for repeated requests
// ═══════════════════════════════════════════════════════════════════
const MEM_CACHE = new Map();           // key → { data, ts }
const MEM_TTL = 1000 * 60 * 5;        // 5 minutes for computed results
const STRUCTURE_CACHE = new Map();     // courseId → { data, ts }
const STRUCTURE_TTL = 1000 * 60 * 30;  // 30 minutes for course structure (rarely changes)

function memGet(key) {
  const entry = MEM_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > MEM_TTL) {
    MEM_CACHE.delete(key);
    return null;
  }
  // LRU behavior: refresh position by re-inserting
  MEM_CACHE.delete(key);
  MEM_CACHE.set(key, entry);
  return entry.data;
}

function memSet(key, data) {
  MEM_CACHE.set(key, { data, ts: Date.now() });
  // Prevent memory leak: cap at 200 entries
  if (MEM_CACHE.size > 200) {
    const oldest = MEM_CACHE.keys().next().value;
    MEM_CACHE.delete(oldest);
  }
}

function structureGet(courseId) {
  const entry = STRUCTURE_CACHE.get(courseId);
  if (!entry) return null;
  if (Date.now() - entry.ts > STRUCTURE_TTL) {
    STRUCTURE_CACHE.delete(courseId);
    return null;
  }
  return entry.data;
}

function structureSet(courseId, data) {
  STRUCTURE_CACHE.set(courseId, { data, ts: Date.now() });
}

// ─── Helpers ────────────────────────────────────────────────────────
function pct(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function chunk(arr, size = 100) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0].replace(/,\s*([}\]])/g, "$1"));
    } catch { /* ignore */ }
  }
  return null;
}

// ─── Paginator for Supabase 1000-row limit ──────────────────────────
async function fetchAllWithIn(table, selectCol, inCol, inBatch) {
  let allData = [];
  let from = 0;
  const size = 1000; // Supabase limit chunk size
  while (true) {
    const { data } = await supabase
      .from(table)
      .select(selectCol)
      .in(inCol, inBatch)
      .range(from, from + size - 1);
    
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < size) break;
    from += size;
  }
  return allData;
}

// ─── 1. Resolve course ──────────────────────────────────────────────
async function resolveCourse(userId, courseId) {
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

  if (!resolvedCourseId) return { courseId: null, courseName: null };

  const { data: course } = await supabase
    .from("courses")
    .select("id, name")
    .eq("id", resolvedCourseId)
    .single();

  return {
    courseId: resolvedCourseId,
    courseName: course?.name || "Unknown Course",
  };
}

// ─── 2. Fetch course structure (with 30-min in-memory cache) ────────
async function fetchCourseStructure(courseId) {
  // Check in-memory structure cache first
  const cached = structureGet(courseId);
  if (cached) return cached;

  // Subjects
  const { data: subjects = [] } = await supabase
    .from("subjects")
    .select("id, name, course_id")
    .eq("course_id", courseId)
    .order("name");

  if (!subjects.length) return { subjects: [], chapters: [], topics: [], subjectIds: [] };

  const subjectIds = subjects.map((s) => s.id);

  // Chapters reliably (bypass 1000 limit)
  const chaptersPromises = chunk(subjectIds).map((batch) =>
    fetchAllWithIn("chapters", "id, subject_id, name", "subject_id", batch)
  );
  const chaptersResults = await Promise.all(chaptersPromises);
  const chapters = chaptersResults.flat().sort((a, b) => a.name.localeCompare(b.name));

  const chapterIds = chapters.map((c) => c.id);

  let topics = [];
  if (chapterIds.length) {
    // Fetch topics reliably (bypass 1000 limit)
    const topicPromises = chunk(chapterIds).map((batch) =>
      fetchAllWithIn("topics", "id, chapter_id, name", "chapter_id", batch)
    );
    const topicResults = await Promise.all(topicPromises);
    topics = topicResults.flat().sort((a, b) => a.name.localeCompare(b.name));
  }

  const result = { subjects, chapters, topics, subjectIds };

  // Cache the structure (courses rarely change)
  structureSet(courseId, result);
  return result;
}

// ─── 3. Fetch course questions (parallel batches) ───────────────────
async function fetchCourseQuestions(subjectIds) {
  // Fetch ALL questions across all subjects (Pagination avoids 1000 max row limit)
  const promises = chunk(subjectIds).map((batch) =>
    fetchAllWithIn("questions", "id, subject_id, chapter_id, topic_id", "subject_id", batch)
  );
  const results = await Promise.all(promises);
  const allQuestions = results.flat();
  const courseQuestionIds = new Set(allQuestions.map((q) => String(q.id).toLowerCase()));

  return { allQuestions, courseQuestionIds };
}

// ─── 4. Fetch user answers (quiz only) ────────────────────────────────
async function fetchUserAnswers(userId) {
  // Fetch completed quiz attempts
  const { data: quizAttemptsRes } = await supabase
    .from("quiz_attempts")
    .select("id, chapter_id, topic_ids, score, correct_answers, total_questions, completed_at")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1000);

  const quizAttempts = (quizAttemptsRes || []).filter(
    (a) => a.completed_at
  );

  // Fetch quiz answers reliably by paginating in parallel batches
  const quizAttemptIds = quizAttempts.map((a) => a.id).filter(Boolean);
  let quizAnswers = [];
  if (quizAttemptIds.length) {
    const ansPromises = chunk(quizAttemptIds).map((batch) =>
      fetchAllWithIn("quiz_answers", "attempt_id, question_id, selected_key, correct_key, is_correct", "attempt_id", batch)
    );
    const ansResults = await Promise.all(ansPromises);
    quizAnswers = ansResults.flat();
  }

  // Last activity
  const lastActivity = quizAttempts[0]?.completed_at || null;

  return { quizAttempts, quizAnswers, lastActivity };
}

// ─── 5. Build per-question performance (course-filtered) ────────────
function buildQuestionPerformance(quizAnswers, courseQuestionIds) {
  const perf = {};
  let debugMisses = 0;
  const sampleMissedIds = [];

  function touch(qid) {
    if (!perf[qid]) perf[qid] = { times_seen: 0, correct: 0, wrong: 0, skipped: 0 };
  }

  for (const ans of quizAnswers) {
    const qid = ans.question_id ? String(ans.question_id).toLowerCase() : null;
    if (!qid) continue;
    if (!courseQuestionIds.has(qid)) {
      debugMisses++;
      if (sampleMissedIds.length < 5 && !sampleMissedIds.includes(qid)) {
        sampleMissedIds.push(qid);
      }
      continue;
    }
    touch(qid);
    perf[qid].times_seen++;
    const selected = ans.selected_key;
    if (selected === null || selected === undefined || selected === "") {
      perf[qid].skipped++;
    } else if (ans.is_correct === true) {
      perf[qid].correct++;
    } else {
      perf[qid].wrong++;
    }
  }

  return { perf, debugMisses, sampleMissedIds };
}

// ─── 6. Aggregate stats ─────────────────────────────────────────────
function aggregateStats(questionPerf, allQuestions, subjects, chapters, topics) {
  const subjectStats = {};
  const chapterStats = {};
  const topicStats = {};

  for (const s of subjects) {
    subjectStats[s.id] = {
      id: s.id, name: s.name,
      total_questions: 0, attempted_questions: 0,
      correct: 0, wrong: 0, skipped: 0,
    };
  }
  for (const c of chapters) {
    chapterStats[c.id] = {
      id: c.id, name: c.name, subject_id: c.subject_id,
      total_questions: 0, attempted_questions: 0,
      correct: 0, wrong: 0, skipped: 0,
    };
  }
  for (const t of topics) {
    topicStats[t.id] = {
      id: t.id, name: t.name, chapter_id: t.chapter_id,
      total_questions: 0, attempted_questions: 0,
      correct: 0, wrong: 0, skipped: 0,
    };
  }

  for (const q of allQuestions) {
    const perf = questionPerf[q.id];
    const wasAttempted = !!perf;

    if (q.subject_id && subjectStats[q.subject_id]) {
      const s = subjectStats[q.subject_id];
      s.total_questions++;
      if (wasAttempted) {
        s.attempted_questions++;
        s.correct += perf.correct;
        s.wrong += perf.wrong;
        s.skipped += perf.skipped;
      }
    }
    if (q.chapter_id && chapterStats[q.chapter_id]) {
      const c = chapterStats[q.chapter_id];
      c.total_questions++;
      if (wasAttempted) {
        c.attempted_questions++;
        c.correct += perf.correct;
        c.wrong += perf.wrong;
        c.skipped += perf.skipped;
      }
    }
    if (q.topic_id && topicStats[q.topic_id]) {
      const t = topicStats[q.topic_id];
      t.total_questions++;
      if (wasAttempted) {
        t.attempted_questions++;
        t.correct += perf.correct;
        t.wrong += perf.wrong;
        t.skipped += perf.skipped;
      }
    }
  }

  function enrich(stat) {
    stat.not_attempted = stat.total_questions - stat.attempted_questions;
    stat.accuracy = pct(stat.correct, stat.correct + stat.wrong);
    stat.completion = pct(stat.attempted_questions, stat.total_questions);
    return stat;
  }

  Object.values(subjectStats).forEach(enrich);
  Object.values(chapterStats).forEach(enrich);
  Object.values(topicStats).forEach(enrich);

  return { subjectStats, chapterStats, topicStats };
}

// ─── 7. Detect weak areas ───────────────────────────────────────────
function detectWeakAreas(subjectStats, chapterStats, topicStats, chapters, topics, subjects) {
  const weakSubjects = [];
  const weakChapters = [];
  const weakTopics = [];

  const subjectNameMap = {};
  for (const s of subjects) subjectNameMap[s.id] = s.name;
  const chapterNameMap = {};
  const chapterSubjectMap = {};
  for (const c of chapters) {
    chapterNameMap[c.id] = c.name;
    chapterSubjectMap[c.id] = c.subject_id;
  }

  function weakScore(stat) {
    if (stat.attempted_questions === 0) return -1;
    return stat.accuracy * 0.6 + stat.completion * 0.4;
  }

  function getSeverity(stat) {
    if (stat.attempted_questions === 0) return "not_started";
    if (stat.accuracy < 30) return "critical";
    if (stat.accuracy < 50) return "weak";
    if (stat.accuracy < 70) return "needs_improvement";
    return "moderate";
  }

  function getReason(stat) {
    if (stat.attempted_questions === 0) {
      return `Not started — ${stat.total_questions} questions available to practice`;
    }
    if (stat.accuracy < 30) {
      return `Critical: Only ${stat.accuracy}% accuracy (${stat.correct} correct, ${stat.wrong} wrong out of ${stat.attempted_questions} attempted)`;
    }
    if (stat.accuracy < 50) {
      return `Weak: ${stat.accuracy}% accuracy — ${stat.wrong} wrong answers need revision (${stat.attempted_questions}/${stat.total_questions} attempted)`;
    }
    return `Needs improvement: ${stat.accuracy}% accuracy with ${stat.not_attempted} questions still unattempted`;
  }

  for (const s of Object.values(subjectStats)) {
    if (s.total_questions === 0) continue;
    const severity = getSeverity(s);
    if (severity !== "moderate") {
      weakSubjects.push({
        subject_id: s.id, subject_name: s.name,
        total_questions: s.total_questions, attempted_questions: s.attempted_questions,
        not_attempted: s.not_attempted, correct: s.correct, wrong: s.wrong, skipped: s.skipped,
        accuracy: s.accuracy, completion: s.completion,
        weak_score: weakScore(s), severity, reason: getReason(s),
      });
    }
  }

  for (const c of Object.values(chapterStats)) {
    if (c.total_questions === 0) continue;
    const severity = getSeverity(c);
    if (severity !== "moderate") {
      weakChapters.push({
        chapter_id: c.id, chapter_name: c.name,
        subject_id: c.subject_id, subject_name: subjectNameMap[c.subject_id] || null,
        total_questions: c.total_questions, attempted_questions: c.attempted_questions,
        not_attempted: c.not_attempted, correct: c.correct, wrong: c.wrong, skipped: c.skipped,
        accuracy: c.accuracy, completion: c.completion,
        weak_score: weakScore(c), severity, reason: getReason(c),
      });
    }
  }

  for (const t of Object.values(topicStats)) {
    if (t.total_questions === 0) continue;
    const severity = getSeverity(t);
    if (severity !== "moderate") {
      const parentSubjectId = chapterSubjectMap[t.chapter_id] || null;
      weakTopics.push({
        topic_id: t.id, topic_name: t.name,
        chapter_id: t.chapter_id, chapter_name: chapterNameMap[t.chapter_id] || null,
        subject_id: parentSubjectId, subject_name: parentSubjectId ? subjectNameMap[parentSubjectId] : null,
        total_questions: t.total_questions, attempted_questions: t.attempted_questions,
        not_attempted: t.not_attempted, correct: t.correct, wrong: t.wrong, skipped: t.skipped,
        accuracy: t.accuracy, completion: t.completion,
        weak_score: weakScore(t), severity, reason: getReason(t),
      });
    }
  }

  const sorter = (a, b) => a.weak_score - b.weak_score;
  weakSubjects.sort(sorter);
  weakChapters.sort(sorter);
  weakTopics.sort(sorter);

  return { weakSubjects, weakChapters, weakTopics };
}

// ─── 7b. Chapter-wise strong/weak classification ────────────────────
const STRONG_THRESHOLD = 60;

function classifyChapters(chapterStats, chapters, subjects) {
  const subjectNameMap = {};
  for (const s of subjects) subjectNameMap[s.id] = s.name;

  const chapter_analysis = [];
  const strong_chapters = [];
  const weak_chapters = [];

  for (const c of chapters) {
    const cs = chapterStats[c.id];
    if (!cs || cs.total_questions === 0) continue;

    const chapterPct = cs.attempted_questions === 0 ? 0 : cs.accuracy;
    const status = chapterPct >= STRONG_THRESHOLD ? "strong" : "weak";

    const entry = {
      chapter_id: c.id,
      chapter_name: c.name,
      subject_id: c.subject_id,
      subject_name: subjectNameMap[c.subject_id] || null,
      obtained_marks: cs.correct || 0,
      total_marks: cs.correct + cs.wrong || 0,
      total_questions: cs.total_questions,
      attempted_questions: cs.attempted_questions,
      percentage: chapterPct,
      accuracy: cs.accuracy,
      completion: cs.completion,
      status,
    };

    chapter_analysis.push(entry);
    if (status === "strong") strong_chapters.push(entry);
    else weak_chapters.push(entry);
  }

  // Sort: weakest first
  const weakest_first = [...weak_chapters].sort((a, b) => a.percentage - b.percentage);

  return { chapter_analysis, strong_chapters, weak_chapters, weakest_first };
}

// ─── 7c. Generate study plan (top 2-3 weakest) ─────────────────────
function generateStudyPlan(weakest_first) {
  const today = new Date().toISOString().split("T")[0];
  const focusChapters = weakest_first.slice(0, 3).map((ch) => ({
    chapter_id: ch.chapter_id,
    chapter_name: ch.chapter_name,
    subject_name: ch.subject_name,
    current_percentage: ch.percentage,
  }));

  return {
    date: today,
    chapters: focusChapters,
    message: focusChapters.length > 0
      ? "Focus on your weakest areas first — study notes, then attempt MCQs"
      : "All chapters are above threshold! Keep revising to maintain your edge.",
    priority: focusChapters.length > 0 ? "high" : "maintenance",
  };
}

// ─── 7d. Improvement tracking (compare with previous snapshot) ──────
async function computeImprovement(userId, courseId, currentChapterStats, chapters) {
  try {
    const { data: prevEntry } = await supabase
      .from("smart_tracking")
      .select("recommendations, metrics, created_at")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!prevEntry?.recommendations?.chapter_classification) return null;

    const prevChapters = prevEntry.recommendations.chapter_classification.chapter_analysis || [];
    if (prevChapters.length === 0) return null;

    const prevMap = {};
    for (const pc of prevChapters) prevMap[pc.chapter_id] = pc;

    // Calculate overall previous and current scores
    let prevTotalCorrect = 0, prevTotalAttempted = 0;
    let currTotalCorrect = 0, currTotalAttempted = 0;
    const improved_chapters = [];
    let weak_to_strong_count = 0;

    for (const c of chapters) {
      const cs = currentChapterStats[c.id];
      const ps = prevMap[c.id];
      if (!cs || cs.total_questions === 0) continue;

      currTotalCorrect += cs.correct || 0;
      currTotalAttempted += (cs.correct || 0) + (cs.wrong || 0);

      if (ps) {
        prevTotalCorrect += ps.obtained_marks || 0;
        prevTotalAttempted += ps.total_marks || 0;

        if (cs.accuracy > (ps.percentage || 0)) {
          improved_chapters.push({
            chapter_id: c.id,
            chapter_name: c.name,
            from: ps.percentage || 0,
            to: cs.accuracy,
          });
        }

        if (ps.status === "weak" && cs.accuracy >= STRONG_THRESHOLD) {
          weak_to_strong_count++;
        }
      }
    }

    const previous_score = prevTotalAttempted > 0 ? pct(prevTotalCorrect, prevTotalAttempted) : 0;
    const current_score = currTotalAttempted > 0 ? pct(currTotalCorrect, currTotalAttempted) : 0;

    return {
      previous_score,
      current_score,
      improvement_percentage: Math.round((current_score - previous_score) * 100) / 100,
      improved_chapters: improved_chapters.sort((a, b) => (b.to - b.from) - (a.to - a.from)),
      weak_to_strong_count,
    };
  } catch {
    return null;
  }
}

// ─── 8. Build tree (ENHANCED with chapter status + subject summary) ──
function buildTree(subjects, chapters, topics, subjectStats, chapterStats, topicStats) {
  return subjects.map((s) => {
    const ss = subjectStats[s.id] || {};
    const subjectChapters = chapters.filter((c) => c.subject_id === s.id);

    // Count strong/weak at subject level
    let strong_count = 0, weak_count = 0;
    const enrichedChapters = subjectChapters.map((c) => {
      const cs = chapterStats[c.id] || {};
      const chapterPct = cs.attempted_questions > 0 ? cs.accuracy : 0;
      const status = chapterPct >= STRONG_THRESHOLD ? "strong" : "weak";
      if (cs.total_questions > 0) {
        if (status === "strong") strong_count++;
        else weak_count++;
      }

      const chapterTopics = topics.filter((t) => t.chapter_id === c.id);
      return {
        chapter_id: c.id, chapter_name: c.name,
        total_questions: cs.total_questions || 0,
        attempted_questions: cs.attempted_questions || 0,
        not_attempted: cs.not_attempted || 0,
        correct: cs.correct || 0, wrong: cs.wrong || 0, skipped: cs.skipped || 0,
        accuracy: cs.accuracy || 0, completion: cs.completion || 0,
        status,
        topics: chapterTopics.map((t) => {
          const ts = topicStats[t.id] || {};
          return {
            topic_id: t.id, topic_name: t.name,
            total_questions: ts.total_questions || 0,
            attempted_questions: ts.attempted_questions || 0,
            not_attempted: ts.not_attempted || 0,
            correct: ts.correct || 0, wrong: ts.wrong || 0, skipped: ts.skipped || 0,
            accuracy: ts.accuracy || 0, completion: ts.completion || 0,
          };
        }),
      };
    });

    return {
      subject_id: s.id, subject_name: s.name,
      total_questions: ss.total_questions || 0,
      attempted_questions: ss.attempted_questions || 0,
      not_attempted: ss.not_attempted || 0,
      correct: ss.correct || 0, wrong: ss.wrong || 0, skipped: ss.skipped || 0,
      accuracy: ss.accuracy || 0, completion: ss.completion || 0,
      total_chapters: subjectChapters.length,
      strong_count,
      weak_count,
      chapters: enrichedChapters,
    };
  });
}

// ─── 9. Data-driven recommendations ─────────────────────────────────
function generateRecommendations(weakSubjects, weakChapters, weakTopics, hasAttempts) {
  const priority_subjects = weakSubjects.slice(0, 5);
  const priority_chapters = weakChapters.slice(0, 10);
  const priority_topics = weakTopics.slice(0, 15);

  const next_actions = [];
  const criticalChapters = weakChapters.filter((c) => c.severity === "critical");
  const weakOnly = weakChapters.filter((c) => c.severity === "weak");
  const notStarted = weakChapters.filter((c) => c.severity === "not_started");

  if (!hasAttempts) {
    if (priority_subjects.length > 0)
      next_actions.push(`Start with "${priority_subjects[0].subject_name}" — begin your preparation`);
    if (priority_chapters.length > 0)
      next_actions.push(`Open "${priority_chapters[0].chapter_name}" and attempt your first quiz`);
    next_actions.push("Attempt at least 1 quiz in each subject to set a baseline");
    next_actions.push("Try a mock test to understand the exam pattern");
  } else {
    if (criticalChapters.length > 0) {
      next_actions.push(
        `⚠️ Revise "${criticalChapters[0].chapter_name}" (${criticalChapters[0].subject_name}) — only ${criticalChapters[0].accuracy}% accuracy`
      );
      if (criticalChapters.length > 1)
        next_actions.push(
          `⚠️ Practice "${criticalChapters[1].chapter_name}" — ${criticalChapters[1].wrong} wrong answers need review`
        );
    }
    if (weakOnly.length > 0)
      next_actions.push(`Improve "${weakOnly[0].chapter_name}" from ${weakOnly[0].accuracy}% accuracy`);
    if (notStarted.length > 0)
      next_actions.push(`Start "${notStarted[0].chapter_name}" — ${notStarted[0].total_questions} questions waiting`);
    if (next_actions.length === 0) {
      next_actions.push("Good progress! Focus on completing unattempted questions.");
      next_actions.push("Take a full mock test to gauge your exam readiness.");
    }
  }

  return {
    priority_subjects, priority_chapters, priority_topics, next_actions,
    summary: {
      total_weak_subjects: weakSubjects.length,
      total_weak_chapters: weakChapters.length,
      total_weak_topics: weakTopics.length,
      critical_count: criticalChapters.length,
      weak_count: weakOnly.length,
      not_started_count: notStarted.length,
    },
  };
}

// ─── 10. Optional AI suggestions ────────────────────────────────────
async function getAiSuggestions(courseName, metrics, recommendations) {
  if (!openai) return { ai_available: false, message: "OpenAI API key not configured" };

  try {
    const context = {
      course: courseName,
      overall_accuracy: metrics.overall_accuracy,
      overall_completion: metrics.overall_completion,
      total_questions: metrics.total_questions_in_course,
      attempted: metrics.total_attempted_questions,
      correct: metrics.total_correct,
      wrong: metrics.total_wrong,
      weak_subjects: recommendations.priority_subjects.slice(0, 3).map((s) => ({
        name: s.subject_name, accuracy: s.accuracy, completion: s.completion,
        attempted: s.attempted_questions, total: s.total_questions,
      })),
      critical_chapters: recommendations.priority_chapters
        .filter((c) => c.severity === "critical" || c.severity === "weak")
        .slice(0, 5)
        .map((c) => ({
          name: c.chapter_name, subject: c.subject_name,
          accuracy: c.accuracy, correct: c.correct, wrong: c.wrong, total: c.total_questions,
        })),
      weak_topics: recommendations.priority_topics
        .filter((t) => t.severity === "critical" || t.severity === "weak")
        .slice(0, 5)
        .map((t) => ({
          name: t.topic_name, chapter: t.chapter_name,
          accuracy: t.accuracy, correct: t.correct, wrong: t.wrong,
        })),
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 2500,
      messages: [
        {
          role: "system",
          content: `You are an elite ${courseName || "medical exam"} coach diagnosing a student's readiness. Based on the performance data, provide a deep, highly personalized diagnostic report. Be specific, actionable, and encouraging. Respond with ONLY valid JSON matching the exact schema.`,
        },
        {
          role: "user",
          content: `Student performance data:\n${JSON.stringify(context)}\n\nProvide the report as JSON exactly like this:\n{"executive_summary":"A massive 3-4 sentence detailed diagnosis of their pacing and accuracy","recommended_timeline":[{"timeframe":"e.g. Week 1","focus":"Main subject focus","action":"Specific tactical action"}],"high_yield_interventions":[{"topic":"Critical topic name","reason":"Why it matters","action":"How to fix it"}],"time_management_tips":"2 sentences on test strategy","chance_to_pass_percentage":number(0-100),"chance_to_pass_verdict":"High / Moderate / Low","motivation":"1 extremely inspiring sentence"}`,
        },
      ],
    });

    const aiText = completion?.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = safeJsonParse(aiText);
    return parsed
      ? { ai_available: true, suggestions: parsed }
      : { ai_available: true, suggestions: null, raw: aiText };
  } catch (err) {
    console.warn("AI suggestion error:", err.message);
    return { ai_available: false, error: err.message };
  }
}

// ─── Save (fire-and-forget — don't block response) ──────────────────
function saveTracking(userId, courseId, metrics, fullData, aiRaw) {
  supabase
    .from("smart_tracking")
    .insert([
      {
        user_id: userId,
        course_id: courseId,
        metrics,
        recommendations: fullData,
        ai_raw: aiRaw || "v2-data-driven",
      },
    ])
    .then(() => {})
    .catch((err) => console.warn("Smart tracking v2 save warning:", err.message));
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/v1/smart-tracking/compute-v2
// Body: { user_id, course_id?, force_refresh?, use_ai? }
// ═══════════════════════════════════════════════════════════════════
export async function POST(req) {
  try {
    const body = await req.json();
    let {
      user_id,
      course_id = null,
      force_refresh = false,
      use_ai
    } = body;
    use_ai = true; // Forcing AI for the V2 Smart Tracking endpoint to prevent frontend cache bypassing it

    if (!user_id) {
      return Response.json({ success: false, error: "user_id required" }, { status: 400 });
    }

    const computeStartTime = Date.now();

    // ── 1. Resolve course ─────────────────────────────────────────
    const { courseId: resolvedCourseId, courseName } = await resolveCourse(user_id, course_id);

    if (!resolvedCourseId) {
      return Response.json(
        { success: false, error: "No active course found for this user" },
        { status: 404 }
      );
    }

    // ── 2. In-memory cache check (5 min, instant) ────────────────
    const cacheKey = `st:${user_id}:${resolvedCourseId}`;
    if (!force_refresh) {
      const memCached = memGet(cacheKey);
      if (memCached && (!use_ai || memCached.ai_suggestions)) {
        return Response.json({
          success: true,
          cached: true,
          cache_source: "memory",
          ...memCached,
        });
      }
    }

    // ── 3. DB cache check (6h, scoped by course_id) ──────────────
    if (!force_refresh) {
      const { data: dbCached } = await supabase
        .from("smart_tracking")
        .select("recommendations, metrics, created_at")
        .eq("user_id", user_id)
        .eq("course_id", resolvedCourseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (dbCached?.recommendations && dbCached.created_at) {
        const age = Date.now() - new Date(dbCached.created_at).getTime();
        const TTL = 1000 * 60 * 60 * 6; // 6 hours
        // If age is fresh, AND if use_ai is requested, ensure the cache actually contains it!
        if (age < TTL && (!use_ai || dbCached.recommendations.ai_suggestions)) {
          // Store in memory for next call
          memSet(cacheKey, dbCached.recommendations);
          return Response.json({
            success: true,
            cached: true,
            cache_source: "database",
            ...dbCached.recommendations,
            metrics: dbCached.metrics,
          });
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // CACHE MISS → Full computation
    // ═══════════════════════════════════════════════════════════════

    // ── 4. Fetch course structure + user answers IN PARALLEL ─────
    const [structureResult, userAnswersResult] = await Promise.all([
      fetchCourseStructure(resolvedCourseId),
      fetchUserAnswers(user_id),
    ]);

    const { subjects, chapters, topics, subjectIds } = structureResult;
    const { quizAttempts, quizAnswers, lastActivity } = userAnswersResult;

    if (!subjects.length) {
      return Response.json(
        { success: false, error: "No subjects found for this course" },
        { status: 404 }
      );
    }

    // ── 5. Fetch course questions ────────────────────────────────
    const { allQuestions, courseQuestionIds } = await fetchCourseQuestions(subjectIds);
    
    // ── 6. Build performance + aggregate + detect (all CPU, no IO)
    const { perf: questionPerf, debugMisses, sampleMissedIds } = buildQuestionPerformance(quizAnswers, courseQuestionIds);
    const attemptedInCourse = Object.keys(questionPerf).length;
    const hasAttempts = attemptedInCourse > 0;

    const { subjectStats, chapterStats, topicStats } = aggregateStats(
      questionPerf, allQuestions, subjects, chapters, topics
    );

    const { weakSubjects, weakChapters, weakTopics } = detectWeakAreas(
      subjectStats, chapterStats, topicStats, chapters, topics, subjects
    );

    // ── 6b. Chapter classification (strong/weak at 60% threshold) ────
    const chapterClassification = classifyChapters(chapterStats, chapters, subjects);

    // ── 6c. Study plan (top 2-3 weakest) ────────────────────────────
    const studyPlan = generateStudyPlan(chapterClassification.weakest_first);

    // ── 6d. Improvement tracking (compare with previous run) ────────
    const improvement = await computeImprovement(user_id, resolvedCourseId, chapterStats, chapters);


    const tree = buildTree(subjects, chapters, topics, subjectStats, chapterStats, topicStats);

    const recommendations = generateRecommendations(
      weakSubjects, weakChapters, weakTopics, hasAttempts
    );

    // ── 7. Overall metrics ───────────────────────────────────────
    const allSubjectValues = Object.values(subjectStats);
    const totalCorrect = allSubjectValues.reduce((s, v) => s + v.correct, 0);
    const totalWrong = allSubjectValues.reduce((s, v) => s + v.wrong, 0);
    const totalSkipped = allSubjectValues.reduce((s, v) => s + v.skipped, 0);

    const metrics = {
      course_id: resolvedCourseId,
      course_name: courseName,
      has_attempts: hasAttempts,
      last_activity: lastActivity,
      total_questions_in_course: allQuestions.length,
      total_attempted_questions: attemptedInCourse,
      total_not_attempted: allQuestions.length - attemptedInCourse,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
      total_skipped: totalSkipped,
      overall_accuracy: pct(totalCorrect, totalCorrect + totalWrong),
      overall_completion: pct(attemptedInCourse, allQuestions.length),
      quiz_attempts_count: quizAttempts.length,
      test_attempts_count: 0,
      subjects_count: subjects.length,
      chapters_count: chapters.length,
      topics_count: topics.length,
      debug_total_answers_fetched: quizAnswers.length,
      debug_answers_not_in_course: debugMisses,
      debug_sample_missed_qids: sampleMissedIds,
    };

    // ── 8. Optional AI (only if requested) ───────────────────────
    let ai_suggestions = null;
    if (use_ai) {
      if (hasAttempts) {
        ai_suggestions = await getAiSuggestions(courseName, metrics, recommendations);
      } else {
        // Provide a default empty-state AI packet so the frontend UI avatar & cards still render beautifully
        ai_suggestions = {
          ai_available: true,
          suggestions: {
            chance_to_pass_percentage: 0,
            chance_to_pass_verdict: "Awaiting Data",
            executive_summary: "You have not completed any quizzes or tracked questions in this course yet. Please start attempting questions so the AI engine can diagnose your performance and calculate your probability of passing.",
            recommended_timeline: [
              {
                timeframe: "Immediate Step",
                focus: "Initialization",
                action: "Start your first quiz or practice exam to generate baseline accuracy metrics."
              }
            ],
            high_yield_interventions: [],
            time_management_tips: "Once you build up a history of answers, the AI will unlock your personalized test strategy.",
            motivation: "The journey of a thousand miles begins with a single step. Start today!"
          }
        };
      }
    }

    // ── 9. Build final response ──────────────────────────────────
    const fullResponse = {
      metrics,
      tree,
      recommendations,
      chapter_classification: chapterClassification,
      study_plan: studyPlan,
      improvement,
      ...(ai_suggestions ? { ai_suggestions } : {}),
      meta: {
        generated_at: new Date().toISOString(),
        version: "v2.1",
        strong_threshold: STRONG_THRESHOLD,
      },
    };

    // ── 10. Cache in memory + save to DB (fire-and-forget) ───────
    memSet(cacheKey, fullResponse);
    saveTracking(
      user_id, resolvedCourseId, metrics, fullResponse,
      ai_suggestions ? JSON.stringify(ai_suggestions) : "v2-data-driven"
    );

    // ── 11. Return ───────────────────────────────────────────────
    const computeEndTime = Date.now();

    return Response.json({
      success: true,
      cached: false,
      ...fullResponse,
    });
  } catch (error) {
    console.error(`[SmartTracker v2] ❌ FATAL ERROR |`, error.message, error.stack?.split('\n')[1]);
    return Response.json(
      { success: false, error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}

// force nextjs hmr

import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { logAdminActivity } from "@/lib/adminActivityLogger";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, description, tutorial_video_url, subject_ids } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "New course name is required" }, { status: 400 });
    }

    if (!subject_ids || !Array.isArray(subject_ids) || subject_ids.length === 0) {
      return NextResponse.json({ success: false, error: "At least one subject must be selected to clone" }, { status: 400 });
    }

    // ─── 1. Create the new course ───
    const slug = name.toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');

    const { data: newCourse, error: courseErr } = await supabase
      .from("courses")
      .insert([{
        name: name.trim(),
        slug,
        description: description || "",
        tutorial_video_url: tutorial_video_url || null,
      }])
      .select()
      .single();

    if (courseErr) throw new Error(`Failed to create course: ${courseErr.message}`);

    const summary = {
      subjects: 0,
      chapters: 0,
      topics: 0,
      questions: 0,
      options: 0,
      correct_answers: 0,
    };

    // ─── 2. Fetch all selected subjects ───
    const { data: srcSubjects, error: subjErr } = await supabase
      .from("subjects")
      .select("*, courses(id, name)")
      .in("id", subject_ids)
      .order("name");

    if (subjErr) throw new Error(`Failed to fetch subjects: ${subjErr.message}`);
    
    // Keep track of source courses for logging
    const sourceCoursesMap = new Map();

    const subjectIdMap = new Map(); // old_id → new_id

    if (srcSubjects && srcSubjects.length > 0) {
      for (const subj of srcSubjects) {
        if (subj.courses) {
          sourceCoursesMap.set(subj.courses.id, subj.courses.name);
        }

        const { data: newSubj, error: insertErr } = await supabase
          .from("subjects")
          .insert([{
            name: subj.name,
            description: subj.description || "",
            course_id: newCourse.id,
            academic_year: subj.academic_year || null,
          }])
          .select()
          .single();

        if (insertErr) {
          console.error(`Failed to clone subject "${subj.name}":`, insertErr);
          continue;
        }
        subjectIdMap.set(subj.id, newSubj.id);
        summary.subjects++;
      }
    }

    // ─── 3. Clone Chapters ───
    const chapterIdMap = new Map(); // old_id → new_id

    if (subjectIdMap.size > 0) {
      const oldSubjectIds = Array.from(subjectIdMap.keys());
      const { data: srcChapters, error: chapErr } = await supabase
        .from("chapters")
        .select("*")
        .in("subject_id", oldSubjectIds)
        .order("name");

      if (chapErr) throw new Error(`Failed to fetch chapters: ${chapErr.message}`);

      if (srcChapters && srcChapters.length > 0) {
        for (const chap of srcChapters) {
          const newSubjectId = subjectIdMap.get(chap.subject_id);
          if (!newSubjectId) continue;

          const { data: newChap, error: insertErr } = await supabase
            .from("chapters")
            .insert([{
              subject_id: newSubjectId,
              name: chap.name,
              description: chap.description || "",
            }])
            .select()
            .single();

          if (insertErr) {
            console.error(`Failed to clone chapter "${chap.name}":`, insertErr);
            continue;
          }
          chapterIdMap.set(chap.id, newChap.id);
          summary.chapters++;
        }
      }
    }

    // ─── 4. Clone Topics (parents first, then sub-topics) ───
    const topicIdMap = new Map(); // old_id → new_id

    if (chapterIdMap.size > 0) {
      const oldChapterIds = Array.from(chapterIdMap.keys());
      const { data: srcTopics, error: topicErr } = await supabase
        .from("topics")
        .select("*")
        .in("chapter_id", oldChapterIds)
        .order("name");

      if (topicErr) throw new Error(`Failed to fetch topics: ${topicErr.message}`);

      if (srcTopics && srcTopics.length > 0) {
        // Separate parent topics (no parent_id) and sub-topics (has parent_id)
        const parentTopics = srcTopics.filter(t => !t.parent_id);
        const subTopics = srcTopics.filter(t => t.parent_id);

        // Insert parent topics first
        for (const topic of parentTopics) {
          const newChapterId = chapterIdMap.get(topic.chapter_id);
          if (!newChapterId) continue;

          const { data: newTopic, error: insertErr } = await supabase
            .from("topics")
            .insert([{
              chapter_id: newChapterId,
              name: topic.name,
              description: topic.description || "",
              content: topic.content || "",
              parent_id: null,
            }])
            .select()
            .single();

          if (insertErr) {
            console.error(`Failed to clone topic "${topic.name}":`, insertErr);
            continue;
          }
          topicIdMap.set(topic.id, newTopic.id);
          summary.topics++;
        }

        // Insert sub-topics with remapped parent_id
        for (const topic of subTopics) {
          const newChapterId = chapterIdMap.get(topic.chapter_id);
          const newParentId = topicIdMap.get(topic.parent_id);
          if (!newChapterId) continue;

          const { data: newTopic, error: insertErr } = await supabase
            .from("topics")
            .insert([{
              chapter_id: newChapterId,
              name: topic.name,
              description: topic.description || "",
              content: topic.content || "",
              parent_id: newParentId || null,
            }])
            .select()
            .single();

          if (insertErr) {
            console.error(`Failed to clone sub-topic "${topic.name}":`, insertErr);
            continue;
          }
          topicIdMap.set(topic.id, newTopic.id);
          summary.topics++;
        }
      }
    }

    // ─── 5. Clone Questions ───
    const questionIdMap = new Map(); // old_id → new_id

    if (subjectIdMap.size > 0) {
      const oldSubjectIds = Array.from(subjectIdMap.keys());

      // Fetch all questions for the source subjects
      let allQuestions = [];
      for (let i = 0; i < oldSubjectIds.length; i += 10) {
        const batch = oldSubjectIds.slice(i, i + 10);
        const { data: batchQuestions, error: qErr } = await supabase
          .from("questions")
          .select("*")
          .in("subject_id", batch)
          .order("created_at");

        if (qErr) {
          console.error("Failed to fetch questions batch:", qErr);
          continue;
        }
        if (batchQuestions) allQuestions = allQuestions.concat(batchQuestions);
      }

      // Insert questions in batches of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
        const batch = allQuestions.slice(i, i + BATCH_SIZE);
        const insertBatch = batch.map(q => ({
          subject_id: subjectIdMap.get(q.subject_id) || null,
          chapter_id: q.chapter_id ? (chapterIdMap.get(q.chapter_id) || null) : null,
          topic_id: q.topic_id ? (topicIdMap.get(q.topic_id) || null) : null,
          question_text: q.question_text,
          explanation: q.explanation || null,
          image_url: q.image_url || null,
          question_image_url: q.question_image_url || null,
          status: q.status || null,
          question_type: q.question_type || "easy",
          marks: q.marks || 1,
          negative_marks: q.negative_marks || 0,
        }));

        const { data: newQuestions, error: insertErr } = await supabase
          .from("questions")
          .insert(insertBatch)
          .select();

        if (insertErr) {
          console.error(`Failed to clone questions batch at index ${i}:`, insertErr);
          continue;
        }

        if (newQuestions) {
          for (let j = 0; j < newQuestions.length; j++) {
            questionIdMap.set(batch[j].id, newQuestions[j].id);
            summary.questions++;
          }
        }
      }
    }

    // ─── 6. Clone Question Options ───
    if (questionIdMap.size > 0) {
      const oldQuestionIds = Array.from(questionIdMap.keys());

      let allOptions = [];
      for (let i = 0; i < oldQuestionIds.length; i += 50) {
        const batch = oldQuestionIds.slice(i, i + 50);
        const { data: batchOptions, error: optErr } = await supabase
          .from("question_options")
          .select("*")
          .in("question_id", batch);

        if (optErr) {
          console.error("Failed to fetch options batch:", optErr);
          continue;
        }
        if (batchOptions) allOptions = allOptions.concat(batchOptions);
      }

      const OPT_BATCH_SIZE = 200;
      for (let i = 0; i < allOptions.length; i += OPT_BATCH_SIZE) {
        const batch = allOptions.slice(i, i + OPT_BATCH_SIZE);
        const insertBatch = batch
          .filter(opt => questionIdMap.has(opt.question_id))
          .map(opt => ({
            question_id: questionIdMap.get(opt.question_id),
            option_key: opt.option_key,
            content: opt.content,
          }));

        if (insertBatch.length === 0) continue;

        const { error: insertErr } = await supabase
          .from("question_options")
          .insert(insertBatch);

        if (insertErr) {
          console.error(`Failed to clone options batch at index ${i}:`, insertErr);
          continue;
        }
        summary.options += insertBatch.length;
      }
    }

    // ─── 7. Clone Correct Answers ───
    if (questionIdMap.size > 0) {
      const oldQuestionIds = Array.from(questionIdMap.keys());

      let allCorrects = [];
      for (let i = 0; i < oldQuestionIds.length; i += 50) {
        const batch = oldQuestionIds.slice(i, i + 50);
        const { data: batchCorrects, error: caErr } = await supabase
          .from("correct_answers")
          .select("*")
          .in("question_id", batch);

        if (caErr) {
          console.error("Failed to fetch correct answers batch:", caErr);
          continue;
        }
        if (batchCorrects) allCorrects = allCorrects.concat(batchCorrects);
      }

      const CA_BATCH_SIZE = 200;
      for (let i = 0; i < allCorrects.length; i += CA_BATCH_SIZE) {
        const batch = allCorrects.slice(i, i + CA_BATCH_SIZE);
        const insertBatch = batch
          .filter(ca => questionIdMap.has(ca.question_id))
          .map(ca => ({
            question_id: questionIdMap.get(ca.question_id),
            correct_key: ca.correct_key,
          }));

        if (insertBatch.length === 0) continue;

        const { error: insertErr } = await supabase
          .from("correct_answers")
          .insert(insertBatch);

        if (insertErr) {
          console.error(`Failed to clone correct answers batch at index ${i}:`, insertErr);
          continue;
        }
        summary.correct_answers += insertBatch.length;
      }
    }

    // ─── 8. Log the activity ───
    const admin = req.headers.get("x-admin-email") || null;
    const sourceCoursesNames = Array.from(sourceCoursesMap.values()).join(", ");
    
    await logAdminActivity({
      adminId: null,
      adminEmail: admin,
      action: "course_cloned",
      description: `Cloned subjects from [${sourceCoursesNames}] → "${newCourse.name}" with ${summary.subjects} subjects, ${summary.chapters} chapters, ${summary.topics} topics, ${summary.questions} questions`,
      targetType: "course",
      targetId: newCourse.id,
      targetName: newCourse.name,
      metadata: {
        source_courses: Array.from(sourceCoursesMap.entries()).map(([id, name]) => ({ id, name })),
        new_course_id: newCourse.id,
        new_course_name: newCourse.name,
        summary,
      },
    });

    // ─── 9. Return success with summary ───
    return NextResponse.json({
      success: true,
      new_course: {
        id: newCourse.id,
        name: newCourse.name,
        slug: newCourse.slug,
      },
      summary,
    });

  } catch (err) {
    console.error("❌ Course clone error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

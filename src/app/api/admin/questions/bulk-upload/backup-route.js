import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();
    const rows = body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0)
      throw new Error("No rows received");

    let imported = 0;
    const subjectCache = new Map();
    const chapterCache = new Map();
    const topicCache = new Map();

    // ✅ Cache + creation helpers - ONLY subject has course_id
    async function getOrCreateSubject(name, courseId) {
      if (!name || !courseId) return null;

      // Create unique cache key with course_id to prevent duplicates across courses
      const cacheKey = `${courseId}-${name.toLowerCase().trim()}`;
      if (subjectCache.has(cacheKey)) return subjectCache.get(cacheKey);

      // Check if subject already exists for this specific course
      const { data: existing, error } = await supabase
        .from("subjects")
        .select("id")
        .eq("course_id", courseId)
        .ilike("name", name.trim())
        .maybeSingle();

      if (error) {
        console.error("Error checking existing subject:", error);
        throw error;
      }

      if (existing) {
        subjectCache.set(cacheKey, existing.id);
        return existing.id;
      }

      // Create new subject with course_id
      const { data: newSubject, error: createError } = await supabase
        .from("subjects")
        .insert([{
          name: name.trim(),
          course_id: courseId, // ONLY subject has course_id
          created_by: admin.sub,
          updated_by: admin.sub
        }])
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating subject:", createError);
        throw createError;
      }

      subjectCache.set(cacheKey, newSubject.id);
      return newSubject.id;
    }

    async function getOrCreateChapter(subjectId, name) {
      if (!subjectId || !name) return null;

      const cacheKey = `${subjectId}-${name.toLowerCase().trim()}`;
      if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey);

      // Check if chapter already exists for this subject
      const { data: existing, error } = await supabase
        .from("chapters")
        .select("id")
        .eq("subject_id", subjectId)
        .ilike("name", name.trim())
        .maybeSingle();

      if (error) {
        console.error("Error checking existing chapter:", error);
        throw error;
      }

      if (existing) {
        chapterCache.set(cacheKey, existing.id);
        return existing.id;
      }

      // Create new chapter - NO course_id
      const { data: newChapter, error: createError } = await supabase
        .from("chapters")
        .insert([
          {
            subject_id: subjectId,
            name: name.trim(),
            created_by: admin.sub,
            updated_by: admin.sub,
          },
        ])
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating chapter:", createError);
        throw createError;
      }

      chapterCache.set(cacheKey, newChapter.id);
      return newChapter.id;
    }

    async function getOrCreateTopic(chapterId, name) {
      if (!chapterId || !name) return null;

      const cacheKey = `${chapterId}-${name.toLowerCase().trim()}`;
      if (topicCache.has(cacheKey)) return topicCache.get(cacheKey);

      const { data: existing, error } = await supabase
        .from("topics")
        .select("id")
        .eq("chapter_id", chapterId)
        .ilike("name", name.trim())
        .maybeSingle();

      if (error) {
        console.error("Error checking existing topic:", error);
        throw error;
      }

      if (existing) {
        topicCache.set(cacheKey, existing.id);
        return existing.id;
      }

      // Create new topic - NO course_id
      const { data: newTopic, error: createError } = await supabase
        .from("topics")
        .insert([
          {
            chapter_id: chapterId,
            name: name.trim(),
            created_by: admin.sub,
            updated_by: admin.sub,
          },
        ])
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating topic:", createError);
        throw createError;
      }

      topicCache.set(cacheKey, newTopic.id);
      return newTopic.id;
    }

    // ✅ Validate course exists and user has access
    async function validateCourse(courseId) {
      if (!courseId) return false;

      const { data: course, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("id", courseId)
        .single();

      if (error || !course) {
        console.error("Course not found or access denied:", courseId);
        return false;
      }

      return true;
    }

    // ✅ Main import loop
    for (const raw of rows) {
      const {
        course_id,
        subject,
        chapter,
        topic,
        question_text,
        question_image_url,
        option_a,
        option_b,
        option_c,
        option_d,
        option_e,
        option_f,
        option_g,
        option_h,
        correct_option,
        explanation,
        image_url,
        question_type,
      } = raw;

      // Validate required fields - course_id is now mandatory
      if (!course_id) {
        console.warn("❌ Skipping row - course_id is required");
        continue;
      }

      // Subject and question_text are required, chapter is now optional
      if (!subject || !question_text || !question_text.trim()) {
        console.warn("❌ Skipping row - missing required fields:", {
          subject,
          question_text,
          course_id,
        });
        continue;
      }

      // Validate course exists
      const courseValid = await validateCourse(course_id);
      if (!courseValid) {
        console.warn("❌ Skipping row - invalid course_id:", course_id);
        continue;
      }

      // Validate correct option (now supports A-H)
      const correct = (correct_option || "").trim().toLowerCase();
      if (!["a", "b", "c", "d", "e", "f", "g", "h"].includes(correct)) {
        console.warn("❌ Skipping row - invalid correct option:", correct);
        continue;
      }

      // Validate that the correct option has content
      const correctOptionContent = raw[`option_${correct}`];
      if (!correctOptionContent || !correctOptionContent.trim()) {
        console.warn(
          `❌ Skipping row - correct option ${correct.toUpperCase()} is empty`
        );
        continue;
      }

      // Validate at least option A and B exist
      if (!option_a || !option_a.trim() || !option_b || !option_b.trim()) {
        console.warn("❌ Skipping row - options A and B are required");
        continue;
      }

      try {
        // Get or create subject with course_id - this ensures no duplicates within course
        const subjectId = await getOrCreateSubject(subject, course_id);
        if (!subjectId) {
          console.warn("❌ Failed to get/create subject:", subject);
          continue;
        }

        // Chapter is now optional - can add questions directly to subject
        let chapterId = null;
        let topicId = null;

        if (chapter && chapter.trim()) {
          // Get or create chapter if provided
          chapterId = await getOrCreateChapter(subjectId, chapter);
          if (!chapterId) {
            console.warn("❌ Failed to get/create chapter:", chapter);
            continue;
          }

          // Get or create topic if provided (requires chapter)
          if (topic && topic.trim()) {
            topicId = await getOrCreateTopic(chapterId, topic);
          }
        }

        // Insert question - chapter_id and topic_id can be null
        const { data: question, error: questionError } = await supabase
          .from("questions")
          .insert([
            {
              subject_id: subjectId,
              chapter_id: chapterId, // Can be null for subject-only questions
              topic_id: topicId, // Can be null
              question_text: question_text.trim(),
              question_image_url: question_image_url?.trim() || null,
              explanation: explanation?.trim() || null,
              image_url: image_url?.trim() || null,
              question_type: (question_type && ["easy", "moderate", "difficult"].includes(question_type.toLowerCase()))
                ? question_type.toLowerCase()
                : "easy",
              created_by: admin.sub,
              updated_by: admin.sub,
            },
          ])
          .select("id")
          .single();

        if (questionError) {
          console.error("❌ Failed inserting question:", questionError);
          continue;
        }

        // ✅ Prepare options A-H (only include those with content)
        const allPossibleOptions = [
          { key: "a", text: option_a },
          { key: "b", text: option_b },
          { key: "c", text: option_c },
          { key: "d", text: option_d },
          { key: "e", text: option_e },
          { key: "f", text: option_f },
          { key: "g", text: option_g },
          { key: "h", text: option_h },
        ];

        const optionsToInsert = allPossibleOptions
          .map((o) => ({
            key: o.key.toLowerCase(),
            text: typeof o.text === "string" ? o.text.trim() : "",
          }))
          .filter((o) => o.text !== ""); // Only include options with content

        // Ensure we have at least 2 options
        if (optionsToInsert.length < 2) {
          console.warn(
            "❌ Skipping question - need at least 2 options with content"
          );
          // Delete the question we just inserted
          await supabase.from("questions").delete().eq("id", question.id);
          continue;
        }

        // Ensure the correct option is among the options we're inserting
        const correctOptionExists = optionsToInsert.some(
          (opt) => opt.key === correct
        );
        if (!correctOptionExists) {
          console.warn(
            `❌ Skipping question - correct option ${correct.toUpperCase()} not found in available options`
          );
          // Delete the question we just inserted
          await supabase.from("questions").delete().eq("id", question.id);
          continue;
        }

        // 🔹 Insert options (only those with content)
        if (optionsToInsert.length > 0) {
          const { error: optionsError } = await supabase
            .from("question_options")
            .insert(
              optionsToInsert.map((o) => ({
                question_id: question.id,
                option_key: o.key,
                content: o.text,
                created_by: admin.sub,
                updated_by: admin.sub,
              }))
            );

          if (optionsError) {
            console.error("⚠️ Options insert failed:", optionsError);
            // Delete the question if options fail
            await supabase.from("questions").delete().eq("id", question.id);
            continue;
          }
        }

        // 🔹 Insert correct answer
        const { error: correctAnswerError } = await supabase
          .from("correct_answers")
          .insert([
            {
              question_id: question.id,
              correct_key: correct,
              created_by: admin.sub,
              updated_by: admin.sub,
            },
          ]);

        if (correctAnswerError) {
          console.error("⚠️ Correct answer insert failed:", correctAnswerError);
          // Delete the question if correct answer fails
          await supabase.from("questions").delete().eq("id", question.id);
          continue;
        }

        imported++;

      } catch (error) {
        console.error("❌ Error processing row:", error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        totalProcessed: rows.length,
        failed: rows.length - imported,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Bulk upload error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        imported: 0,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
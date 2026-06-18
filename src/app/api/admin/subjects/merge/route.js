import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

function asUuid(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined")
    return null;
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(s) ? s : null;
}

function lowerName(v) {
  return String(v || "").trim().toLowerCase();
}

export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();

    const destination_subject_id = asUuid(body?.destination_subject_id);
    const source_subject_ids = Array.isArray(body?.source_subject_ids)
      ? body.source_subject_ids.map(asUuid).filter(Boolean)
      : [];
    const options = body?.options || {};

    const merge_chapters_by_name = !!options.merge_chapters_by_name;
    const delete_sources = !!options.delete_sources;
    const dry_run = !!options.dry_run;

    if (!destination_subject_id) throw new Error("destination_subject_id required");
    if (!source_subject_ids.length)
      throw new Error("source_subject_ids must be a non-empty array");
    if (source_subject_ids.includes(destination_subject_id))
      throw new Error("source_subject_ids cannot include destination_subject_id");

    // Load destination + sources
    const [{ data: dest, error: destErr }, { data: sources, error: srcErr }] =
      await Promise.all([
        supabase
          .from("subjects")
          .select("id, name, course_id")
          .eq("id", destination_subject_id)
          .single(),
        supabase
          .from("subjects")
          .select("id, name, course_id")
          .in("id", source_subject_ids),
      ]);

    if (destErr) throw destErr;
    if (!dest) throw new Error("Destination subject not found");
    if (srcErr) throw srcErr;
    if (!sources?.length) throw new Error("No valid source subjects found");
    if (sources.length !== source_subject_ids.length)
      throw new Error("One or more source subjects not found");

    // Require same course_id for safety (subjects belong to a course)
    const courseId = dest.course_id;
    const mismatched = sources.filter((s) => s.course_id !== courseId);
    if (mismatched.length) {
      throw new Error(
        `All subjects must belong to the same course. Destination is in course ${courseId}, but ${mismatched
          .map((m) => `${m.name}(${m.id})`)
          .join(", ")} are not.`
      );
    }

    // Fetch chapters for sources and destination (for merging by name + counts)
    const { data: srcChapters, error: srcChapErr } = await supabase
      .from("chapters")
      .select("id, name, subject_id")
      .in("subject_id", source_subject_ids);
    if (srcChapErr) throw srcChapErr;

    const { data: destChapters, error: destChapErr } = await supabase
      .from("chapters")
      .select("id, name, subject_id")
      .eq("subject_id", destination_subject_id);
    if (destChapErr) throw destChapErr;

    const destChapterByLowerName = new Map();
    (destChapters || []).forEach((c) => {
      const key = lowerName(c.name);
      if (!key) return;
      if (!destChapterByLowerName.has(key)) destChapterByLowerName.set(key, c);
    });

    const srcChapterIds = (srcChapters || []).map((c) => c.id);

    // Count subject-only questions in sources (chapter_id IS NULL)
    const { count: directQuestionsCount, error: directCountErr } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .in("subject_id", source_subject_ids)
      .is("chapter_id", null);
    if (directCountErr) throw directCountErr;

    // Count questions under source chapters
    let chapterQuestionsCount = 0;
    if (srcChapterIds.length) {
      const { count, error } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .in("chapter_id", srcChapterIds);
      if (error) throw error;
      chapterQuestionsCount = count || 0;
    }

    const plan = {
      destination: dest,
      sources,
      options: { merge_chapters_by_name, delete_sources, dry_run },
      counts: {
        source_subjects: sources.length,
        source_chapters: (srcChapters || []).length,
        direct_questions_to_move: directQuestionsCount || 0,
        chapter_questions_to_repoint_subject: chapterQuestionsCount || 0,
      },
      chapter_name_merges: [],
    };

    if (merge_chapters_by_name) {
      plan.chapter_name_merges = (srcChapters || [])
        .map((c) => {
          const match = destChapterByLowerName.get(lowerName(c.name));
          return match
            ? {
                source_chapter_id: c.id,
                source_chapter_name: c.name,
                destination_chapter_id: match.id,
                destination_chapter_name: match.name,
              }
            : null;
        })
        .filter(Boolean);
    }

    if (dry_run) {
      return new Response(JSON.stringify({ success: true, plan }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const summary = {
      moved: {
        chapters_repointed: 0,
        chapters_merged_into_existing: 0,
        topics_repointed: 0,
        questions_subject_repointed: 0,
        questions_chapter_repointed: 0,
        questions_direct_subject_repointed: 0,
        doctor_subjects_upserted: 0,
        source_subjects_deleted: 0,
        source_chapters_deleted: 0,
      },
    };

    // 1) Move/merge chapters + repoint questions.subject_id (and questions.chapter_id when merging)
    if (merge_chapters_by_name) {
      for (const ch of srcChapters || []) {
        const match = destChapterByLowerName.get(lowerName(ch.name));
        if (match?.id) {
          // Move topics to destination chapter
          const { error: tErr } = await supabase
            .from("topics")
            .update({
              chapter_id: match.id,
              updated_by: admin.sub || admin.id || null,
              updated_at: new Date().toISOString(),
            })
            .eq("chapter_id", ch.id);
          if (tErr) throw tErr;
          summary.moved.topics_repointed += 1; // best-effort marker (Supabase doesn't return affected rows)

          // Move questions to destination chapter + subject
          const { error: qErr } = await supabase
            .from("questions")
            .update({
              chapter_id: match.id,
              subject_id: destination_subject_id,
              updated_by: admin.sub || admin.id || null,
              updated_at: new Date().toISOString(),
            })
            .eq("chapter_id", ch.id);
          if (qErr) throw qErr;
          summary.moved.chapters_merged_into_existing += 1;

          // Delete the now-empty source chapter (optional but keeps data clean)
          const { error: delChapErr } = await supabase
            .from("chapters")
            .delete()
            .eq("id", ch.id);
          if (delChapErr) throw delChapErr;
          summary.moved.source_chapters_deleted += 1;
        } else {
          // Repoint chapter to destination subject
          const { error: updChapErr } = await supabase
            .from("chapters")
            .update({
              subject_id: destination_subject_id,
              updated_by: admin.sub || admin.id || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", ch.id);
          if (updChapErr) throw updChapErr;
          summary.moved.chapters_repointed += 1;

          // Ensure questions under this chapter have subject_id aligned with destination
          const { error: updQErr } = await supabase
            .from("questions")
            .update({
              subject_id: destination_subject_id,
              updated_by: admin.sub || admin.id || null,
              updated_at: new Date().toISOString(),
            })
            .eq("chapter_id", ch.id);
          if (updQErr) throw updQErr;
        }
      }
    } else {
      // Bulk repoint chapters
      if ((srcChapters || []).length) {
        const { error: updChapErr } = await supabase
          .from("chapters")
          .update({
            subject_id: destination_subject_id,
            updated_by: admin.sub || admin.id || null,
            updated_at: new Date().toISOString(),
          })
          .in("subject_id", source_subject_ids);
        if (updChapErr) throw updChapErr;
        summary.moved.chapters_repointed = (srcChapters || []).length;

        // Align questions.subject_id for questions attached to those chapters
        const { error: updQErr } = await supabase
          .from("questions")
          .update({
            subject_id: destination_subject_id,
            updated_by: admin.sub || admin.id || null,
            updated_at: new Date().toISOString(),
          })
          .in("chapter_id", srcChapterIds);
        if (updQErr) throw updQErr;
      }
    }

    // 2) Move direct subject questions (chapter_id IS NULL) to destination subject
    const { error: updDirectErr } = await supabase
      .from("questions")
      .update({
        subject_id: destination_subject_id,
        updated_by: admin.sub || admin.id || null,
        updated_at: new Date().toISOString(),
      })
      .in("subject_id", source_subject_ids)
      .is("chapter_id", null);
    if (updDirectErr) throw updDirectErr;
    summary.moved.questions_direct_subject_repointed = directQuestionsCount || 0;

    // 3) Merge doctor_subjects assignments: upsert destination pairs, then delete old pairs
    const { data: doctorSubs, error: docSubErr } = await supabase
      .from("doctor_subjects")
      .select("doctor_id, subject_id")
      .in("subject_id", source_subject_ids);
    if (docSubErr) throw docSubErr;

    const uniqueDoctors = Array.from(
      new Set((doctorSubs || []).map((r) => String(r.doctor_id)))
    ).filter(Boolean);

    if (uniqueDoctors.length) {
      const toUpsert = uniqueDoctors.map((doctor_id) => ({
        doctor_id,
        subject_id: destination_subject_id,
      }));
      const { error: upErr } = await supabase
        .from("doctor_subjects")
        .upsert(toUpsert, { onConflict: "doctor_id,subject_id" });
      if (upErr) throw upErr;
      summary.moved.doctor_subjects_upserted = toUpsert.length;

      // delete old mappings (optional but keeps clean)
      const { error: delOldErr } = await supabase
        .from("doctor_subjects")
        .delete()
        .in("subject_id", source_subject_ids);
      if (delOldErr) throw delOldErr;
    }

    // 4) Optionally delete source subjects (after data moved)
    if (delete_sources) {
      const { error: delErr } = await supabase
        .from("subjects")
        .delete()
        .in("id", source_subject_ids);
      if (delErr) throw delErr;
      summary.moved.source_subjects_deleted = source_subject_ids.length;
    }

    return new Response(JSON.stringify({ success: true, plan, summary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("subjects merge err:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}




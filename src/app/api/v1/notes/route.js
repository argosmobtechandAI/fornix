import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// Public API: Get notes by course_id, optionally filtered by subject_id, chapter_id, note_type
// POST body: { course_id, subject_id?, chapter_id?, note_type?: "sample" | "full" | "premium" }
export async function POST(req) {
  try {
    const { course_id, subject_id, chapter_id, note_type } = await req.json();

    if (!course_id) {
      return NextResponse.json(
        { success: false, error: "course_id is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("course_notes")
      .select(
        "id, course_id, subject_id, chapter_id, title, content, pdf_url, note_type, created_at, updated_at, subjects(id, name)"
      )
      .eq("course_id", course_id)
      .order("created_at", { ascending: true });

    // Filter by chapter_id if provided (most specific)
    if (chapter_id) {
      query = query.eq("chapter_id", chapter_id);
    } else if (subject_id) {
      // Fall back to subject-level filter if no chapter given
      query = query.eq("subject_id", subject_id);
    }

    // note_type: "full" means return all (both sample + premium), otherwise filter by exact type
    if (note_type && note_type !== "full") {
      const dbType = note_type === "premium" ? "premium" : "sample";
      if (["sample", "premium"].includes(dbType)) {
        // For "full" access, return both sample AND premium. For others, filter.
        query = query.eq("note_type", dbType);
      }
    }
    // If note_type === "full", we do NOT filter — return all note types (both sample & premium)

    const { data, error } = await query;

    if (error) throw error;

    const notes = (data || []).map((n) => ({
      ...n,
      subject: n.subjects || null,
      subjects: undefined,
    }));

    return NextResponse.json({ success: true, data: notes }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// Mobile API: Get notes by course_id and subject_id
// POST body: { course_id: "UUID", subject_id?: "UUID", note_type?: "sample" | "premium" }
export async function POST(req) {
  try {
    const { course_id, subject_id, note_type } = await req.json();

    if (!course_id) {
      return NextResponse.json(
        { success: false, error: "course_id is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("course_notes")
      .select("id, course_id, subject_id, title, pdf_url, note_type, created_at, updated_at, subjects(id, name)")
      .eq("course_id", course_id)
      .order("created_at", { ascending: false });

    // Filter by subject_id if provided
    if (subject_id) {
      query = query.eq("subject_id", subject_id);
    }

    // Filter by note_type if provided (sample/premium)
    if (note_type && ["sample", "premium"].includes(note_type)) {
      query = query.eq("note_type", note_type);
    }

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




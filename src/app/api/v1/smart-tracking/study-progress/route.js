import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════
// Study Progress API — Notes completion gating for Smart Learning Flow
// 
// POST: Mark notes as completed for a chapter
// GET:  Check if MCQs are unlocked for a chapter
// ═══════════════════════════════════════════════════════════════════

// POST /api/v1/smart-tracking/study-progress
// Body: { user_id, chapter_id }
export async function POST(req) {
  try {
    const { user_id, chapter_id } = await req.json();

    if (!user_id || !chapter_id) {
      return NextResponse.json(
        { success: false, error: "user_id and chapter_id are required" },
        { status: 400 }
      );
    }

    // Upsert: mark notes_completed = true (idempotent)
    const { data, error } = await supabase
      .from("study_progress")
      .upsert(
        {
          user_id,
          chapter_id,
          notes_completed: true,
          notes_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,chapter_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      can_attempt_mcq: true,
      data,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// GET /api/v1/smart-tracking/study-progress?user_id=...&chapter_id=...
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const chapter_id = searchParams.get("chapter_id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    // If chapter_id provided, return single progress entry
    if (chapter_id) {
      const { data, error } = await supabase
        .from("study_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("chapter_id", chapter_id)
        .maybeSingle();

      if (error) throw error;

      const notesCompleted = data?.notes_completed || false;

      return NextResponse.json({
        success: true,
        notes_completed: notesCompleted,
        mcq_completed: data?.mcq_completed || false,
        can_attempt_mcq: notesCompleted,
        reason: notesCompleted ? null : "Complete notes first to unlock MCQs",
      });
    }

    // If no chapter_id, return all progress for user
    const { data, error } = await supabase
      .from("study_progress")
      .select("*")
      .eq("user_id", user_id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

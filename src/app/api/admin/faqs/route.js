import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    await ensureAdmin(req);

    // Fetch faqs and courses in parallel
    const [faqsRes, coursesRes] = await Promise.all([
      supabase.from("faqs").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
      supabase.from("courses").select("id, name").order("created_at", { ascending: false })
    ]);

    if (faqsRes.error) throw faqsRes.error;
    if (coursesRes.error) throw coursesRes.error;

    return NextResponse.json({ success: true, data: faqsRes.data, courses: coursesRes.data });
  } catch (error) {
    console.error("Admin FAQs GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureAdmin(req);
    const { question, answer, course_id, sort_order, is_active } = await req.json();

    if (!question || !answer) {
      return NextResponse.json({ success: false, error: "Question and Answer are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("faqs")
      .insert({
        question,
        answer,
        course_id: course_id || "general",
        sort_order: Number(sort_order || 0),
        is_active: is_active ?? true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("Admin FAQs POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureAdmin(req);
    const { id, question, answer, course_id, sort_order, is_active } = await req.json();

    if (!id || !question || !answer) {
      return NextResponse.json({ success: false, error: "ID, Question, and Answer are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("faqs")
      .update({
        question,
        answer,
        course_id: course_id || "general",
        sort_order: Number(sort_order || 0),
        is_active: is_active ?? true,
        updated_at: new Date()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Admin FAQs PUT error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await ensureAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: "FAQ deleted successfully" });
  } catch (error) {
    console.error("Admin FAQs DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const course_id = searchParams.get("course_id");

    let query = supabase
      .from("faqs")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (course_id && course_id !== "all") {
      query = query.eq("course_id", course_id);
    }

    const [faqsRes, coursesRes] = await Promise.all([
      query,
      supabase.from("courses").select("id, name").order("created_at", { ascending: false })
    ]);

    if (faqsRes.error) throw faqsRes.error;
    if (coursesRes.error) throw coursesRes.error;

    return NextResponse.json({ 
      success: true, 
      faqs: faqsRes.data || [], 
      courses: coursesRes.data || [] 
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("GET public FAQs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

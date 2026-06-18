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

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug is required" }, { status: 400, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("blogs")
      .select("*, blog_categories(id, name, slug)")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404, headers: corsHeaders });
      }
      throw error;
    }

    return NextResponse.json({ success: true, blog: data }, { headers: corsHeaders });
  } catch (error) {
    console.error("GET public blog detail error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

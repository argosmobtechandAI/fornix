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
    const category = searchParams.get("category");

    let query = supabase
      .from("blogs")
      .select("*, blog_categories(id, name, slug)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("blog_categories.slug", category);
    }

    const [blogsRes, categoriesRes] = await Promise.all([
      query,
      supabase.from("blog_categories").select("*").order("name")
    ]);

    if (blogsRes.error) throw blogsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;

    const blogs = category && category !== "all" 
      ? blogsRes.data.filter(b => b.blog_categories) 
      : blogsRes.data;

    return NextResponse.json({ 
      success: true, 
      blogs: blogs || [], 
      categories: categoriesRes.data || [] 
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("GET public blogs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

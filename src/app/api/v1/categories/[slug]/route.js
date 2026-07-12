import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const { slug } = await params;

    // Fetch the category by slug
    const { data: category, error: catError } = await supabase
      .from("course_categories")
      .select("*")
      .eq("slug", slug)
      .single();

    if (catError) {
      if (catError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
      }
      throw new Error(catError.message);
    }

    // Fetch the courses related to this category
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("*, course_categories(name, slug)")
      .eq("category_id", category.id)
      .order("created_at", { ascending: false });

    if (coursesError) throw new Error(coursesError.message);

    return NextResponse.json({ 
      success: true, 
      data: {
        ...category,
        courses: courses || []
      } 
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

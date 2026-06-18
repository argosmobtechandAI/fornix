import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("blog_categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, categories: data || [] });
  } catch (error) {
    console.error("GET blog-categories error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "Name and Slug are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("blog_categories")
      .insert([{ name, slug, description }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, category: data });
  } catch (error) {
    console.error("POST blog-categories error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, name, slug, description } = body;

    if (!id || !name || !slug) {
      return NextResponse.json({ success: false, error: "ID, Name, and Slug are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("blog_categories")
      .update({ name, slug, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, category: data });
  } catch (error) {
    console.error("PUT blog-categories error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("blog_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE blog-categories error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

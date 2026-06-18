import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { data, error } = await supabase
      .from("blogs")
      .select("*, blog_categories(id, name, slug)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, blogs: data || [] });
  } catch (error) {
    console.error("GET blogs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureAdmin(req);
    const body = await req.json();
    const { title, slug, category_id, content, excerpt, featured_image, meta_title, meta_description, meta_keywords, is_published } = body;

    if (!title || !slug || !category_id) {
      return NextResponse.json({ success: false, error: "Title, Slug, and Category are required" }, { status: 400 });
    }

    // featured_image should already be a URL or empty string coming from frontend
    let finalImageUrl = featured_image || "";

    const { data, error } = await supabase
      .from("blogs")
      .insert([{
        title, slug, category_id, content, excerpt, featured_image: finalImageUrl, meta_title, meta_description, meta_keywords, is_published: is_published ?? true
      }])
      .select("*, blog_categories(id, name, slug)")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, blog: data });
  } catch (error) {
    console.error("POST blogs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureAdmin(req);
    const body = await req.json();
    const { id, title, slug, category_id, content, excerpt, featured_image, meta_title, meta_description, meta_keywords, is_published } = body;

    if (!id || !title || !slug || !category_id) {
      return NextResponse.json({ success: false, error: "ID, Title, Slug, and Category are required" }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("blogs")
      .select("featured_image")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    let finalImageUrl = featured_image;

    // Optional cleanup: if the new image URL is different from the old one, we could delete the old one.
    // However, since we now use the "media" bucket, let's keep it simple.
    if (featured_image && existing.featured_image && existing.featured_image !== featured_image) {
      if (existing.featured_image.includes("/storage/v1/object/public/profile/blogs/")) {
        const oldPath = existing.featured_image.split("/profile/")[1];
        if (oldPath) await supabase.storage.from("profile").remove([oldPath]);
      } else if (existing.featured_image.includes("/storage/v1/object/public/media/blogs/")) {
        const oldPath = existing.featured_image.split("/media/")[1];
        if (oldPath) await supabase.storage.from("media").remove([oldPath]);
      }
    }

    const { data, error } = await supabase
      .from("blogs")
      .update({
        title, slug, category_id, content, excerpt, featured_image: finalImageUrl, meta_title, meta_description, meta_keywords, is_published: is_published ?? true, updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*, blog_categories(id, name, slug)")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, blog: data });
  } catch (error) {
    console.error("PUT blogs error:", error);
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

    const { data: existing, error: fetchErr } = await supabase
      .from("blogs")
      .select("featured_image")
      .eq("id", id)
      .single();

    if (fetchErr && fetchErr.code !== "PGRST116") throw fetchErr;

    if (existing && existing.featured_image) {
      if (existing.featured_image.includes("/storage/v1/object/public/profile/blogs/")) {
        const oldPath = existing.featured_image.split("/profile/")[1];
        if (oldPath) await supabase.storage.from("profile").remove([oldPath]);
      } else if (existing.featured_image.includes("/storage/v1/object/public/media/blogs/")) {
        const oldPath = existing.featured_image.split("/media/")[1];
        if (oldPath) await supabase.storage.from("media").remove([oldPath]);
      }
    }

    const { error } = await supabase
      .from("blogs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE blogs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

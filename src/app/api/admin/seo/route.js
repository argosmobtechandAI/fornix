import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// GET /api/admin/seo - Get all SEO metadata configurations
export async function GET(req) {
  try {
    await ensureAdmin(req);

    const { data, error } = await supabase
      .from("seo_metadata")
      .select("*")
      .order("page_path", { ascending: true });

    if (error) throw error;

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Admin SEO GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT /api/admin/seo - Upsert SEO metadata for a specific path
// Body: { page_path, title, description, keywords, og_title, og_description, og_image, robots }
export async function PUT(req) {
  try {
    await ensureAdmin(req);
    const body = await req.json();
    const { 
      page_path, 
      title, 
      description, 
      keywords, 
      og_title, 
      og_description, 
      og_image, 
      robots 
    } = body;

    if (!page_path || !title) {
      return Response.json(
        { success: false, error: "page_path and title are required" },
        { status: 400 }
      );
    }

    const row = {
      page_path: page_path.trim(),
      title: title.trim(),
      description: description ? description.trim() : "",
      keywords: keywords ? keywords.trim() : "",
      og_title: og_title ? og_title.trim() : "",
      og_description: og_description ? og_description.trim() : "",
      og_image: og_image ? og_image.trim() : "",
      robots: robots ? robots.trim() : "index, follow",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("seo_metadata")
      .upsert(row, { onConflict: "page_path" })
      .select();

    if (error) throw error;

    return Response.json({ success: true, data: data[0] }, { status: 200 });
  } catch (err) {
    console.error("Admin SEO PUT error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/seo?page_path=... - Delete SEO metadata config for a path
export async function DELETE(req) {
  try {
    await ensureAdmin(req);
    const { searchParams } = new URL(req.url);
    const page_path = searchParams.get("page_path");

    if (!page_path) {
      return Response.json({ success: false, error: "page_path is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("seo_metadata")
      .delete()
      .eq("page_path", page_path);

    if (error) throw error;

    return Response.json({ success: true, message: "SEO record deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Admin SEO DELETE error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

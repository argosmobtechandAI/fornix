import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// GET /api/admin/cms?page=home  OR  ?page=<course_id>
export async function GET(req) {
  try {
    await ensureAdmin(req);
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");

    if (!page) {
      return Response.json({ success: false, error: "page is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("cms_content")
      .select("*")
      .eq("page_slug", page)
      .order("section_key", { ascending: true });

    if (error) throw error;

    // Return as both array and key-value map
    const map = {};
    (data || []).forEach(row => {
      map[row.section_key] = row.content;
    });

    return Response.json({ success: true, data, map }, { status: 200 });
  } catch (err) {
    console.error("CMS GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT /api/admin/cms — Bulk upsert content for a page
// Body: { page_slug: "home", sections: [{ section_key, content, content_type }] }
export async function PUT(req) {
  try {
    await ensureAdmin(req);
    const body = await req.json();
    const { page_slug, sections } = body;

    if (!page_slug || !sections || !Array.isArray(sections)) {
      return Response.json(
        { success: false, error: "page_slug and sections[] are required" },
        { status: 400 }
      );
    }

    // Upsert each section
    const rows = sections.map(s => ({
      page_slug,
      section_key: s.section_key,
      content: s.content || "",
      content_type: s.content_type || "text",
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("cms_content")
      .upsert(rows, { onConflict: "page_slug,section_key" })
      .select();

    if (error) throw error;

    return Response.json({ success: true, data, count: data.length }, { status: 200 });
  } catch (err) {
    console.error("CMS PUT error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

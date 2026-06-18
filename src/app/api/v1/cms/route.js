import { supabase } from "@/lib/supabaseAdmin";

// GET /api/v1/cms?page=home  OR  ?page=<course_id>
// Public endpoint — no auth required.
// Returns a key-value map of all content for the given page.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");

    if (!page) {
      return Response.json({ success: false, error: "page is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("cms_content")
      .select("section_key, content, content_type")
      .eq("page_slug", page);

    if (error) throw error;

    // Build key-value map for easy frontend consumption
    const content = {};
    (data || []).forEach(row => {
      content[row.section_key] = row.content;
    });

    return Response.json({ success: true, content }, { status: 200 });
  } catch (err) {
    console.error("Public CMS GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

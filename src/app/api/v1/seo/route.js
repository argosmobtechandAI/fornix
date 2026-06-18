import { supabase } from "@/lib/supabaseAdmin";

// GET /api/v1/seo?path=...
// Public endpoint — no auth required.
// Fetches the SEO metadata for a given path, with course wildcard and home fallbacks.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
      return Response.json({ success: false, error: "path is required" }, { status: 400 });
    }

    // 1. Try to find an exact match
    let { data, error } = await supabase
      .from("seo_metadata")
      .select("*")
      .eq("page_path", path)
      .maybeSingle();

    if (error) throw error;

    // 2. If no exact match and this is a course page route, check for a generic course wildcard template
    if (!data && path.startsWith("/courses/")) {
      const parts = path.split("/");
      // Path format is like "/courses/amc" or "/courses/neet-ug"
      if (parts.length === 3) {
        const { data: fallbackData, error: fbError } = await supabase
          .from("seo_metadata")
          .select("*")
          .eq("page_path", "/courses/:courseSlug")
          .maybeSingle();

        if (!fbError && fallbackData) {
          data = fallbackData;
          // Dynamically swap template placeholder with the course slug capitalized for title if needed
          const slug = parts[2];
          const capitalizedSlug = slug.toUpperCase().replace("-", " ");
          if (data.title && data.title.includes(":courseSlug")) {
            data.title = data.title.replace(/:courseSlug/g, capitalizedSlug);
          }
          if (data.description && data.description.includes(":courseSlug")) {
            data.description = data.description.replace(/:courseSlug/g, capitalizedSlug);
          }
          if (data.og_title && data.og_title.includes(":courseSlug")) {
            data.og_title = data.og_title.replace(/:courseSlug/g, capitalizedSlug);
          }
        }
      }
    }

    // 3. Fallback to homepage '/' SEO configuration if no specific config is found
    if (!data) {
      const { data: homeData, error: homeError } = await supabase
        .from("seo_metadata")
        .select("*")
        .eq("page_path", "/")
        .maybeSingle();

      if (!homeError && homeData) {
        data = homeData;
      }
    }

    // Allow CORS for the frontend domain
    return Response.json(
      { success: true, data }, 
      { 
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      }
    );
  } catch (err) {
    console.error("Public SEO GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// OPTIONS route to handle CORS preflight request
export async function OPTIONS() {
  return Response.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

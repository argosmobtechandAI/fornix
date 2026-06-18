import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let path = searchParams.get("path") || "/";

    // Standardize path formatting: ensure it starts with / and doesn't end with slash (except root)
    if (!path.startsWith("/")) {
      path = "/" + path;
    }
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    // 1. Try to find an exact match in seo_metadata
    let { data: seo, error } = await supabase
      .from("seo_metadata")
      .select("*")
      .eq("page_path", path)
      .maybeSingle();

    if (error) throw error;

    // 2. If no exact match and this is a course page route, check for a generic course wildcard template
    if (!seo && path.startsWith("/courses/")) {
      const parts = path.split("/");
      if (parts.length === 3) {
        const { data: fallbackData, error: fbError } = await supabase
          .from("seo_metadata")
          .select("*")
          .eq("page_path", "/courses/:courseSlug")
          .maybeSingle();

        if (!fbError && fallbackData) {
          seo = fallbackData;
          // Dynamically swap template placeholder with the course slug capitalized
          const slug = parts[2];
          const capitalizedSlug = slug.toUpperCase().replace("-", " ");
          if (seo.title && seo.title.includes(":courseSlug")) {
            seo.title = seo.title.replace(/:courseSlug/g, capitalizedSlug);
          }
          if (seo.description && seo.description.includes(":courseSlug")) {
            seo.description = seo.description.replace(/:courseSlug/g, capitalizedSlug);
          }
          if (seo.og_title && seo.og_title.includes(":courseSlug")) {
            seo.og_title = seo.og_title.replace(/:courseSlug/g, capitalizedSlug);
          }
        }
      }
    }

    // 3. Fallback to homepage '/' SEO configuration if no specific config is found
    if (!seo) {
      const { data: homeData, error: homeError } = await supabase
        .from("seo_metadata")
        .select("*")
        .eq("page_path", "/")
        .maybeSingle();

      if (!homeError && homeData) {
        seo = homeData;
      }
    }

    // If still no metadata found (e.g. table empty), prepare dummy defaults
    const finalSeo = seo || {
      title: "Fornix Academy | Premier Medical Exam Preparation",
      description: "Fornix Academy offers next-generation clinical question banks, interactive smart tutoring, podcasts, and mock tests for global medical licensing exams.",
      keywords: "medical exam prep, clinical questions, AMC CAT, PLAB 1, NEET PG, FMGE, medical coaching",
      og_title: "Fornix Academy | Medical Exam Prep",
      og_description: "Prepare for AMC CAT MCQ, PLAB 1, FMGE, and NEET PG with high-yield clinical questions and smart analytics.",
      robots: "index, follow",
      og_image: ""
    };

    // Ensure absolute image URL
    let ogImage = finalSeo.og_image || "";
    if (ogImage) {
      ogImage = ogImage.trim();
      if (!ogImage.startsWith("http://") && !ogImage.startsWith("https://")) {
        const cleanPath = ogImage.startsWith("/") ? ogImage : `/${ogImage}`;
        ogImage = `https://fornixacademy.com${cleanPath}`;
      }
    } else {
      ogImage = "https://fornixacademy.com/favicon.png";
    }

    // Construct the HTML response for the crawler
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(finalSeo.title)}</title>
  <meta name="description" content="${escapeHtml(finalSeo.description || "")}">
  <meta name="keywords" content="${escapeHtml(finalSeo.keywords || "")}">
  <meta name="robots" content="${escapeHtml(finalSeo.robots || "index, follow")}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:title" content="${escapeHtml(finalSeo.og_title || finalSeo.title)}">
  <meta property="og:description" content="${escapeHtml(finalSeo.og_description || finalSeo.description || "")}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://fornixacademy.com${path}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(finalSeo.og_title || finalSeo.title)}">
  <meta name="twitter:description" content="${escapeHtml(finalSeo.og_description || finalSeo.description || "")}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  
  <!-- Automatic Redirect for Real Browsers -->
  <meta http-equiv="refresh" content="0;url=https://fornixacademy.com${path}">
  <script type="text/javascript">
    window.location.href = "https://fornixacademy.com${path}";
  </script>
</head>
<body>
  <p>Redirecting to <a href="https://fornixacademy.com${path}">https://fornixacademy.com${path}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
      }
    });

  } catch (err) {
    console.error("Crawler Render API error:", err);
    return new Response(`Error rendering metadata: ${escapeHtml(err.message)}`, {
      status: 500,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  }
}

// OPTIONS route to handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

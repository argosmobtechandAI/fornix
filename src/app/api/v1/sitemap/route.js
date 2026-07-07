import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const baseUrl = "https://fornixacademy.com";
    
    // Fetch courses
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("*");
      
    // Fetch blogs
    const { data: blogs, error: blogsError } = await supabase
      .from("blogs")
      .select("slug")
      .eq("is_published", true);

    if (coursesError) console.error("Error fetching courses for sitemap:", coursesError);
    if (blogsError) console.error("Error fetching blogs for sitemap:", blogsError);

    // Default static routes
    const staticRoutes = [
      "/",
      "/about",
      "/blogs",
      "/contact",
      "/pricing",
      "/terms-and-conditions",
      "/privacy-policy",
      "/refund-policy",
      "/login",
      "/signup",
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Keep track of added URLs to avoid duplicates
    const addedUrls = new Set();

    const addUrl = (path, priority, changefreq = "weekly") => {
      // Avoid duplicate paths
      const normalizedPath = path.toLowerCase();
      if (addedUrls.has(normalizedPath)) return;
      addedUrls.add(normalizedPath);

      xml += `
  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    };

    // Add static routes
    staticRoutes.forEach((route) => {
      addUrl(route, route === '/' ? '1.0' : '0.8', 'daily');
    });

    // Add explicitly requested route
    addUrl("/courses/Nursing", "0.9", "weekly");

    // Add dynamic course routes
    if (courses) {
      courses.forEach((course) => {
        // Fallback to auto-generated slug if migration hasn't been run
        const slug = course.slug || course.name.toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
        addUrl(`/courses/${slug}`, '0.9');
      });
    }

    // Add dynamic blog routes
    if (blogs) {
      blogs.forEach((blog) => {
        if (!blog.slug) return;
        addUrl(`/blogs/${blog.slug}`, '0.8');
      });
    }

    xml += `\n</urlset>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

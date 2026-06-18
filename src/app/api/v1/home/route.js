import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("course_id");

    // Fetch all active banners
    let bannersQuery = supabase
      .from("banners")
      .select("*")
      .eq("status", true);

    if (courseId) {
      bannersQuery = bannersQuery.eq("course_id", courseId);
    } else {
      bannersQuery = bannersQuery.order("created_at", { ascending: false });
    }

    const { data: banners, error: bannerError } = await bannersQuery;

    if (bannerError) {
      return Response.json(
        { success: false, error: bannerError.message },
        { status: 500 }
      );
    }

    // Fetch all active testimonials
    let testimonialsQuery = supabase
      .from("testimonials")
      .select("*")
      .eq("status", true);

    if (courseId) {
      testimonialsQuery = testimonialsQuery.eq("course_id", courseId);
    } else {
      testimonialsQuery = testimonialsQuery.order("created_at", { ascending: false });
    }

    const { data: testimonials, error: testimonialError } = await testimonialsQuery;

    if (testimonialError) {
      return Response.json(
        { success: false, error: testimonialError.message },
        { status: 500 }
      );
    }

    // Optional: fetch course tutorial/ads video for this course
    let courseVideoUrl = null;
    if (courseId) {
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .select("id, tutorial_video_url")
        .eq("id", courseId)
        .maybeSingle();

      if (!courseErr && course) {
        courseVideoUrl = course.tutorial_video_url || null;
      }
    }

    // Final response
    return Response.json({
      success: true,
      banners,
      testimonials,
      course_video_url: courseVideoUrl,
    });

  } catch (err) {
    return Response.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}

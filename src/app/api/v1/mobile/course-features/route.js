import { supabase } from "@/lib/supabaseAdmin";

// POST /api/v1/mobile/course-features
// Body: { course_id }
// Returns: enabled/disabled flags for all 6 features for this course
export async function POST(req) {
  try {
    const { course_id } = await req.json();

    if (!course_id) {
      return Response.json(
        { success: false, error: "course_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("course_features")
      .select(
        "course_id, premium_plan, ccd_podcast, viva, kbc, smart_tracking, t_and_d"
      )
      .eq("course_id", course_id)
      .maybeSingle();

    if (error) throw error;

    const features = {
      premium_plan: !!data?.premium_plan,
      ccd_podcast: !!data?.ccd_podcast,
      viva: !!data?.viva,
      kbc: !!data?.kbc,
      smart_tracking: !!data?.smart_tracking,
      t_and_d: !!data?.t_and_d,
    };

    const featureList = [
      { key: "premium_plan", label: "Premium Plan", enabled: features.premium_plan },
      { key: "ccd_podcast", label: "CCD Podcast", enabled: features.ccd_podcast },
      { key: "viva", label: "Viva", enabled: features.viva },
      { key: "kbc", label: "KBC", enabled: features.kbc },
      { key: "smart_tracking", label: "Smart Tracking", enabled: features.smart_tracking },
      { key: "t_and_d", label: "T & D", enabled: features.t_and_d },
    ];

    return Response.json(
      {
        success: true,
        course_id,
        features,
        feature_list: featureList,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Mobile course-features error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

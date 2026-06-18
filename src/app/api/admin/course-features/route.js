import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// GET /api/admin/course-features
// Returns all courses with their feature flags (if any)
export async function GET(req) {
  try {
    await ensureAdmin(req);

    const { data: courses, error: cErr } = await supabase
      .from("courses")
      .select("id, name, description")
      .order("created_at", { ascending: false });

    if (cErr) throw cErr;

    const courseIds = (courses || []).map((c) => c.id);

    let featuresByCourse = new Map();
    if (courseIds.length > 0) {
      const { data: features, error: fErr } = await supabase
        .from("course_features")
        .select("course_id, premium_plan, ccd_podcast, viva, kbc, smart_tracking, t_and_d")
        .in("course_id", courseIds);

      if (fErr) throw fErr;

      for (const f of features || []) {
        featuresByCourse.set(f.course_id, f);
      }
    }

    const data = (courses || []).map((c) => {
      const f = featuresByCourse.get(c.id) || {};
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        features: {
          premium_plan: !!f.premium_plan,
          ccd_podcast: !!f.ccd_podcast,
          viva: !!f.viva,
          kbc: !!f.kbc,
          smart_tracking: !!f.smart_tracking,
          t_and_d: !!f.t_and_d,
        },
      };
    });

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Course features GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/admin/course-features
// Body: { course_id, features: { premium_plan, ccd_podcast, viva, kbc, smart_tracking, t_and_d } }
// Upserts feature flags for a course
export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();
    const { course_id, features } = body || {};

    if (!course_id || !features) {
      return Response.json(
        { success: false, error: "course_id and features are required" },
        { status: 400 }
      );
    }

    const payload = {
      course_id,
      premium_plan: !!features.premium_plan,
      ccd_podcast: !!features.ccd_podcast,
      viva: !!features.viva,
      kbc: !!features.kbc,
      smart_tracking: !!features.smart_tracking,
      t_and_d: !!features.t_and_d,
    };

    const { data, error } = await supabase
      .from("course_features")
      .upsert(payload, { onConflict: "course_id" })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Course features POST error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

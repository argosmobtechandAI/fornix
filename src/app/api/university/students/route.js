import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return Response.json(
        { success: false, error: "Invalid token" },
        { status: 401 },
      );
    }

    if (decoded.role !== "university") {
      return Response.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const userId = decoded.sub;

    // 1. Get the university profile
    const { data: profile, error: profileErr } = await supabase
      .from("university_profiles")
      .select("id, max_students, assigned_courses")
      .eq("user_id", userId)
      .single();

    if (profileErr || !profile) {
      return Response.json(
        { success: false, error: "University profile not found" },
        { status: 404 },
      );
    }

    // 2. Resolve assigned plans details
    let assignedPlansData = [];
    if (profile.assigned_courses && profile.assigned_courses.length > 0) {
      const { data: plansData } = await supabase
        .from("plans")
        .select(`
          id, 
          name, 
          course_id, 
          duration_in_days,
          courses ( name )
        `)
        .in("id", profile.assigned_courses);

      if (plansData) {
        // Flatten the course name for easier access in the frontend
        assignedPlansData = plansData.map(plan => ({
          ...plan,
          course_name: plan.courses?.name || "Unknown Course"
        }));
      }
    }

    // 3. Get students under this university, including their active subscriptions
    const { data: students, error: studentsErr } = await supabase
      .from("users")
      .select(`
        id, full_name, email, phone, gender, created_at, is_active, role, academic_year,
        user_subscriptions (
            id,
            is_active,
            start_date,
            end_date,
            plans ( name ),
            courses ( name )
        )
      `)
      .eq("university_id", profile.id)
      .order("created_at", { ascending: false });

    // Format the subscription data for easier frontend consumption
    const formattedStudents = students ? students.map(student => {
      // Find active subscriptions
      const activeSubs = student.user_subscriptions?.filter(s => s.is_active) || [];
      return {
        ...student,
        active_subscriptions: activeSubs.map(sub => ({
          id: sub.id,
          plan_name: sub.plans?.name || "Unknown Plan",
          course_name: sub.courses?.name || "Unknown Course",
          start_date: sub.start_date,
          end_date: sub.end_date
        })),
        user_subscriptions: undefined // Remove bare nested tree to save payload size
      };
    }) : [];

    return Response.json({
      success: true,
      data: {
        students: formattedStudents,
        maxStudents: profile.max_students,
        assignedPlans: assignedPlansData,
      },
    });
  } catch (err) {
    console.error("Students Fetch Error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

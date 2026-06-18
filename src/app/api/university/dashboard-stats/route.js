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
      .select("id, university_name, max_students, assigned_courses, country, year_wise_limits")
      .eq("user_id", userId)
      .single();

    if (profileErr || !profile) {
      return Response.json(
        { success: false, error: "University profile not found" },
        { status: 404 },
      );
    }

    const universityId = profile.id;
    const maxStudents = profile.max_students;
    const assignedPlansCount = Array.isArray(profile.assigned_courses)
      ? profile.assigned_courses.length
      : 0;

    // 2. Get all students under this university
    const { data: students, error: studentsErr } = await supabase
      .from("users")
      .select(`
        id, full_name, email, phone, gender, created_at, is_active, academic_year,
        user_subscriptions (
          id, is_active, start_date, end_date,
          plans ( name ),
          courses ( name )
        )
      `)
      .eq("university_id", universityId)
      .order("created_at", { ascending: false });

    const allStudents = students || [];
    const enrolledStudentsCount = allStudents.length;
    const activeStudentsCount = allStudents.filter(s => s.is_active).length;
    const inactiveStudentsCount = enrolledStudentsCount - activeStudentsCount;

    // 3. Count active subscriptions
    let activeSubscriptionsCount = 0;
    let expiredSubscriptionsCount = 0;
    const now = new Date();

    allStudents.forEach(s => {
      const subs = s.user_subscriptions || [];
      subs.forEach(sub => {
        if (sub.is_active) {
          activeSubscriptionsCount++;
        }
        if (sub.end_date && new Date(sub.end_date) < now) {
          expiredSubscriptionsCount++;
        }
      });
    });

    // 4. Gender distribution
    const genderDistribution = { male: 0, female: 0, other: 0 };
    allStudents.forEach(s => {
      const g = (s.gender || "other").toLowerCase();
      if (g === "male") genderDistribution.male++;
      else if (g === "female") genderDistribution.female++;
      else genderDistribution.other++;
    });

    // 5. Recent students (last 5)
    const recentStudents = allStudents.slice(0, 5).map(s => ({
      id: s.id,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      gender: s.gender,
      is_active: s.is_active,
      academic_year: s.academic_year,
      created_at: s.created_at,
      active_plan: s.user_subscriptions?.find(sub => sub.is_active)
        ? {
          plan_name: s.user_subscriptions.find(sub => sub.is_active)?.plans?.name || "N/A",
          course_name: s.user_subscriptions.find(sub => sub.is_active)?.courses?.name || "N/A",
        }
        : null,
    }));

    // 6. Students joined this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const joinedThisMonth = allStudents.filter(s => new Date(s.created_at) >= startOfMonth).length;

    return Response.json({
      success: true,
      data: {
        universityName: profile.university_name,
        country: profile.country,
        maxStudents,
        assignedPlansCount,
        enrolledStudentsCount,
        activeStudentsCount,
        inactiveStudentsCount,
        activeSubscriptionsCount,
        expiredSubscriptionsCount,
        genderDistribution,
        recentStudents,
        joinedThisMonth,
      },
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

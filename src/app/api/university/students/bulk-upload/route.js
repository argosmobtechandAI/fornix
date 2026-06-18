import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/activityLogger";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function POST(req) {
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
    const body = await req.json();
    const { students, plan_id } = body;

    if (!plan_id) {
      return Response.json(
        { success: false, error: "Plan ID is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(students) || students.length === 0) {
      return Response.json(
        { success: false, error: "Students array is required" },
        { status: 400 },
      );
    }

    // 1. Get university profile to verify limits and access
    const { data: profile, error: profileErr } = await supabase
      .from("university_profiles")
      .select("id, max_students, assigned_courses, year_wise_limits")
      .eq("user_id", userId)
      .single();

    if (profileErr || !profile) {
      return Response.json(
        { success: false, error: "University profile not found" },
        { status: 404 },
      );
    }

    // Verify plan is authorized for this university
    if (
      !profile.assigned_courses ||
      !profile.assigned_courses.includes(plan_id)
    ) {
      return Response.json(
        {
          success: false,
          error: "University is not authorized to assign this plan",
        },
        { status: 403 },
      );
    }

    // 2. Fetch the corresponding course_id and duration for the plan
    const { data: selectedPlan } = await supabase
      .from("plans")
      .select("id, course_id, duration_in_days")
      .eq("id", plan_id)
      .single();

    if (!selectedPlan) {
      return Response.json(
        { success: false, error: "Invalid plan selected" },
        { status: 400 },
      );
    }

    const course_id = selectedPlan.course_id;
    const duration_in_days = selectedPlan.duration_in_days || 365;

    // Detect if this is an FMGE course
    const { data: courseData } = await supabase
      .from("courses")
      .select("id, name")
      .eq("id", course_id)
      .single();

    const isFMGE = courseData && courseData.name.toUpperCase().includes("FMGE");
    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year"];
    const yearWiseLimits = profile.year_wise_limits || {};
    const yearWiseCount = {}; // Track how many students per year in this batch

    // 3. Check current student count to enforce limits
    const { count: currentStudentsCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("university_id", profile.id);

    // We'll count how many NEW users we actually need to create
    // to do a proper limit check after processing

    // 4. Process students in a batch
    const created = [];
    const skipped = [];
    const errors = [];
    let newUsersCount = 0;

    for (const student of students) {
      const { full_name, email, phone, password, gender, academic_year } = student;

      // Validate required fields
      if (!full_name || !email || !phone || !password) {
        errors.push({
          email: email || "unknown",
          full_name: full_name || "unknown",
          error: "Missing required fields (name, email, phone, password)",
        });
        continue;
      }

      // FMGE-specific validation
      if (isFMGE) {
        if (!academic_year || !validYears.includes(academic_year)) {
          errors.push({
            email,
            full_name,
            error: `Invalid or missing academic_year for FMGE. Must be one of: ${validYears.join(", ")}`,
          });
          continue;
        }

        // Check year-wise limit
        const yearLimit = yearWiseLimits[academic_year] || 0;
        if (yearLimit > 0) {
          const currentYearCount = yearWiseCount[academic_year] || 0;
          // Count existing students for this year
          if (currentYearCount === 0) {
            const { count: existingYearCount } = await supabase
              .from("users")
              .select("*", { count: "exact", head: true })
              .eq("university_id", profile.id)
              .eq("academic_year", academic_year);
            yearWiseCount[academic_year] = existingYearCount || 0;
          }

          if ((yearWiseCount[academic_year] || 0) + 1 > yearLimit) {
            errors.push({
              email,
              full_name,
              error: `Year-wise limit exceeded for ${academic_year} (max: ${yearLimit})`,
            });
            continue;
          }
        }
      }

      // 4a. Check if email already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, university_id, course_id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        // User already exists — check if they already have this course subscription
        const { data: existingSub } = await supabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", existingUser.id)
          .eq("course_id", course_id)
          .eq("is_active", true)
          .maybeSingle();

        if (existingSub) {
          // Already enrolled in this course — skip
          skipped.push({
            email,
            full_name,
            reason: "Already enrolled in this course based on plan",
          });
          continue;
        }

        // User exists but NOT enrolled in this course — create subscription only
        // Also tag them to this university and course if not already tagged
        const updateData = {};
        if (!existingUser.university_id) updateData.university_id = profile.id;
        if (!existingUser.course_id) updateData.course_id = course_id;

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from("users")
            .update(updateData)
            .eq("id", existingUser.id);
        }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + duration_in_days);

        const { error: subErr } = await supabase
          .from("user_subscriptions")
          .insert([
            {
              user_id: existingUser.id,
              course_id: course_id,
              plan_id: plan_id,
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              is_active: true,
              auto_renew: false,
            },
          ]);

        if (subErr) {
          errors.push({
            email,
            full_name,
            error: "User exists but failed to assign course: " + (subErr?.message || JSON.stringify(subErr)),
          });
        } else {
          created.push({
            email,
            full_name,
            status: "existing_user_enrolled",
          });
        }
        continue;
      }

      // 4b. New user — check limit before creating
      if (
        (currentStudentsCount || 0) + newUsersCount + 1 >
        profile.max_students
      ) {
        errors.push({
          email,
          full_name,
          error: `Exceeds maximum student limit of ${profile.max_students}`,
        });
        continue;
      }

      // 4c. Create new user
      const password_hash = await bcrypt.hash(password, 10);
      const { data: newUser, error: createErr } = await supabase
        .from("users")
        .insert([
          {
            full_name,
            email: email.toLowerCase(),
            phone: phone || null,
            gender: gender || "other",
            password_hash,
            role: "user",
            university_id: profile.id,
            course_id: course_id,
            is_active: true,
            academic_year: isFMGE ? academic_year : null,
          },
        ])
        .select()
        .single();

      if (createErr || !newUser) {
        errors.push({
          email,
          full_name,
          error: createErr?.message || "Failed to create user",
        });
        continue;
      }

      newUsersCount++;
      if (isFMGE && academic_year) {
        yearWiseCount[academic_year] = (yearWiseCount[academic_year] || 0) + 1;
      }

      // 4d. Create course subscription with plan duration
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration_in_days);

      const { error: subErr } = await supabase
        .from("user_subscriptions")
        .insert([
          {
            user_id: newUser.id,
            course_id: course_id,
            plan_id: plan_id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            is_active: true,
            auto_renew: false,
          },
        ]);

      if (subErr) {
        errors.push({
          email,
          full_name,
          error: "User created but failed to assign course: " + (subErr?.message || JSON.stringify(subErr)),
        });
      } else {
        created.push({
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          status: "new_user_created",
        });

        // Send welcome push to newly created student
        sendPushNotification(
          newUser.id,
          "Welcome to Fornix! 🎉",
          "Your account has been created by your university. Start learning now!",
          "course"
        ).catch(e => console.error("Bulk Upload Push Failed:", e));
      }
    }

    if (created.length === 0 && skipped.length === 0 && errors.length > 0) {
      return Response.json(
        {
          success: false,
          error: "Failed to process any students",
          details: { created, skipped, errors },
        },
        { status: 400 },
      );
    }

    return Response.json({
      success: true,
      data: {
        created,
        skipped,
        errors,
        summary: {
          total: students.length,
          created: created.length,
          skipped: skipped.length,
          failed: errors.length,
        },
      },
      message: `Processed ${students.length} students: ${created.length} enrolled, ${skipped.length} skipped, ${errors.length} failed`,
    });

    if (created.length > 0) {
      await logActivity(
        profile.id,
        "students_bulk_imported",
        `Bulk imported ${created.length} student(s) with plan ${selectedPlan.id}`,
        "bulk_import",
        null,
        { total: students.length, created: created.length, skipped: skipped.length, failed: errors.length }
      );
    }
  } catch (err) {
    console.error("Bulk Upload Error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// POST: Submit brochure download lead
export async function POST(req) {
  try {
    const body = await req.json();

    const { name, phone, country_code, email, course_id, city } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }
    if (!course_id) {
      return NextResponse.json(
        { success: false, error: "Please select a course" },
        { status: 400 }
      );
    }
    if (!city || !city.trim()) {
      return NextResponse.json(
        { success: false, error: "City/State is required" },
        { status: 400 }
      );
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Fetch the selected course brochure URL
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("id, name, brochure_url")
      .eq("id", course_id)
      .single();

    if (courseErr || !course) {
      return NextResponse.json(
        { success: false, error: "Selected course not found" },
        { status: 404 }
      );
    }

    // Save lead to brochure_leads table
    const { error: insertErr } = await supabase.from("brochure_leads").insert([
      {
        name: name.trim(),
        phone: phone.trim(),
        country_code: country_code || "+91",
        email: email.trim().toLowerCase(),
        course_id,
        city: city.trim(),
        created_at: new Date().toISOString(),
      },
    ]);

    // Don't block the user if DB insert fails — just log
    if (insertErr) {
      console.error("brochure_leads insert error:", insertErr.message);
    }

    return NextResponse.json({
      success: true,
      brochure_url: course.brochure_url,
      course_name: course.name,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// GET: Admin - get all brochure leads
export async function GET(req) {
  try {
    const { data, error } = await supabase
      .from("brochure_leads")
      .select("*, courses(name)")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

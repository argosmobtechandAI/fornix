import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { logActivity } from "@/lib/activityLogger";

// Helper to authenticate and get university profile ID
async function authenticateUniversity(req) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) throw new Error("Unauthorized");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "university") throw new Error("Forbidden");

    const { data: profile, error } = await supabase
        .from("university_profiles")
        .select("id")
        .eq("user_id", decoded.sub)
        .single();

    if (error || !profile) throw new Error("Profile not found");
    return profile.id;
}

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const { full_name, email, phone, gender, password } = await req.json();

        let universityProfileId;
        try {
            universityProfileId = await authenticateUniversity(req);
        } catch (e) {
            if (e.message === "Unauthorized") return Response.json({ success: false, error: e.message }, { status: 401 });
            if (e.message === "Forbidden") return Response.json({ success: false, error: e.message }, { status: 403 });
            return Response.json({ success: false, error: "Authentication failed" }, { status: 500 });
        }

        if (!id) return Response.json({ success: false, error: "Student ID required" }, { status: 400 });

        // Verify the student belongs to this university
        const { data: student, error: fetchErr } = await supabase
            .from("users")
            .select("id, university_id")
            .eq("id", id)
            .single();

        if (fetchErr || !student) {
            return Response.json({ success: false, error: "Student not found" }, { status: 404 });
        }

        if (student.university_id !== universityProfileId) {
            return Response.json({ success: false, error: "Not authorized to edit this student" }, { status: 403 });
        }

        // Prepare update payload
        const updateData = {};
        if (full_name !== undefined) {
            if (!full_name || full_name.trim().length < 2) return Response.json({ success: false, error: "Valid name required" }, { status: 422 });
            updateData.full_name = full_name;
        }

        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) return Response.json({ success: false, error: "Valid email required" }, { status: 422 });

            // Duplicate check
            const { data: emailExists } = await supabase.from("users").select("id").eq("email", email).neq("id", id).maybeSingle();
            if (emailExists) return Response.json({ success: false, error: "Email already in use" }, { status: 409 });
            updateData.email = email;
        }

        if (phone !== undefined) {
            updateData.phone = phone; // Accepting empty phone or new phone
        }

        if (gender !== undefined) {
            updateData.gender = gender;
        }

        if (password) {
            if (password.length < 6) return Response.json({ success: false, error: "Password must be at least 6 characters" }, { status: 422 });
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return Response.json({ success: false, error: "No fields to update" }, { status: 400 });
        }

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", id)
            .select("id, full_name, email, phone, gender, created_at, is_active")
            .single();

        if (error) throw error;

        await logActivity(universityProfileId, "student_edited", `Edited student: ${data.full_name} (${Object.keys(updateData).filter(k => k !== 'updated_at').join(', ')})`, "student", id);

        return Response.json({ success: true, user: data });

    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

import { supabase } from "@/lib/supabaseAdmin";

// PUT: Update an existing university profile
export async function PUT(req, { params }) {
    try {
        const { id } = await params; // This is the ID of the university_profiles table
        const body = await req.json();
        const {
            university_name,
            country,
            max_students,
            contact_details,
            assigned_courses,
            is_active,
            year_wise_limits,
        } = body;

        // We only update the profile fields here.
        // If we need to update the User email or password, it requires a different endpoint/logic.
        const { data: profile, error } = await supabase
            .from("university_profiles")
            .update({
                university_name,
                country,
                max_students: Number(max_students) || 50,
                contact_details,
                assigned_courses: Array.isArray(assigned_courses) ? assigned_courses : [],
                year_wise_limits: year_wise_limits || null,
                is_active: typeof is_active === "boolean" ? is_active : true,
            })
            .eq("id", id)
            .select()
            .single();

        if (error || !profile) {
            return Response.json(
                { success: false, error: error?.message || "Failed to update university" },
                { status: 500 }
            );
        }

        // Attempt to sync the `is_active` state to the User record as well
        if (typeof is_active === "boolean") {
            await supabase
                .from("users")
                .update({ is_active })
                .eq("id", profile.user_id);
        }

        return Response.json({ success: true, message: "University updated successfully", data: profile });
    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

// DELETE: Deactivate a university profile
export async function DELETE(req, { params }) {
    try {
        const { id } = await params;

        const { data: profile, error: fetchErr } = await supabase
            .from("university_profiles")
            .select("user_id")
            .eq("id", id)
            .single();

        if (fetchErr || !profile) {
            return Response.json({ success: false, error: "University not found" }, { status: 404 });
        }

        // Instead of completely deleting, we usually just deactivate to keep student records intact.
        // However, if the user requested DELETE, we'll mark is_active = false
        const { error: updateErr1 } = await supabase
            .from("university_profiles")
            .update({ is_active: false })
            .eq("id", id);

        const { error: updateErr2 } = await supabase
            .from("users")
            .update({ is_active: false })
            .eq("id", profile.user_id);

        if (updateErr1 || updateErr2) {
            return Response.json({ success: false, error: "Failed to deactivate university" }, { status: 500 });
        }

        return Response.json({ success: true, message: "University deactivated successfully" });
    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";

// GET: List all university profiles with their associated user data
export async function GET(req) {
    try {
        const { data: universities, error } = await supabase
            .from("university_profiles")
            .select(`
        *,
        user:users!user_id (
          email,
          phone,
          full_name,
          is_active
        )
      `)
            .order("created_at", { ascending: false });

        if (error) {
            return Response.json({ success: false, error: error.message }, { status: 500 });
        }

        return Response.json({ success: true, data: universities });
    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST: Create a new university profile + user
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            university_name,
            country,
            max_students,
            contact_details,
            assigned_courses, // Expect an array of course IDs
            email,
            password,
            year_wise_limits, // Optional JSONB for FMGE year-wise student limits
        } = body;

        // 1. Validate required fields
        if (!university_name || !country || !email || !password) {
            return Response.json(
                { success: false, error: "Missing required fields (name, country, email, password)" },
                { status: 400 }
            );
        }

        // 2. Check if email already exists
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existingUser) {
            return Response.json(
                { success: false, error: "Email already registered across the platform" },
                { status: 409 }
            );
        }

        // 3. Hash the password
        const password_hash = await bcrypt.hash(password, 10);

        // 4. Create User Record in our custom 'users' table
        // We set role="university"
        const { data: newUser, error: userError } = await supabase
            .from("users")
            .insert([
                {
                    full_name: university_name,
                    email: email.toLowerCase(),
                    password_hash,
                    role: "university",
                    is_active: true,
                    phone: contact_details || null, // Best effort fallback
                },
            ])
            .select()
            .single();

        if (userError || !newUser) {
            return Response.json(
                { success: false, error: userError?.message || "Failed to create user" },
                { status: 500 }
            );
        }

        // 5. Create the University Profile record mapping to this user
        const { data: profile, error: profileError } = await supabase
            .from("university_profiles")
            .insert([
                {
                    user_id: newUser.id,
                    university_name,
                    country,
                    max_students: Number(max_students) || 50,
                    contact_details,
                    assigned_courses: Array.isArray(assigned_courses) ? assigned_courses : [],
                    year_wise_limits: year_wise_limits || null,
                    is_active: true,
                },
            ])
            .select()
            .single();

        if (profileError || !profile) {
            // Rollback the user creation if profile fails
            await supabase.from("users").delete().eq("id", newUser.id);
            return Response.json(
                { success: false, error: profileError?.message || "Failed to create university profile" },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            message: "University successfully created",
            data: profile,
        });
    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

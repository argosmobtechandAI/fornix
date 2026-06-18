import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

function getToken(req) {
    const auth = req.headers.get("authorization");
    if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
    const cookie = req.headers.get("cookie");
    if (!cookie) return null;
    const match = cookie.split("; ").find((c) => c.startsWith("token="));
    return match ? match.split("=")[1] : null;
}

export async function GET(req) {
    try {
        const token = getToken(req);
        if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "university") {
            return NextResponse.json({ success: false, error: "Forbidden: Universities only" }, { status: 403 });
        }

        // 1. Fetch core user authentication / contact details first
        const { data: user, error: userErr } = await supabase
            .from("users")
            .select("email, full_name, phone")
            .eq("id", decoded.sub)
            .single();

        if (userErr || !user) {
            return NextResponse.json({ success: false, error: "Authentication record not found" }, { status: 404 });
        }

        // 2. Fetch the university specific details safely (without outer joined syntax)
        const { data: profile, error } = await supabase
            .from("university_profiles")
            .select("id, university_name, country, contact_details, logo_url, assigned_courses, max_students")
            .eq("user_id", decoded.sub)
            .maybeSingle(); // maybeSingle so it doesn't throw 406 if no profile

        // 3. Respond with data
        if (error || !profile) {
            // Fallback: If profile isn't fully created yet, return basic details from the users table.
            return NextResponse.json({
                success: true,
                data: {
                    university_name: user.full_name || "",
                    country: "",
                    contact_details: user.phone || "",
                    logo_url: null,
                    email: user.email || ""
                }
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                ...profile,
                email: user.email || ""
            }
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message || "Unauthorized" }, { status: 401 });
    }
}

export async function PUT(req) {
    try {
        const token = getToken(req);
        if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "university") {
            return NextResponse.json({ success: false, error: "Forbidden: Universities only" }, { status: 403 });
        }

        const formData = await req.formData();

        const contact_details = formData.get("contact_details");
        const password = formData.get("password");
        const email = formData.get("email");
        const newLogo = formData.get("logo");

        // 1. Get current profile to find existing logo
        const { data: existingProfile } = await supabase
            .from("university_profiles")
            .select("id, logo_url")
            .eq("user_id", decoded.sub)
            .maybeSingle();

        let logo_url = existingProfile?.logo_url || null;

        // 2. Handle Logo Upload if present
        if (newLogo && newLogo.name) {
            // Optional: delete old logo if it exists
            if (logo_url && logo_url.includes("/storage/v1/object/public/media/")) {
                const oldPath = logo_url.split("/storage/v1/object/public/media/")[1];
                if (oldPath) await supabase.storage.from("media").remove([oldPath]);
            }

            const ext = newLogo.name.split(".").pop();
            const fileName = `university_logos/${decoded.sub}_${Date.now()}.${ext}`;
            const fileBuffer = Buffer.from(await newLogo.arrayBuffer());

            const { error: uploadError } = await supabase.storage
                .from("media")
                .upload(fileName, fileBuffer, {
                    contentType: newLogo.type,
                });

            if (uploadError) {
                return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
            }

            const { data: urlData } = supabase.storage
                .from("media")
                .getPublicUrl(fileName);

            logo_url = urlData.publicUrl;
        }

        // 3. Update University Profile table
        let profileUpdatePayload = {
            updated_at: new Date().toISOString()
        };

        if (contact_details) profileUpdatePayload.contact_details = contact_details;
        profileUpdatePayload.logo_url = logo_url;

        if (existingProfile) {
            const { error: updateProfileErr } = await supabase
                .from("university_profiles")
                .update(profileUpdatePayload)
                .eq("user_id", decoded.sub);

            if (updateProfileErr) {
                return NextResponse.json({ success: false, error: "Failed to update profile details" }, { status: 500 });
            }
        } else {
            profileUpdatePayload.user_id = decoded.sub;
            const { error: insertProfileErr } = await supabase
                .from("university_profiles")
                .insert([profileUpdatePayload]);

            if (insertProfileErr) {
                return NextResponse.json({ success: false, error: "Failed to create profile details" }, { status: 500 });
            }
        }

        let userUpdatePayload = {
            updated_at: new Date().toISOString()
        };

        if (email) {
            userUpdatePayload.email = email.toLowerCase();
        }

        if (password && password.trim().length > 0) {
            userUpdatePayload.password_hash = await bcrypt.hash(password, 10);
        }

        if (Object.keys(userUpdatePayload).length > 1) { // More than just updated_at
            const { error: updateUserErr } = await supabase
                .from("users")
                .update(userUpdatePayload)
                .eq("id", decoded.sub);

            if (updateUserErr) {
                return NextResponse.json({ success: false, error: "Failed to update user credentials" }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, message: "Profile updated successfully", logo_url });

    } catch (err) {
        return NextResponse.json({ success: false, error: err.message || "Update failed" }, { status: 500 });
    }
}

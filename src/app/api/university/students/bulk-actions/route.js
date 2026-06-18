import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/activityLogger";
import { sendPushNotification } from "@/lib/pushNotifications";

async function getUniversityProfile() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) throw { status: 401, message: "Unauthorized" };

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        throw { status: 401, message: "Invalid token" };
    }

    if (decoded.role !== "university") throw { status: 403, message: "Forbidden" };

    const { data: profile, error } = await supabase
        .from("university_profiles")
        .select("id")
        .eq("user_id", decoded.sub)
        .single();

    if (error || !profile) throw { status: 404, message: "University profile not found" };
    return profile;
}

// POST: Bulk suspend students
export async function POST(req) {
    try {
        const profile = await getUniversityProfile();
        const { student_ids, action } = await req.json();

        if (!Array.isArray(student_ids) || student_ids.length === 0) {
            return Response.json({ success: false, error: "No students selected" }, { status: 400 });
        }

        if (action === "suspend") {
            // Suspend: set is_active = false
            const { error } = await supabase
                .from("users")
                .update({ is_active: false })
                .in("id", student_ids)
                .eq("university_id", profile.id);

            if (error) throw error;

            // Get names for logging
            const { data: names } = await supabase
                .from("users")
                .select("full_name")
                .in("id", student_ids);

            const nameList = names?.map(n => n.full_name).join(", ") || `${student_ids.length} students`;

            await logActivity(
                profile.id,
                "students_bulk_suspended",
                `Suspended ${student_ids.length} student(s): ${nameList}`,
                "student",
                student_ids.join(","),
                { count: student_ids.length }
            );

            // Notify each suspended student
            for (const sid of student_ids) {
                sendPushNotification(
                    sid,
                    "Account Suspended ⚠️",
                    "Your account has been suspended by your university. Please contact your university for more details.",
                    "profile"
                ).catch(e => console.error("Suspend Push Failed:", e));
            }

            return Response.json({ success: true, message: `${student_ids.length} student(s) suspended` });

        } else if (action === "delete") {
            // Get names before deleting
            const { data: names } = await supabase
                .from("users")
                .select("full_name")
                .in("id", student_ids)
                .eq("university_id", profile.id);

            const nameList = names?.map(n => n.full_name).join(", ") || `${student_ids.length} students`;

            // Delete subscriptions first
            await supabase
                .from("user_subscriptions")
                .delete()
                .in("user_id", student_ids);

            // Delete students
            const { error } = await supabase
                .from("users")
                .delete()
                .in("id", student_ids)
                .eq("university_id", profile.id);

            if (error) throw error;

            await logActivity(
                profile.id,
                "students_bulk_deleted",
                `Permanently deleted ${student_ids.length} student(s): ${nameList}`,
                "student",
                student_ids.join(","),
                { count: student_ids.length }
            );

            return Response.json({ success: true, message: `${student_ids.length} student(s) deleted` });

        } else if (action === "activate") {
            const { error } = await supabase
                .from("users")
                .update({ is_active: true })
                .in("id", student_ids)
                .eq("university_id", profile.id);

            if (error) throw error;

            const { data: names } = await supabase
                .from("users")
                .select("full_name")
                .in("id", student_ids);

            const nameList = names?.map(n => n.full_name).join(", ") || `${student_ids.length} students`;

            await logActivity(
                profile.id,
                "students_bulk_activated",
                `Activated ${student_ids.length} student(s): ${nameList}`,
                "student",
                student_ids.join(","),
                { count: student_ids.length }
            );

            // Notify each activated student
            for (const sid of student_ids) {
                sendPushNotification(
                    sid,
                    "Account Activated ✅",
                    "Your account has been activated by your university. You can now access all your courses!",
                    "profile"
                ).catch(e => console.error("Activate Push Failed:", e));
            }

            return Response.json({ success: true, message: `${student_ids.length} student(s) activated` });

        } else {
            return Response.json({ success: false, error: "Invalid action. Use 'suspend', 'activate', or 'delete'" }, { status: 400 });
        }

    } catch (err) {
        const status = err.status || 500;
        return Response.json({ success: false, error: err.message }, { status });
    }
}

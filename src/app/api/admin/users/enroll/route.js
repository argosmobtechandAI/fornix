import { supabase } from "@/lib/supabaseAdmin";
import { sendPushNotification } from "@/lib/pushNotifications";

/**
 * Helper to insert payment resiliently (auto-drop unknown columns)
 */
async function insertPaymentWithSchemaFallback(initialPayload) {
    const payload = { ...(initialPayload || {}) };
    const maxAttempts = 8;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const { data, error } = await supabase
            .from("payments")
            .insert([payload])
            .select()
            .single();

        if (!error) return { data, error: null };

        const msg = String(error.message || "");
        const m = msg.match(/Could not find the '([^']+)' column of 'payments'/i);
        if (m && m[1]) {
            const missingCol = m[1];
            delete payload[missingCol];
            continue;
        }

        return { data: null, error };
    }

    return { data: null, error: new Error("Failed to insert payment: schema mismatch persist") };
}

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            user_id,
            plan_id,
            course_id,
            amount,
            payment_date,
            transaction_mode,
            transaction_id,
            full_name,
            email,
            phone,
            gender,
            institute
        } = body;

        if (!user_id || !plan_id || !course_id) {
            return Response.json(
                { success: false, error: "Missing required fields (user_id, plan_id, course_id)" },
                { status: 400 }
            );
        }

        // 1. Verify User Exists
        const { data: user, error: userErr } = await supabase
            .from("users")
            .select("id, full_name, email, phone")
            .eq("id", user_id)
            .single();

        if (userErr || !user) {
            return Response.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Update user details if any provided
        if (full_name || phone || email || gender || institute !== undefined) {
            const updatePayload = {};
            if (full_name) updatePayload.full_name = full_name;
            if (phone) updatePayload.phone = phone;
            if (email) updatePayload.email = email;
            if (gender) updatePayload.gender = gender;
            if (institute !== undefined) updatePayload.institute = institute;

            if (Object.keys(updatePayload).length > 0) {
                await supabase.from("users").update(updatePayload).eq("id", user_id);
                // Also update the in-memory user object for remaining steps if needed
                Object.assign(user, updatePayload);
            }
        }

        // 2. Fetch Plan
        const { data: plan, error: planErr } = await supabase
            .from("plans")
            .select("*")
            .eq("id", plan_id)
            .single();

        if (planErr || !plan) {
            return Response.json({ success: false, error: "Plan not found" }, { status: 404 });
        }

        // 3. Check for Active Subscription for this Course
        const now = new Date();
        const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", user_id)
            .eq("course_id", course_id)
            .neq("is_active", false)
            .gte("end_date", now.toISOString())
            .limit(1)
            .maybeSingle();

        if (existingSub) {
            return Response.json(
                { success: false, error: "User already has an active subscription for this course" },
                { status: 409 }
            );
        }

        // 4. Record Payment
        const finalAmount = amount !== undefined ? Number(amount) : Number(plan.price || 0);
        const payDate = payment_date ? new Date(payment_date) : new Date();

        const paymentPayload = {
            user_id: user.id,
            plan_id: plan.id,
            amount: finalAmount,
            transaction_mode: transaction_mode || "upi",
            transaction_status: "success",
            transaction_id: transaction_id || `ADMIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            payment_date: payDate.toISOString(),
            tax_amount: 0,
        };

        const { data: payData, error: payErr } = await insertPaymentWithSchemaFallback(paymentPayload);

        // 5. Create Subscription
        const startDate = payDate;
        const days = Number(plan.duration_in_days || 365);
        const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

        const subPayload = {
            user_id: user.id,
            plan_id: plan.id,
            course_id: plan.course_id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            is_active: true,
            auto_renew: false,
        };

        const { data: sub, error: subErr } = await supabase
            .from("user_subscriptions")
            .insert([subPayload])
            .select()
            .single();

        if (subErr) {
            return Response.json(
                { success: false, error: `Subscription failed: ${subErr.message}` },
                { status: 500 }
            );
        }

        // Send push notification to the enrolled student
        sendPushNotification(
            user.id,
            "Course Enrolled! 📚",
            `You have been enrolled in ${plan.name} by the Admin. Start learning now!`,
            "course"
        ).catch(e => console.error("Admin Enroll Push Failed:", e));

        return Response.json({
            success: true,
            message: "User enrolled successfully",
            user,
            enrollment: sub,
            payment: payData
        });

    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

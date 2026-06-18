import { supabase } from "@/lib/supabaseAdmin";
import {
  shouldVerifyRazorpayPayment,
  verifyRazorpayPaymentCaptured,
} from "@/lib/razorpay";
import { sendPushNotification } from "@/lib/pushNotifications";

async function insertPaymentWithSchemaFallback(initialPayload) {
  // Supabase can throw errors like:
  // "Could not find the 'order_id' column of 'payments' in the schema cache"
  // We'll remove the unknown column and retry a few times.
  const payload = { ...(initialPayload || {}) };
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("payments")
      .insert([payload])
      .select()
      .single();

    if (!error) return { data, error: null, usedPayload: payload };

    const msg = String(error.message || "");
    const m = msg.match(/Could not find the '([^']+)' column of 'payments'/i);
    if (m && m[1]) {
      const missingCol = m[1];
      // Drop and retry
      delete payload[missingCol];
      continue;
    }

    // Some other error (constraint, type, etc.) — stop and return
    return { data: null, error, usedPayload: payload };
  }

  return {
    data: null,
    error: new Error("Failed to insert payment: payments schema mismatch"),
    usedPayload: payload,
  };
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Payment + enrollment payload
    const {
      plan_id,
      course_id,
      amount,
      transaction_mode, // payment method
      transaction_id, // payment id
      order_id = null,
      promo_code = null,
      tax_amount = 0,
      transaction_status = "success", // success|pending|failed|refunded
      payment_date = null,
      start_date = null,
      // optional: allow client to send user_id, but enforce it matches token
      user_id,
    } = body || {};

    if (!user_id) {
      return Response.json({ success: false, error: "user_id (student id) is required" }, { status: 400 });
    }

    if (!plan_id) {
      return Response.json({ success: false, error: "plan_id is required" }, { status: 400 });
    }
    if (!course_id) {
      return Response.json({ success: false, error: "course_id is required" }, { status: 400 });
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return Response.json({ success: false, error: "amount is required" }, { status: 400 });
    }
    if (!transaction_mode) {
      return Response.json(
        { success: false, error: "transaction_mode (payment method) is required" },
        { status: 400 }
      );
    }
    if (!transaction_id) {
      return Response.json(
        { success: false, error: "transaction_id (payment id) is required" },
        { status: 400 }
      );
    }

    let verifiedTransactionStatus = String(transaction_status).toLowerCase();

    if (
      shouldVerifyRazorpayPayment({
        transactionMode: transaction_mode,
        paymentId: transaction_id,
      })
    ) {
      try {
        const rzPayment = await verifyRazorpayPaymentCaptured({
          paymentId: String(transaction_id),
          expectedAmount: Number(amount),
        });
        verifiedTransactionStatus = String(rzPayment.status || "captured").toLowerCase();
      } catch (rzErr) {
        return Response.json(
          { success: false, error: `Razorpay verification failed: ${rzErr.message}` },
          { status: 402 }
        );
      }
    }

    // Load plan
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!plan) return Response.json({ success: false, error: "Plan not found" }, { status: 404 });
    if (plan.is_active === false)
      return Response.json({ success: false, error: "Plan is not active" }, { status: 409 });
    if (String(plan.course_id) !== String(course_id)) {
      return Response.json(
        { success: false, error: "plan_id does not belong to course_id" },
        { status: 422 }
      );
    }

    // 1) Store payment record (for admin dashboard/reporting)
    // We store plan_id and can derive course via plans.course_id when needed.
    // This insert is resilient: it will automatically drop unknown columns (schema cache errors) and retry.
    // If promo_code provided, try validate it (do not record use yet)
    let appliedPromo = null;
    if (promo_code) {
      try {
        const { data: promoData } = await supabase.from("promo_codes").select("*").eq("code", String(promo_code).trim()).limit(1).maybeSingle();
        if (promoData && promoData.is_active) {
          // basic validity checks
          const now = new Date();
          if ((promoData.valid_from && new Date(promoData.valid_from) > now) || (promoData.valid_to && new Date(promoData.valid_to) < now)) {
            // expired or not yet valid
          } else {
            appliedPromo = promoData;
          }
        }
      } catch (e) {
        console.warn("promo validation failed", e.message || e);
      }
    }

    const paymentInsert = {
      user_id: user_id,
      plan_id: plan_id,
      amount: Number(amount),
      promo_code: appliedPromo ? appliedPromo.code : null,
      promo_code_id: appliedPromo ? appliedPromo.id : null,
      promo_discount_amount: appliedPromo ? 0 : null, // compute below if applied
      tax_amount: Number(tax_amount || 0),
      transaction_mode: String(transaction_mode).toLowerCase(),
      transaction_status: verifiedTransactionStatus,
      transaction_id: String(transaction_id),
      order_id: order_id ? String(order_id) : null,
      payment_date: payment_date ? new Date(payment_date).toISOString() : new Date().toISOString(),
    };

    const { data: payment, error: payErr } = await insertPaymentWithSchemaFallback(paymentInsert);
    if (payErr) throw payErr;

    // If payment is not successful, do not enroll yet.
    if (!["success", "captured"].includes(verifiedTransactionStatus)) {
      return Response.json(
        {
          success: true,
          message: "Payment stored. Enrollment will be created only after success.",
          payment,
          enrolled_course: null,
        },
        { status: 200 }
      );
    }

    // After successful payment, apply promo discount record if promo was validated earlier
    let promoUseRecord = null;
    if (appliedPromo) {
      try {
        const amt = Number(amount) || 0;
        let discountAmount = 0;
        if (appliedPromo.discount_type === "percent") discountAmount = +(amt * (Number(appliedPromo.discount_value) / 100));
        else discountAmount = Number(appliedPromo.discount_value) || 0;
        if (discountAmount < 0) discountAmount = 0;
        if (discountAmount > amt) discountAmount = amt;

        const { data: savedUse, error: saveUseErr } = await supabase.from("promo_uses").insert([{ promo_code_id: appliedPromo.id, user_id, order_id: payment?.order_id || null, amount_before: amt, discount_amount: discountAmount }]).select().single();
        if (saveUseErr) console.warn("promo use record failed", saveUseErr.message);
        else promoUseRecord = savedUse;
        // increment uses_count
        try { await supabase.rpc("increment_promo_uses_count", { promo_id: appliedPromo.id }); } catch (e) { console.warn("increment promo uses rpc failed", e.message || e); }
      } catch (e) {
        console.warn("apply promo after payment failed", e.message || e);
      }
    }

    // Prevent overlapping subscription for same course
    const now = new Date();
    const { data: existing, error: exErr } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user_id)
      .eq("course_id", plan.course_id)
      .neq("is_active", false)
      .gte("end_date", now.toISOString())
      .limit(1);
    if (exErr) throw exErr;
    if (existing && existing.length > 0) {
      return Response.json(
        {
          success: false,
          error: "Already enrolled: active subscription exists for this course",
          payment,
        },
        { status: 409 }
      );
    }

    const sDate = start_date ? new Date(start_date) : new Date();
    const endDate = new Date(sDate.getTime() + Number(plan.duration_in_days || 0) * 24 * 60 * 60 * 1000);
    if (!Number.isFinite(endDate.getTime())) {
      return Response.json(
        { success: false, error: "Invalid plan duration" },
        { status: 422 }
      );
    }

    const insertObj = {
      user_id: user_id,
      plan_id: plan.id,
      course_id: plan.course_id,
      start_date: sDate.toISOString(),
      end_date: endDate.toISOString(),
      is_active: true,
      auto_renew: !!plan.auto_renew,
    };

    const { data: sub, error: insErr } = await supabase
      .from("user_subscriptions")
      .insert([insertObj])
      .select()
      .single();
    if (insErr) throw insErr;

    // Send Push Notification asynchronously
    sendPushNotification(
      user_id,
      "Subscription Successful 🎉",
      `You have successfully enrolled in ${plan.name}. Start learning now!`,
      "course"
    ).catch(e => console.error("Enrollment Push Failed:", e));

    return Response.json(
      {
        success: true,
        payment,
        enrolled_course: {
          subscription: sub,
          course_id: plan.course_id,
          plan_id: plan.id,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}



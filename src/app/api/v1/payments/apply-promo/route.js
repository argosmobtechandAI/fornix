import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, code, amount, order_id = null } = body || {};
    if (!user_id || !code || typeof amount === "undefined") {
      return new Response(JSON.stringify({ success: false, error: "user_id, code and amount are required" }), { status: 400 });
    }

    // Normalize code
    const codeTrim = String(code).trim();
    if (!codeTrim) return new Response(JSON.stringify({ success: false, error: "invalid code" }), { status: 400 });

    // Fetch promo code
    const { data: promo = null, error: pErr } = await supabase.from("promo_codes").select("*").eq("code", codeTrim).limit(1).maybeSingle();
    if (pErr) throw pErr;
    if (!promo) return new Response(JSON.stringify({ success: false, error: "promo code not found" }), { status: 404 });

    if (!promo.is_active) return new Response(JSON.stringify({ success: false, error: "promo code inactive" }), { status: 400 });

    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) return new Response(JSON.stringify({ success: false, error: "promo code not yet valid" }), { status: 400 });
    if (promo.valid_to && new Date(promo.valid_to) < now) return new Response(JSON.stringify({ success: false, error: "promo code expired" }), { status: 400 });

    // Check usage limit
    if (promo.max_uses && Number(promo.max_uses) > 0) {
      const { count, error: uErr } = await supabase.from("promo_uses").select("id", { count: "exact", head: true }).eq("promo_code_id", promo.id);
      if (uErr) console.warn("promo uses count warning:", uErr.message);
      if (typeof count === "number" && count >= promo.max_uses) {
        return new Response(JSON.stringify({ success: false, error: "promo code usage limit reached" }), { status: 400 });
      }
    }

    // Compute discount
    const amt = Number(amount) || 0;
    let discountAmount = 0;
    if (promo.discount_type === "percent") {
      discountAmount = +(amt * (Number(promo.discount_value) / 100));
    } else {
      discountAmount = Number(promo.discount_value) || 0;
    }
    if (discountAmount < 0) discountAmount = 0;
    if (discountAmount > amt) discountAmount = amt;

    // Record use (note: if you prefer to record only after payment success, call this endpoint after confirmation)
    const payload = {
      promo_code_id: promo.id,
      user_id,
      order_id,
      amount_before: amt,
      discount_amount: discountAmount,
    };

    const { data: saved, error: saveErr } = await supabase.from("promo_uses").insert([payload]).select("id,promo_code_id,user_id,order_id,amount_before,discount_amount,created_at").single();
    if (saveErr) {
      console.warn("promo use save warning:", saveErr.message);
    } else {
      // increment uses_count in promo_codes (best-effort)
      try {
        await supabase.rpc("increment_promo_uses_count", { promo_id: promo.id });
      } catch (e) {
        console.warn("increment uses rpc failed", e.message || e);
      }
    }

    const newTotal = +(amt - discountAmount);

    return new Response(JSON.stringify({ success: true, data: { promo: { id: promo.id, code: promo.code, discount_type: promo.discount_type, discount_value: promo.discount_value }, discount_amount: discountAmount, new_total: newTotal, use_record: saved || null } }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
  
}
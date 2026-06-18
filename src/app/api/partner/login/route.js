import { supabase } from '@/lib/supabaseAdmin';
import bcrypt from 'bcrypt';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const partnerEmail = email ? String(email).trim().toLowerCase() : '';
    const rawPassword = password ? String(password) : '';

    if (!partnerEmail || !rawPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'email and password are required' }),
        { status: 400 }
      );
    }

    // Find promo code for this partner
    const { data: promo, error: pErr } = await supabase
      .from('promo_codes')
      .select('id, code, partner_name, partner_email, partner_password_hash, partner_commission_percent')
      .eq('partner_email', partnerEmail)
      .maybeSingle();

    if (pErr) {
      return new Response(
        JSON.stringify({ success: false, error: pErr.message }),
        { status: 500 }
      );
    }
    if (!promo || !promo.partner_password_hash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(rawPassword, promo.partner_password_hash);
    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { status: 401 }
      );
    }

    // Load students who enrolled using this partner's promo code
    const { data: uses, error: uErr } = await supabase
      .from('promo_uses')
      .select('id, user_id, amount_before, discount_amount, created_at')
      .eq('promo_code_id', promo.id)
      .order('created_at', { ascending: false });

    if (uErr) {
      return new Response(
        JSON.stringify({ success: false, error: uErr.message }),
        { status: 500 }
      );
    }

    const userIds = Array.from(new Set((uses || []).map(u => u.user_id).filter(Boolean)));
    let usersById = new Map();
    if (userIds.length > 0) {
      const { data: users, error: usrErr } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      if (usrErr) {
        return new Response(
          JSON.stringify({ success: false, error: usrErr.message }),
          { status: 500 }
        );
      }
      usersById = new Map((users || []).map(u => [u.id, u]));
    }

    const commissionPercent = Number(promo.partner_commission_percent || 0);

    const students = (uses || []).map(u => {
      const user = usersById.get(u.user_id) || {};
      const amountBefore = Number(u.amount_before || 0);
      const discountAmount = Number(u.discount_amount || 0);
      const netAmount = Math.max(0, amountBefore - discountAmount);
      const commission_amount = commissionPercent > 0 ? (netAmount * commissionPercent) / 100 : 0;

      return {
        promo_use_id: u.id,
        joined_at: u.created_at,
        amount_before: amountBefore,
        discount_amount: discountAmount,
        net_amount: netAmount,
        commission_amount,
        user: {
          id: user.id || u.user_id,
          name: user.full_name || null,
          email: user.email || null,
          phone: user.phone || null,
        },
      };
    });

    const totals = students.reduce(
      (acc, s) => {
        acc.total_students += 1;
        acc.total_amount_before += Number(s.amount_before || 0);
        acc.total_discount_amount += Number(s.discount_amount || 0);
        acc.total_net_amount += Number(s.net_amount || 0);
        acc.total_commission_amount += Number(s.commission_amount || 0);
        return acc;
      },
      { total_students: 0, total_amount_before: 0, total_discount_amount: 0, total_net_amount: 0, total_commission_amount: 0 }
    );

    return new Response(
      JSON.stringify({
        success: true,
        partner: {
          promo_code_id: promo.id,
          promo_code: promo.code,
          name: promo.partner_name,
          email: promo.partner_email,
          commission_percent: promo.partner_commission_percent,
        },
        totals,
        students,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}

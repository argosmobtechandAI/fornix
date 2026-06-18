import { ensureAdmin } from '@/lib/verifyToken';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(req) {
  try {
    await ensureAdmin(req);
    const { page = '1', limit = '50' } = Object.fromEntries(new URL(req.url).searchParams);
    const p = Math.max(1, parseInt(page || '1', 10));
    const l = Math.max(1, parseInt(limit || '50', 10));
    const offset = (p - 1) * l;

    const { data, count, error } = await supabase
      .from('promo_uses')
      .select('id, promo_code_id, user_id, order_id, amount_before, discount_amount, created_at, promo_codes(code)')
      .order('created_at', { ascending: false })
      .range(offset, offset + l - 1);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, uses: data || [], pagination: { page: p, limit: l, total: count || (data || []).length } }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

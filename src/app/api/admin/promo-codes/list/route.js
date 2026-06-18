import { ensureAdmin } from '@/lib/verifyToken';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(req) {
  try {
    await ensureAdmin(req);
    const { search = '', page = '1', limit = '50' } = Object.fromEntries(new URL(req.url).searchParams);
    const p = Math.max(1, parseInt(page || '1', 10));
    const l = Math.max(1, parseInt(limit || '50', 10));
    const offset = (p - 1) * l;

    let qb = supabase.from('promo_codes').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + l - 1);
    if (search) qb = qb.ilike('code', `%${search}%`);

    const { data, count, error } = await qb;
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, promos: data || [], pagination: { page: p, limit: l, total: count || (data || []).length } }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

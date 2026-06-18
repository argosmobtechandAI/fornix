import { ensureAdmin } from '@/lib/verifyToken';
import { supabase } from '@/lib/supabaseAdmin';
import bcrypt from 'bcrypt';

export async function GET(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;
    if (!id) return new Response(JSON.stringify({ success: false, error: 'id required' }), { status: 400 });
    const { data, error } = await supabase.from('promo_codes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return new Response(JSON.stringify({ success: false, error: 'not found' }), { status: 404 });
    return new Response(JSON.stringify({ success: true, promo: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const admin = await ensureAdmin(req);
    const { id } = await params;
    if (!id) return new Response(JSON.stringify({ success: false, error: 'id required' }), { status: 400 });
    const body = await req.json();
    // Validate updates (similar to create)
    const {
      code,
      description = null,
      discount_type = 'percent',
      discount_value = 0,
      max_uses = null,
      valid_from = null,
      valid_to = null,
      is_active = true,
      partner_name = null,
      partner_email = null,
      partner_password = null,
      partner_commission_percent = 0,
    } = body || {};
    if (code && !String(code).trim()) return new Response(JSON.stringify({ success: false, error: 'invalid code' }), { status: 400 });
    const ct = String(discount_type || 'percent').toLowerCase();
    if (!['percent', 'fixed'].includes(ct)) return new Response(JSON.stringify({ success: false, error: 'invalid discount_type' }), { status: 400 });
    const dv = Number(discount_value);
    if (!Number.isFinite(dv) || dv < 0) return new Response(JSON.stringify({ success: false, error: 'invalid discount_value' }), { status: 400 });
    if (ct === 'percent' && (dv <= 0 || dv > 100)) return new Response(JSON.stringify({ success: false, error: 'percent discount_value must be between 1 and 100' }), { status: 400 });

    let mu = null;
    if (max_uses !== null && typeof max_uses !== 'undefined' && String(max_uses).trim() !== '') {
      mu = Number(max_uses);
      if (!Number.isInteger(mu) || mu <= 0) return new Response(JSON.stringify({ success: false, error: 'max_uses must be a positive integer or null' }), { status: 400 });
    }

    let vf = null;
    let vt = null;
    if (valid_from) {
      vf = new Date(valid_from);
      if (isNaN(vf.getTime())) return new Response(JSON.stringify({ success: false, error: 'invalid valid_from' }), { status: 400 });
      vf = vf.toISOString();
    }
    if (valid_to) {
      vt = new Date(valid_to);
      if (isNaN(vt.getTime())) return new Response(JSON.stringify({ success: false, error: 'invalid valid_to' }), { status: 400 });
      vt = vt.toISOString();
    }
    if (vf && vt && new Date(vt) < new Date(vf)) return new Response(JSON.stringify({ success: false, error: 'valid_to must be after valid_from' }), { status: 400 });

    // Partner validation / normalization
    let partnerEmail = partner_email ? String(partner_email).trim().toLowerCase() : null;
    let partnerName = partner_name ? String(partner_name).trim() : null;
    let partnerCommission = Number(partner_commission_percent ?? 0);
    let partnerPasswordHash;

    if (partnerEmail && !partnerEmail.includes('@')) {
      return new Response(JSON.stringify({ success: false, error: 'invalid partner_email' }), { status: 400 });
    }
    if (partnerCommission < 0 || partnerCommission > 100) {
      return new Response(JSON.stringify({ success: false, error: 'partner_commission_percent must be between 0 and 100' }), { status: 400 });
    }
    if (partner_password && String(partner_password).length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'partner_password must be at least 6 characters' }), { status: 400 });
    }
    if (partner_password) {
      partnerPasswordHash = await bcrypt.hash(String(partner_password), 10);
    }

    const updates = {
      ...(code ? { code: String(code).trim().toUpperCase() } : {}),
      description,
      discount_type: ct,
      discount_value: dv,
      max_uses: mu,
      valid_from: vf,
      valid_to: vt,
      is_active: !!is_active,
      created_by: admin?.id || null,
    };

    // Only set partner fields if explicitly provided (to avoid clobbering existing data unintentionally)
    if (body.hasOwnProperty('partner_name')) updates.partner_name = partnerName;
    if (body.hasOwnProperty('partner_email')) updates.partner_email = partnerEmail;
    if (body.hasOwnProperty('partner_commission_percent')) updates.partner_commission_percent = partnerCommission;
    if (partnerPasswordHash) updates.partner_password_hash = partnerPasswordHash;
    // Prevent duplicate code if changing code
    if (updates.code) {
      const { data: existing } = await supabase.from('promo_codes').select('id').eq('code', updates.code).neq('id', id).limit(1).maybeSingle();
      if (existing) return new Response(JSON.stringify({ success: false, error: 'promo code already exists' }), { status: 409 });
    }

    const { data, error } = await supabase.from('promo_codes').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, promo: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;
    if (!id) return new Response(JSON.stringify({ success: false, error: 'id required' }), { status: 400 });
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

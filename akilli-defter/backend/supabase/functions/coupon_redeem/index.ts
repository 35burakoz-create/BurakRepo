import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const maxDeviceRedemptions = Number(Deno.env.get('COUPON_MAX_PER_DEVICE') ?? '3');

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const { data: authData } = await userClient.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      return json({ ok: false, error: 'unauthorized', message_tr: 'Kupon kullanmak için giriş yapmalısın.' }, 401);
    }

    const payload = (await req.json()) as { code?: string; device_fingerprint?: string };
    const code = (payload.code ?? '').trim().toUpperCase();
    const deviceFingerprint = (payload.device_fingerprint ?? '').trim();

    if (!code || !deviceFingerprint) {
      return json({ ok: false, error: 'invalid_request', message_tr: 'Kupon kodunu girip tekrar dene.' }, 400);
    }

    const deviceHash = await sha256(deviceFingerprint);

    const { data: coupon } = await adminClient
      .from('coupons')
      .select('code,type,value,expires_at,max_redemptions,redeemed_count')
      .eq('code', code)
      .maybeSingle();

    if (!coupon) {
      return json({ ok: false, error: 'invalid_coupon', message_tr: 'Kupon kodu geçersiz ya da süresi dolmuş.' }, 400);
    }

    const now = new Date();
    const expiresAt = new Date(coupon.expires_at as string);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < now.getTime()) {
      return json({ ok: false, error: 'invalid_coupon', message_tr: 'Kupon kodu geçersiz ya da süresi dolmuş.' }, 400);
    }

    const redeemedCount = typeof coupon.redeemed_count === 'number' ? coupon.redeemed_count : 0;
    const maxRedemptions = typeof coupon.max_redemptions === 'number' ? coupon.max_redemptions : 0;
    if (redeemedCount >= maxRedemptions) {
      return json({ ok: false, error: 'coupon_limit_reached', message_tr: 'Bu kuponun kullanım hakkı doldu.' }, 400);
    }

    const { data: alreadyByUser } = await adminClient
      .from('coupon_redemptions')
      .select('id')
      .eq('user_id', userId)
      .eq('code', code)
      .maybeSingle();

    if (alreadyByUser) {
      return json({ ok: false, error: 'already_redeemed', message_tr: 'Bu kuponu daha önce kullandın.' }, 400);
    }

    const { count: deviceCount } = await adminClient
      .from('coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('device_fingerprint_hash', deviceHash);

    if ((deviceCount ?? 0) >= maxDeviceRedemptions) {
      return json({ ok: false, error: 'device_limit_reached', message_tr: 'Bu cihazdan çok fazla kupon denemesi yapıldı.' }, 429);
    }

    const { error: redemptionError } = await adminClient.from('coupon_redemptions').insert({
      user_id: userId,
      code,
      device_fingerprint_hash: deviceHash,
    });

    if (redemptionError) {
      return json({ ok: false, error: 'already_redeemed', message_tr: 'Bu kuponu daha önce kullandın.' }, 400);
    }

    const { data: updateRows } = await adminClient
      .from('coupons')
      .update({ redeemed_count: redeemedCount + 1 })
      .eq('code', code)
      .eq('redeemed_count', redeemedCount)
      .select('code');

    if (!updateRows || updateRows.length === 0) {
      return json({ ok: false, error: 'coupon_limit_reached', message_tr: 'Bu kuponun kullanım hakkı doldu.' }, 400);
    }

    const couponType = (coupon.type ?? '') as string;
    const couponValue = Math.max(1, Number(coupon.value ?? 0));

    if (couponType === 'pro_days') {
      const { data: current } = await adminClient
        .from('billing_subscriptions')
        .select('expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      const currentExpiry = current?.expires_at ? new Date(current.expires_at) : now;
      const base = currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
      const nextExpiry = new Date(base.getTime() + couponValue * 24 * 60 * 60 * 1000).toISOString();

      await adminClient.from('billing_subscriptions').upsert({
        user_id: userId,
        plan_type: 'personalPremium',
        entitlement_status: 'active',
        verification_source: 'coupon',
        expires_at: nextExpiry,
        last_verified_at: now.toISOString(),
      }, { onConflict: 'user_id' });


      await adminClient.from('profiles').upsert({
        id: userId,
        user_id: userId,
        email: authData.user?.email ?? null,
        plan: 'PRO',
        updated_at: now.toISOString(),
      }, { onConflict: 'id' });
    } else if (couponType === 'ai_credits') {
      const { data: currentCredits } = await adminClient
        .from('ai_extra_credits')
        .select('credits')
        .eq('user_id', userId)
        .maybeSingle();

      const balance = typeof currentCredits?.credits === 'number' ? currentCredits.credits : 0;
      await adminClient.from('ai_extra_credits').upsert({
        user_id: userId,
        credits: balance + couponValue,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' });
    }

    return json({ ok: true, code, type: couponType, value: couponValue, message_tr: 'Kupon başarıyla uygulandı.' });
  } catch {
    return json({ ok: false, error: 'coupon_redeem_failed', message_tr: 'Kupon uygulanamadı. Lütfen tekrar dene.' }, 500);
  }
});

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAILS = new Set(['burakozdayi@gmail.com']);
const VALID_PLANS = new Set(['FREE', 'PRO', 'VIP']);

type Payload = {
  action?: 'grant_plan' | 'revoke_to_free' | 'get_user_plan';
  target_email?: string;
  plan?: 'FREE' | 'PRO' | 'VIP';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ ok: false, code: 'supabase_not_ready', message_tr: 'Sunucu bağlantısı hazır değil.' }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const { data: authData } = await userClient.auth.getUser();
    const caller = authData.user;
    const callerEmail = caller?.email?.toLowerCase() ?? '';
    if (!caller || !ADMIN_EMAILS.has(callerEmail)) {
      return json({ ok: false, code: 'not_admin', message_tr: 'Bu işlem için yetkin yok.' }, 403);
    }

    const payload = (await req.json()) as Payload;
    const action = payload.action;
    const targetEmail = (payload.target_email ?? '').trim().toLowerCase();
    if (!action || !targetEmail) {
      return json({ ok: false, code: 'invalid_request', message_tr: 'E-posta bilgisini kontrol et.' }, 400);
    }

    const { data: userRow } = await adminClient
      .from('profiles')
      .select('id,user_id,email,plan,updated_at')
      .eq('email', targetEmail)
      .maybeSingle();

    const targetUserId = userRow?.user_id ?? userRow?.id ?? null;
    if (!targetUserId) {
      return json({ ok: false, code: 'user_not_found', message_tr: 'Kullanıcı bulunamadı.' }, 404);
    }

    if (action === 'get_user_plan') {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('id,user_id,email,plan,updated_at')
        .eq('id', targetUserId)
        .maybeSingle();

      return json({
        ok: true,
        user_id: profile?.user_id ?? profile?.id ?? targetUserId,
        email: profile?.email ?? targetEmail,
        plan: profile?.plan ?? 'FREE',
        updated_at: profile?.updated_at ?? null,
      });
    }

    if (action === 'revoke_to_free') {
      await adminClient.from('profiles').upsert({
        id: targetUserId,
        user_id: targetUserId,
        email: targetEmail,
        plan: 'FREE',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      return json({ ok: true, user_id: targetUserId, email: targetEmail, plan: 'FREE' });
    }

    if (action === 'grant_plan') {
      const plan = (payload.plan ?? '').toUpperCase();
      if (!VALID_PLANS.has(plan)) {
        return json({ ok: false, code: 'invalid_plan', message_tr: 'Plan değeri geçersiz.' }, 400);
      }

      await adminClient.from('profiles').upsert({
        id: targetUserId,
        user_id: targetUserId,
        email: targetEmail,
        plan,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      return json({ ok: true, user_id: targetUserId, email: targetEmail, plan });
    }

    return json({ ok: false, code: 'invalid_request', message_tr: 'İstek anlaşılamadı.' }, 400);
  } catch {
    return json({ ok: false, code: 'admin_plan_failed', message_tr: 'İşlem tamamlanamadı.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

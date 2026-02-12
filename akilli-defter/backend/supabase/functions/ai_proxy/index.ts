import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_OUTPUT_TOKENS = 350;
const ALLOWED_FEATURES = new Set(['categorize_transaction', 'weekly_summary', 'collection_message']);

type QuotaPlan = 'free' | 'pro';

const PLAN_LIMITS: Record<QuotaPlan, { requests: number; tokens: number }> = {
  free: { requests: 2, tokens: 1500 },
  pro: { requests: 50, tokens: 50000 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const { data: authData } = await userClient.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      return json({ ok: false, error: 'unauthorized', message_tr: 'Oturum doğrulanamadı. Lütfen tekrar giriş yapın.' }, 401);
    }

    const payload = (await req.json()) as {
      feature?: string;
      payload?: Record<string, unknown>;
      max_output_tokens?: number;
    };

    const feature = payload.feature ?? '';
    if (!ALLOWED_FEATURES.has(feature)) {
      return json({ ok: false, error: 'invalid_feature', message_tr: 'Geçersiz AI isteği.' }, 400);
    }

    const requestedTokens = Math.min(Math.max(payload.max_output_tokens ?? 350, 1), MAX_OUTPUT_TOKENS);
    const today = new Date().toISOString().slice(0, 10);

    const { data: profile } = await adminClient
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .maybeSingle();

    const plan = profile?.plan === 'pro' ? 'pro' : 'free';
    const limits = PLAN_LIMITS[plan];

    const { data: usage } = await adminClient
      .from('ai_usage_daily')
      .select('used_count,used_tokens')
      .eq('user_id', userId)
      .eq('day', today)
      .maybeSingle();

    const usedCount = (usage?.used_count as number?) ?? 0;
    const usedTokens = (usage?.used_tokens as number?) ?? 0;

    if (usedCount >= limits.requests || usedTokens + requestedTokens > limits.tokens) {
      return json({
        ok: false,
        error: 'quota_exceeded',
        message_tr: 'Günlük AI kotan doldu. Daha fazla kullanım için planını yükseltebilirsin.',
        quota: {
          plan,
          requests_limit: limits.requests,
          tokens_limit: limits.tokens,
          used_count: usedCount,
          used_tokens: usedTokens,
        },
      }, 200);
    }

    const upstream = await userClient.functions.invoke(feature, {
      body: payload.payload ?? {},
    });

    const data = (upstream.data as Record<string, unknown>?) ?? null;
    if (data == null) {
      return json({ ok: false, error: 'upstream_failed', message_tr: 'AI yanıtı alınamadı. Lütfen tekrar deneyin.' }, 502);
    }

    await adminClient.from('ai_usage_daily').upsert(
      {
        user_id: userId,
        day: today,
        used_count: usedCount + 1,
        used_tokens: usedTokens + requestedTokens,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,day' },
    );

    return json({
      ok: true,
      data,
      quota: {
        plan,
        requests_limit: limits.requests,
        tokens_limit: limits.tokens,
        used_count: usedCount + 1,
        used_tokens: usedTokens + requestedTokens,
      },
    });
  } catch {
    return json({ ok: false, error: 'ai_proxy_failed', message_tr: 'AI servisi şu an yanıt veremiyor. Lütfen sonra tekrar dene.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

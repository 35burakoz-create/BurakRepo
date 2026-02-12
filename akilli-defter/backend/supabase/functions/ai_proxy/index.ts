import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, cf-connecting-ip',
};

const FREE_MAX_OUTPUT_TOKENS = 250;
const PRO_MAX_OUTPUT_TOKENS = 600;
const DEFAULT_MODEL_NAME = 'gpt-4o-mini';
const SYSTEM_PROMPT_TR = 'Kısa ve net cevap ver. En fazla 6 madde.';
const MAX_INPUT_CHARS = 4000;
const ALLOWED_FEATURES = new Set(['categorize_transaction', 'weekly_summary', 'collection_message']);

type QuotaPlan = 'free' | 'pro';

const PLAN_LIMITS: Record<QuotaPlan, { requests: number; tokens: number; rpm: number }> = {
  free: { requests: 2, tokens: 1500, rpm: 2 },
  pro: { requests: 50, tokens: 50000, rpm: 10 },
};

const IP_RPM_LIMIT = 30;
const RATE_LIMITED_MESSAGE_TR = 'Çok hızlı istek gönderildi. Lütfen 1 dakika sonra tekrar dene.';

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
      model_name?: string;
      system_prompt?: string;
    };

    const feature = payload.feature ?? '';
    if (!ALLOWED_FEATURES.has(feature)) {
      return json({ ok: false, error: 'invalid_feature', message_tr: 'Geçersiz AI isteği.' }, 400);
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: profile } = await adminClient
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .maybeSingle();

    const plan = profile?.plan === 'pro' ? 'pro' : 'free';
    const limits = PLAN_LIMITS[plan];
    const planMaxOutputTokens = plan == 'pro' ? PRO_MAX_OUTPUT_TOKENS : FREE_MAX_OUTPUT_TOKENS;
    const requestedTokens = Math.min(Math.max(payload.max_output_tokens ?? planMaxOutputTokens, 1), planMaxOutputTokens);

    const ip = extractIp(req) ?? 'unknown';
    const minuteBucket = minuteBucketIso();

    await cleanupRateLimitRows(adminClient);

    const userRateOk = await consumeRateLimit(adminClient, `user:${userId}`, minuteBucket, limits.rpm);
    if (!userRateOk) {
      return json({ ok: false, code: 'rate_limited', error: 'rate_limited', message_tr: RATE_LIMITED_MESSAGE_TR }, 429);
    }

    const ipRateOk = await consumeRateLimit(adminClient, `ip:${ip}`, minuteBucket, IP_RPM_LIMIT);
    if (!ipRateOk) {
      return json({ ok: false, code: 'rate_limited', error: 'rate_limited', message_tr: RATE_LIMITED_MESSAGE_TR }, 429);
    }

    const { data: usage } = await adminClient
      .from('ai_usage_daily')
      .select('used_count,used_tokens')
      .eq('user_id', userId)
      .eq('day', today)
      .maybeSingle();

    const usedCount = typeof usage?.used_count === 'number' ? usage.used_count : 0;
    const usedTokens = typeof usage?.used_tokens === 'number' ? usage.used_tokens : 0;

    const { data: extraCreditsRow } = await adminClient
      .from('ai_extra_credits')
      .select('credits')
      .eq('user_id', userId)
      .maybeSingle();

    const bonusCredits = typeof extraCreditsRow?.credits === 'number' ? extraCreditsRow.credits : 0;
    const overDailyQuota = usedCount >= limits.requests || usedTokens + requestedTokens > limits.tokens;
    const useBonusCredit = overDailyQuota && bonusCredits > 0;

    if (overDailyQuota && !useBonusCredit) {
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
          bonus_credits: bonusCredits,
        },
      }, 200);
    }

    const modelName = Deno.env.get('MODEL_NAME') ?? payload.model_name ?? DEFAULT_MODEL_NAME;
    const systemPrompt = payload.system_prompt ?? SYSTEM_PROMPT_TR;
    const optimizedPayload = optimizePayload(payload.payload ?? {});

    const upstream = await userClient.functions.invoke(feature, {
      body: {
        ...optimizedPayload,
        model_name: modelName,
        system_prompt: systemPrompt,
        max_output_tokens: requestedTokens,
      },
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

    if (useBonusCredit) {
      await adminClient.from('ai_extra_credits').upsert(
        {
          user_id: userId,
          credits: Math.max(0, bonusCredits - 1),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    }

    return json({
      ok: true,
      data,
      quota: {
        plan,
        requests_limit: limits.requests,
        tokens_limit: limits.tokens,
        used_count: usedCount + 1,
        used_tokens: usedTokens + requestedTokens,
        bonus_credits: useBonusCredit ? Math.max(0, bonusCredits - 1) : bonusCredits,
      },
    });
  } catch {
    return json({ ok: false, error: 'ai_proxy_failed', message_tr: 'AI servisi şu an yanıt veremiyor. Lütfen sonra tekrar dene.' }, 500);
  }
});

async function consumeRateLimit(adminClient: ReturnType<typeof createClient>, key: string, bucket: string, limit: number) {
  const { data } = await adminClient
    .from('ai_rate_limits')
    .select('count')
    .eq('key', key)
    .eq('bucket', bucket)
    .maybeSingle();

  const current = typeof data?.count === 'number' ? data.count : 0;
  if (current >= limit) {
    return false;
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  await adminClient.from('ai_rate_limits').upsert(
    {
      key,
      bucket,
      count: current + 1,
      updated_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: 'key,bucket' },
  );

  return true;
}

async function cleanupRateLimitRows(adminClient: ReturnType<typeof createClient>) {
  await adminClient.from('ai_rate_limits').delete().lt('expires_at', new Date().toISOString());
}

function minuteBucketIso() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

function extractIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim();
  }
  return req.headers.get('cf-connecting-ip');
}

function optimizePayload(payload: Record<string, unknown>) {
  return truncateLongStrings(payload) as Record<string, unknown>;
}

function truncateLongStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.length <= MAX_INPUT_CHARS) {
      return value;
    }
    return `${value.slice(0, MAX_INPUT_CHARS)}[KISALTILDI]`;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => truncateLongStrings(entry));
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = truncateLongStrings(entry);
    }
    return out;
  }

  return value;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

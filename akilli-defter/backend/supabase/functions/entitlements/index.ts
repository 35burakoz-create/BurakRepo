import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { buildEntitlementsForPlan, getUserPlan, quotaConfigForPlan } from '../_shared/ai_guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const plan = await getUserPlan({ adminClient, userId });
    const entitlements = buildEntitlementsForPlan(plan);
    const quotas = quotaConfigForPlan(plan);

    const monthKey = new Date().toISOString().slice(0, 7);
    const { data: usageRows } = await adminClient
      .from('ai_usage_monthly')
      .select('feature_name,usage_count')
      .eq('user_id', userId)
      .eq('period_month', monthKey);

    for (const row of (usageRows ?? []) as Array<{ feature_name: string; usage_count: number }>) {
      const current = quotas[row.feature_name as keyof typeof quotas];
      if (current) {
        current.used = current.used + row.usage_count;
      }
    }

    const { data: billingRow } = await adminClient
      .from('billing_subscriptions')
      .select('verification_source,last_verified_at,entitlement_status,expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    return new Response(JSON.stringify({
      ...entitlements,
      ai_quotas: quotas,
      billing_verification: {
        source: billingRow?.verification_source ?? 'none',
        last_verified_at: billingRow?.last_verified_at ?? null,
        entitlement_status: billingRow?.entitlement_status ?? 'inactive',
        expires_at: billingRow?.expires_at ?? null,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

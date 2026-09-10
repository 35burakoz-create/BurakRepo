import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { planFromBillingRecord } from '../_shared/ai_guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = { action: 'set_plan' | 'restore'; plan_type?: 'free' | 'personalPremium' | 'business' };

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
    const payload = (await req.json()) as Payload;
    const { data: authData } = await userClient.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Client cannot mint paid access in production. Keep this as debug-only escape hatch.
    if (payload.action === 'set_plan') {
      const allowDevOverride = (Deno.env.get('ALLOW_DEV_BILLING_OVERRIDE') ?? 'false') === 'true';
      if (!allowDevOverride) {
        return new Response(JSON.stringify({ error: 'set_plan is disabled; server-side billing verification is source of truth' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const plan = payload.plan_type ?? 'free';
      await adminClient.from('billing_subscriptions').upsert({
        user_id: userId,
        plan_type: plan,
        verification_source: 'dev_override',
        entitlement_status: 'active',
        last_verified_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ success: true, plan_type: plan, source: 'dev_override' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data } = await adminClient
      .from('billing_subscriptions')
      .select('plan_type,entitlement_status,expires_at,last_verified_at')
      .eq('user_id', userId)
      .maybeSingle();

    const effectivePlan = planFromBillingRecord(data);

    return new Response(JSON.stringify({
      success: true,
      plan_type: effectivePlan,
      raw_status: data?.entitlement_status ?? 'unknown',
      last_verified_at: data?.last_verified_at ?? null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'billing failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-billing-webhook-secret',
};

type WebhookPayload = {
  event_id?: string;
  provider?: 'google_play' | 'revenuecat';
  user_id?: string;
  provider_customer_id?: string;
  plan_type?: 'free' | 'personalPremium' | 'business';
  entitlement_status?: 'active' | 'trialing' | 'expired' | 'canceled' | 'inactive';
  expires_at?: string | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const webhookSecret = Deno.env.get('BILLING_WEBHOOK_SECRET') ?? '';
  const incomingSecret = req.headers.get('x-billing-webhook-secret') ?? '';
  if (!webhookSecret || incomingSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const payload = (await req.json()) as WebhookPayload;
    const userId = payload.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const eventId = payload.event_id ?? crypto.randomUUID();
    const provider = payload.provider ?? 'google_play';
    const planType = payload.plan_type ?? 'free';
    const status = payload.entitlement_status ?? 'inactive';

    await adminClient.from('billing_webhook_events').upsert(
      {
        event_id: eventId,
        provider,
        user_id: userId,
        payload,
        processed_at: new Date().toISOString(),
      },
      { onConflict: 'event_id' },
    );

    await adminClient.from('billing_subscriptions').upsert({
      user_id: userId,
      provider,
      provider_customer_id: payload.provider_customer_id ?? null,
      plan_type: planType,
      entitlement_status: status,
      expires_at: payload.expires_at ?? null,
      verification_source: 'webhook',
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, event_id: eventId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'webhook failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

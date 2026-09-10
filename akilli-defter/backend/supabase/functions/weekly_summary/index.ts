import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { buildWeeklySummary } from '../_shared/ai_utils.ts';
import { checkAndConsumeMonthlyQuota, logAiEvent, sanitizeAiPayload } from '../_shared/ai_guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  workspace_id: string;
  date_range: { start: string; end: string };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const started = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const payload = sanitizeAiPayload((await req.json()) as Payload);
    const { data: authData } = await userClient.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) throw new Error('Unauthorized');

    const { data: membership } = await userClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', payload.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden workspace' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const quota = await checkAndConsumeMonthlyQuota({
      adminClient,
      workspaceId: payload.workspace_id,
      userId,
      featureName: 'weekly_summary',
    });
    if (!quota.allowed) {
      return new Response(JSON.stringify({ error: 'AI monthly quota exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = buildWeeklySummary(payload.date_range.start, payload.date_range.end);

    await logAiEvent({
      adminClient,
      workspaceId: payload.workspace_id,
      featureName: 'weekly_summary',
      promptVersion: 'v2_weekly_summary',
      success: true,
      latencyMs: Date.now() - started,
    });

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch {
    await logAiEvent({
      adminClient,
      featureName: 'weekly_summary',
      promptVersion: 'v2_weekly_summary',
      success: false,
      latencyMs: Date.now() - started,
    });

    return new Response(JSON.stringify({ error: 'AI service failure' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

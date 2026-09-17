import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = { action: 'export' | 'delete' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

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
    const user = authData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: memberships } = await userClient
      .from('workspace_members')
      .select('workspace_id,role,workspaces(owner_id)')
      .eq('user_id', user.id);

    const safeMemberships = (memberships as Array<Record<string, unknown>>?) ?? [];
    const ownedWorkspaceIds = safeMemberships
      .filter((m) => (m['workspaces'] as Record<string, unknown>?)?.['owner_id'] == user.id)
      .map((m) => m['workspace_id'] as string);

    if (payload.action === 'export') {
      const exports: Record<string, unknown> = {};
      const tables = ['accounts', 'transactions', 'budgets', 'contacts', 'deals', 'payment_schedules'];
      for (const workspaceId of safeMemberships.map((m) => m['workspace_id'] as string)) {
        const bucket: Record<string, unknown> = {};
        for (const table of tables) {
          const { data } = await userClient.from(table).select('*').eq('workspace_id', workspaceId);
          bucket[table] = data ?? [];
        }
        exports[workspaceId] = bucket;
      }

      return new Response(JSON.stringify({ user_id: user.id, exported_at: new Date().toISOString(), data: exports }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const workspaceId of ownedWorkspaceIds) {
      await adminClient.from('workspace_members').delete().eq('workspace_id', workspaceId);
      await adminClient.from('workspaces').delete().eq('id', workspaceId);
    }

    await adminClient.from('workspace_members').delete().eq('user_id', user.id);
    await adminClient.from('profiles').delete().eq('id', user.id);

    return new Response(JSON.stringify({ success: true, deleted_owned_workspaces: ownedWorkspaceIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Operation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

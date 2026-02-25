import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serviceClient } from '../../../../lib/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();
    const userId = params.id;

    const [profile, campaigns, joins, reports, audit, notes] = await Promise.all([
      supabase.from('profiles').select('id, nickname, city_id, neighborhood, created_at, cooldown_until').eq('id', userId).maybeSingle(),
      supabase.from('campaigns').select('id, title, status, ends_at, created_at').eq('created_by', userId).order('created_at', { ascending: false }).limit(200),
      supabase.from('participants').select('id, campaign_id, qty, will_come, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      supabase.from('reports').select('id, campaign_id, reason, created_at').eq('reporter_id', userId).order('created_at', { ascending: false }).limit(200),
      supabase.from('audit_events').select('id, created_at, action, entity_type, entity_id, city_id, payload').eq('actor_user_id', userId).order('created_at', { ascending: false }).limit(300),
      supabase.from('admin_notes').select('*').eq('target_type', 'user').eq('target_id', userId).order('created_at', { ascending: false }).limit(100),
    ]);

    return NextResponse.json({
      profile: profile.data,
      campaigns: campaigns.data ?? [],
      joins: joins.data ?? [],
      reports: reports.data ?? [],
      audit: audit.data ?? [],
      notes: notes.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

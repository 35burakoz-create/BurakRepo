import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serviceClient } from '../../../../lib/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();
    const campaignId = params.id;

    const [campaign, participants, audit, notes] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle(),
      supabase.from('participants').select('id, user_id, qty, will_come, received, created_at').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(500),
      supabase.from('audit_events').select('id, created_at, action, actor_user_id, entity_type, entity_id, payload').eq('entity_id', campaignId).order('created_at', { ascending: false }).limit(300),
      supabase.from('admin_notes').select('*').eq('target_type', 'campaign').eq('target_id', campaignId).order('created_at', { ascending: false }).limit(100),
    ]);

    return NextResponse.json({
      campaign: campaign.data,
      participants: participants.data ?? [],
      participantsCount: (participants.data ?? []).length,
      audit: audit.data ?? [],
      notes: notes.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

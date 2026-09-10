import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../../../lib/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin(request);
    const { featured, sponsor_name, sponsor_until } = await request.json();

    const supabase = serviceClient();
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, city_id')
      .eq('id', params.id)
      .maybeSingle();
    if (fetchError || !campaign) throw fetchError ?? new Error('campaign not found');

    const payload = {
      featured: !!featured,
      sponsor_name: sponsor_name ? String(sponsor_name).trim() : null,
      sponsor_until: sponsor_until || null,
    };

    const { error } = await supabase.from('campaigns').update(payload).eq('id', params.id);
    if (error) throw error;

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'admin_campaign_sponsor_set',
      entityType: 'campaign',
      entityId: params.id,
      cityId: campaign.city_id,
      payload,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

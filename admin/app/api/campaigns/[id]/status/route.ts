import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../../../lib/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin(request);
    const { status } = await request.json();
    if (!['completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }

    const supabase = serviceClient();
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, city_id')
      .eq('id', params.id)
      .maybeSingle();
    if (fetchError || !campaign) throw fetchError ?? new Error('campaign not found');

    const { error } = await supabase
      .from('campaigns')
      .update({ status })
      .eq('id', params.id);
    if (error) throw error;

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'admin_campaign_status_update',
      entityType: 'campaign',
      entityId: params.id,
      cityId: campaign.city_id,
      payload: { status },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

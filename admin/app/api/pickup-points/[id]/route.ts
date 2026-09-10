import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../../lib/server';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json();
    const supabase = serviceClient();

    const updates = {
      name: body.name,
      address: body.address,
      phone: body.phone,
      is_active: body.is_active,
      sponsored_until: body.sponsored_until,
    } as Record<string, unknown>;

    const { data, error } = await supabase
      .from('pickup_points')
      .update(updates)
      .eq('id', params.id)
      .select('id, city_id')
      .single();
    if (error) throw error;

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'admin_pickup_point_update',
      entityType: 'pickup_point',
      entityId: data.id,
      cityId: data.city_id,
      payload: updates,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../../../lib/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin(request);
    const { status, note } = await request.json();
    const supabase = serviceClient();

    const { data: row, error: fetchError } = await supabase
      .from('sponsorship_requests')
      .select('id, city_id')
      .eq('id', params.id)
      .maybeSingle();
    if (fetchError || !row) throw fetchError ?? new Error('request not found');

    const { error } = await supabase
      .from('sponsorship_requests')
      .update({ status })
      .eq('id', params.id);
    if (error) throw error;

    if (note && String(note).trim()) {
      await supabase.from('admin_notes').insert({
        target_type: 'sponsorship_request',
        target_id: params.id,
        note: String(note).trim(),
        created_by: actor.id,
      });
    }

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'admin_sponsorship_request_status_set',
      entityType: 'sponsorship_request',
      entityId: params.id,
      cityId: row.city_id,
      payload: { status },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

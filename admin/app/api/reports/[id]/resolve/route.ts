import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../../../lib/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin(request);
    const { note } = await request.json();
    const supabase = serviceClient();

    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('id, campaign_id')
      .eq('id', params.id)
      .maybeSingle();
    if (fetchError || !report) throw fetchError ?? new Error('report not found');

    const { error } = await supabase
      .from('reports')
      .update({ handled_at: new Date().toISOString(), handled_by: actor.id })
      .eq('id', params.id);
    if (error) throw error;

    if (note && String(note).trim()) {
      await supabase.from('admin_notes').insert({
        target_type: 'report',
        target_id: params.id,
        note: String(note).trim(),
        created_by: actor.id,
      });
    }

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'admin_report_resolve',
      entityType: 'report',
      entityId: params.id,
      payload: { note: !!note },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

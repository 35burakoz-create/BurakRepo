import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../lib/server';

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const { target_type, target_id, note } = await request.json();
    if (!target_type || !target_id || !note) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const supabase = serviceClient();
    const { error } = await supabase.from('admin_notes').insert({
      target_type,
      target_id,
      note,
      created_by: actor.id,
    });
    if (error) throw error;

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'admin_note_create',
      entityType: target_type,
      entityId: target_id,
      payload: { note_len: String(note).length },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

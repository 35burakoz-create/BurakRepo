import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../../../lib/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin(request);
    const { cooldown_until } = await request.json();
    const supabase = serviceClient();

    const { error } = await supabase
      .from('profiles')
      .update({ cooldown_until })
      .eq('id', params.id);
    if (error) throw error;

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'admin_user_cooldown_set',
      entityType: 'profile',
      entityId: params.id,
      payload: { cooldown_until },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

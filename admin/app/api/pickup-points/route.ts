import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../lib/server';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();
    const cityId = request.nextUrl.searchParams.get('city_id');
    const active = request.nextUrl.searchParams.get('active');

    let query = supabase
      .from('pickup_points')
      .select('id, city_id, name, address, phone, is_active, sponsored_until, created_at')
      .order('sponsored_until', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);

    if (cityId) query = query.eq('city_id', cityId);
    if (active === '1') query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json();
    const supabase = serviceClient();

    const payload = {
      city_id: String(body.city_id || 'tire').trim(),
      name: String(body.name || '').trim(),
      address: String(body.address || '').trim(),
      phone: body.phone ? String(body.phone).trim() : null,
      is_active: body.is_active !== false,
      sponsored_until: body.sponsored_until || null,
      created_by: actor.id,
    };

    const { data, error } = await supabase
      .from('pickup_points')
      .insert(payload)
      .select('id, city_id')
      .single();
    if (error) throw error;

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'admin_pickup_point_create',
      entityType: 'pickup_point',
      entityId: data.id,
      cityId: data.city_id,
      payload: { is_active: payload.is_active, sponsored_until: payload.sponsored_until },
      request,
    });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

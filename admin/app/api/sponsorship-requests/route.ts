import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serviceClient } from '../../../lib/server';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();
    const cityId = request.nextUrl.searchParams.get('city_id');
    const type = request.nextUrl.searchParams.get('type');
    const status = request.nextUrl.searchParams.get('status');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    let query = supabase
      .from('sponsorship_requests')
      .select('id, city_id, user_id, business_name, contact_phone, type, target_id, note, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (cityId) query = query.eq('city_id', cityId);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serviceClient } from '../../../lib/server';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();
    const cityId = request.nextUrl.searchParams.get('city_id');
    const status = request.nextUrl.searchParams.get('status');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');
    const sponsored = request.nextUrl.searchParams.get('sponsored');

    let query = supabase
      .from('campaigns')
.select('id, title, city_id, neighborhood, status, created_by, ends_at, created_at, featured, sponsor_name, sponsor_until')
      .order('created_at', { ascending: false })
      .limit(300);

    if (cityId) query = query.eq('city_id', cityId);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    if (sponsored === '1') {
      query = query.eq('featured', true).gt('sponsor_until', new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

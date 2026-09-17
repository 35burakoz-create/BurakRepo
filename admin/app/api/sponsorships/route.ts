import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serviceClient } from '../../../lib/server';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();

    const cityId = request.nextUrl.searchParams.get('city_id');
    const expiringDays = Number(request.nextUrl.searchParams.get('expiring_days') || '7');
    const activeOnly = request.nextUrl.searchParams.get('active_only') === '1';

    const nowIso = new Date().toISOString();
    const until = new Date(Date.now() + expiringDays * 86400000).toISOString();

    let query = supabase
      .from('pickup_points')
      .select('id, city_id, name, address, phone, sponsored_until, is_active')
      .not('sponsored_until', 'is', null)
      .order('sponsored_until', { ascending: true })
      .limit(500);

    if (cityId) query = query.eq('city_id', cityId);
    if (activeOnly) query = query.eq('is_active', true).gte('sponsored_until', nowIso);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map((r: any) => {
      const sponsoredUntil = r.sponsored_until ? new Date(r.sponsored_until) : null;
      const isActiveSponsored = sponsoredUntil ? sponsoredUntil > new Date(nowIso) : false;
      const isExpiringSoon = sponsoredUntil ? sponsoredUntil <= new Date(until) : false;
      return { ...r, is_active_sponsored: isActiveSponsored, is_expiring_soon: isExpiringSoon };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

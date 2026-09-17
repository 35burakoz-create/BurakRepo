import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serviceClient } from '../../../lib/server';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();
    const cityId = request.nextUrl.searchParams.get('city_id');
    const q = request.nextUrl.searchParams.get('q');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    let query = supabase.from('profiles').select('id, nickname, city_id, neighborhood, created_at, cooldown_until').order('created_at', { ascending: false }).limit(200);
    if (cityId) query = query.eq('city_id', cityId);
    if (q) query = query.ilike('nickname', `%${q}%`);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) throw error;

    const ids = (data ?? []).map((x) => x.id);
    const [campaigns, joins] = await Promise.all([
      ids.length ? supabase.from('campaigns').select('created_by').in('created_by', ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from('participants').select('user_id').in('user_id', ids) : Promise.resolve({ data: [] as any[] }),
    ]);

    const rowMap = new Map<string, any>((data ?? []).map((r) => [r.id, { ...r, campaign_count: 0, join_count: 0 }]));
    for (const c of campaigns.data ?? []) rowMap.get(c.created_by)!.campaign_count += 1;
    for (const j of joins.data ?? []) rowMap.get(j.user_id)!.join_count += 1;

    return NextResponse.json({ rows: Array.from(rowMap.values()) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

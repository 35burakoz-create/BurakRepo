import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serviceClient } from '../../../lib/server';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();
    const cityId = request.nextUrl.searchParams.get('city_id');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    let query = supabase
      .from('reports')
      .select('id, campaign_id, reporter_id, reason, created_at, handled_at')
      .is('handled_at', null)
      .order('created_at', { ascending: true })
      .limit(500);

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    if (cityId) {
      const { data: campaignIds } = await supabase
        .from('campaigns')
        .select('id')
        .eq('city_id', cityId)
        .limit(5000);
      query = query.in('campaign_id', (campaignIds ?? []).map((x) => x.id));
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

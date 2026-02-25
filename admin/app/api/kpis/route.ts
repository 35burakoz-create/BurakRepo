import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serviceClient } from '../../../lib/server';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();

    const [{ count: usersCount }, { count: activeCampaigns }, { count: joinsLast24h }, { count: reportsCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('participants').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      supabase.from('reports').select('*', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({ usersCount: usersCount ?? 0, activeCampaigns: activeCampaigns ?? 0, joinsLast24h: joinsLast24h ?? 0, reportsCount: reportsCount ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

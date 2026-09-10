import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, serviceClient } from '../../../../../lib/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const supabase = serviceClient();

    const { data: point, error: pointError } = await supabase
      .from('pickup_points')
      .select('id, city_id, name, sponsored_until')
      .eq('id', params.id)
      .single();
    if (pointError) throw pointError;

    const { data: rows, error } = await supabase
      .from('pickup_point_entitlements')
      .select('id, product_id, expires_at, state, last_verified_at, purchase_token, created_at')
      .eq('pickup_point_id', params.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    return NextResponse.json({ point, rows: rows ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

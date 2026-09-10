import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../../../../lib/server';
import { packageNameFromEnv, verifyProductPurchase } from '../../../../../../lib/google-play';

const productDurations: Record<string, number> = {
  pickup_sponsor_7d: 7,
  pickup_sponsor_weekly: 7,
  pickup_sponsor_30d: 30,
  pickup_sponsor_monthly: 30,
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin(request);
    const supabase = serviceClient();

    const { data: entitlement, error: entError } = await supabase
      .from('pickup_point_entitlements')
      .select('id, purchase_token, product_id, pickup_point_id')
      .eq('id', params.id)
      .single();
    if (entError) throw entError;

    const packageName = packageNameFromEnv();
    const verification = await verifyProductPurchase({
      packageName,
      productId: entitlement.product_id,
      purchaseToken: entitlement.purchase_token,
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (productDurations[entitlement.product_id] ?? 7) * 86400000);
    const state = verification.valid ? 'active' : 'invalid';

    await supabase
      .from('pickup_point_entitlements')
      .update({
        state,
        expires_at: expiresAt.toISOString(),
        last_verified_at: now.toISOString(),
        raw_response: verification.raw,
      })
      .eq('id', params.id);

    if (verification.valid) {
      await supabase
        .from('pickup_points')
        .update({ sponsored_until: expiresAt.toISOString() })
        .eq('id', entitlement.pickup_point_id)
        .lt('sponsored_until', expiresAt.toISOString());
    }

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'billing_pickup_point_verification_refresh',
      entityType: 'pickup_point_entitlement',
      entityId: params.id,
      payload: { state },
      request,
    });

    return NextResponse.json({ ok: true, state, expires_at: expiresAt.toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

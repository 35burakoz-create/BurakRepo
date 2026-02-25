import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit, requireAdmin, serviceClient } from '../../../../lib/server';
import { packageNameFromEnv, verifyProductPurchase } from '../../../../lib/google-play';

const productDurations: Record<string, number> = {
  pickup_sponsor_7d: 7,
  pickup_sponsor_weekly: 7,
  pickup_sponsor_30d: 30,
  pickup_sponsor_monthly: 30,
};

function computeExpiry(productId: string) {
  const days = productDurations[productId];
  if (!days) throw new Error(`unsupported productId: ${productId}`);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json();
    const productId = String(body.productId || '');
    const purchaseToken = String(body.purchaseToken || '');
    const pickupPointId = String(body.pickup_point_id || '');
    const packageName = packageNameFromEnv(body.packageName ? String(body.packageName) : undefined);

    if (!productId || !purchaseToken || !pickupPointId || !packageName) {
      throw new Error('productId, purchaseToken, pickup_point_id, packageName required');
    }

    const verification = await verifyProductPurchase({
      packageName,
      productId,
      purchaseToken,
    });

    if (!verification.valid) {
      return NextResponse.json({ ok: false, message: 'Purchase invalid' }, { status: 400 });
    }

    const expiresAt = computeExpiry(productId);
    const supabase = serviceClient();

    const { data: point, error: pointError } = await supabase
      .from('pickup_points')
      .select('id, city_id, sponsored_until')
      .eq('id', pickupPointId)
      .single();
    if (pointError) throw pointError;

    const currentUntil = point.sponsored_until ? new Date(point.sponsored_until) : null;
    const nextUntil = currentUntil && currentUntil > expiresAt ? currentUntil : expiresAt;

    const entitlementPayload = {
      purchase_token: purchaseToken,
      pickup_point_id: pickupPointId,
      product_id: productId,
      purchaser_user_id: actor.id,
      expires_at: nextUntil.toISOString(),
      state: 'active',
      last_verified_at: new Date().toISOString(),
      raw_response: verification.raw,
    };

    const { error: entitlementError } = await supabase
      .from('pickup_point_entitlements')
      .upsert(entitlementPayload, { onConflict: 'purchase_token' });
    if (entitlementError) throw entitlementError;

    const { error: pointUpdateError } = await supabase
      .from('pickup_points')
      .update({ sponsored_until: nextUntil.toISOString() })
      .eq('id', pickupPointId);
    if (pointUpdateError) throw pointUpdateError;

    await logAdminAudit({
      actorUserId: actor.id,
      action: 'billing_pickup_point_sponsor_activated',
      entityType: 'pickup_point',
      entityId: pickupPointId,
      cityId: point.city_id,
      payload: { product_id: productId, expires_at: nextUntil.toISOString() },
      request,
    });

    return NextResponse.json({ ok: true, expires_at: nextUntil.toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

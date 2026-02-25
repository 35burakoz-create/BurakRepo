import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/server';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json(
      { ok: false, phase: 'phase-2', message: 'Google Play token verification is not enabled yet.' },
      { status: 501 },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 });
  }
}

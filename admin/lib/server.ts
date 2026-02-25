import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) throw new Error('Unauthorized');

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user?.email) throw new Error('Unauthorized');

  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.includes(data.user.email.toLowerCase())) {
    throw new Error('Forbidden');
  }

  return data.user;
}

export async function logAdminAudit(params: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  cityId?: string | null;
  payload?: Record<string, unknown>;
  request?: NextRequest;
}) {
  const supabase = serviceClient();
  await supabase.from('audit_events').insert({
    actor_user_id: params.actorUserId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    city_id: params.cityId ?? 'tire',
    payload: params.payload ?? {},
    ip: params.request?.headers.get('x-forwarded-for') ?? null,
    user_agent: params.request?.headers.get('user-agent') ?? null,
  });
}

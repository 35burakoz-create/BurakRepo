import { maskPII, tokenizeContactName } from './ai_utils.ts';

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any;
    insert: (values: Record<string, unknown>) => any;
    upsert: (values: Record<string, unknown>, options?: Record<string, unknown>) => any;
    eq: (column: string, value: unknown) => any;
    maybeSingle: () => Promise<{ data: any }>;
  };
};

export type PlanType = 'free' | 'personalPremium' | 'business';

type BillingRecord = {
  plan_type?: string | null;
  entitlement_status?: string | null;
  expires_at?: string | null;
};

const planQuota: Record<PlanType, Record<string, number>> = {
  free: {
    categorize_transaction: 30,
    weekly_summary: 2,
    nl_query: 10,
    collection_message: 0,
  },
  personalPremium: {
    categorize_transaction: 300,
    weekly_summary: 5,
    nl_query: 100,
    collection_message: 0,
  },
  business: {
    categorize_transaction: 500,
    weekly_summary: 5,
    nl_query: 300,
    collection_message: 200,
  },
};

export function sanitizeFreeText(input: string): string {
  const piiMasked = maskPII(input);
  return piiMasked.replace(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\b/g, '[name]');
}

export function sanitizeAiPayload<T extends Record<string, unknown>>(payload: T): T {
  const copy: Record<string, unknown> = { ...payload };
  for (const key of Object.keys(copy)) {
    const value = copy[key];
    if (typeof value === 'string') {
      copy[key] = sanitizeFreeText(value);
    }
  }
  if (typeof copy.contact === 'string') {
    copy.contact = tokenizeContactName(copy.contact);
  }
  return copy as T;
}

export function planFromBillingRecord(record: BillingRecord | null | undefined): PlanType {
  if (!record) return 'free';

  const rawPlan = (record.plan_type as string | null) ?? 'free';
  const plan: PlanType = rawPlan === 'business' || rawPlan === 'personalPremium' ? rawPlan : 'free';

  const status = (record.entitlement_status ?? '').toLowerCase();
  if (status !== 'active' && status !== 'trialing') {
    return 'free';
  }

  if (record.expires_at) {
    const expiresAtMs = Date.parse(record.expires_at);
    if (!Number.isNaN(expiresAtMs) && expiresAtMs < Date.now()) {
      return 'free';
    }
  }

  return plan;
}

export async function getUserPlan(params: { adminClient: SupabaseLike; userId: string }): Promise<PlanType> {
  const { data } = await params.adminClient
    .from('billing_subscriptions')
    .select('plan_type,entitlement_status,expires_at')
    .eq('user_id', params.userId)
    .maybeSingle();

  return planFromBillingRecord(data as BillingRecord | null | undefined);
}

export async function checkAndConsumeMonthlyQuota(params: {
  adminClient: SupabaseLike;
  workspaceId: string;
  userId: string;
  featureName: string;
}) {
  const plan = await getUserPlan({ adminClient: params.adminClient, userId: params.userId });
  const limit = planQuota[plan][params.featureName] ?? 0;
  if (limit <= 0) return { allowed: false, remaining: 0, limit, plan };

  const monthKey = new Date().toISOString().slice(0, 7);

  const { data } = await params.adminClient
    .from('ai_usage_monthly')
    .select('usage_count')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userId)
    .eq('feature_name', params.featureName)
    .eq('period_month', monthKey)
    .maybeSingle();

  const current = (data?.usage_count as number?) ?? 0;
  if (current >= limit) {
    return { allowed: false, remaining: 0, limit, plan };
  }

  await params.adminClient.from('ai_usage_monthly').upsert(
    {
      workspace_id: params.workspaceId,
      user_id: params.userId,
      feature_name: params.featureName,
      period_month: monthKey,
      usage_count: current + 1,
    },
    { onConflict: 'workspace_id,user_id,feature_name,period_month' },
  );

  return { allowed: true, remaining: limit - (current + 1), limit, plan };
}

export async function logAiEvent(params: {
  adminClient: SupabaseLike;
  workspaceId?: string;
  featureName: string;
  promptVersion: string;
  success: boolean;
  latencyMs: number;
}) {
  await params.adminClient.from('ai_request_logs').insert({
    workspace_id: params.workspaceId ?? null,
    endpoint: params.featureName,
    feature_name: params.featureName,
    prompt_version: params.promptVersion,
    success: params.success,
    latency_ms: params.latencyMs,
    request_payload: null,
    response_payload: null,
    masked_payload: '[redacted]',
  });
}

export function buildEntitlementsForPlan(plan: PlanType) {
  if (plan === 'personalPremium') {
    return {
      plan_type: plan,
      can_use_personal: true,
      can_use_business: true,
      business_read_only: true,
      can_export: true,
      can_use_device_lock: true,
      can_use_cloud_sync: true,
      can_use_fx_scenario: false,
      can_use_profitability: false,
      can_use_collections_messaging: false,
    };
  }

  if (plan === 'business') {
    return {
      plan_type: plan,
      can_use_personal: false,
      can_use_business: true,
      business_read_only: false,
      can_export: true,
      can_use_device_lock: false,
      can_use_cloud_sync: true,
      can_use_fx_scenario: true,
      can_use_profitability: true,
      can_use_collections_messaging: true,
    };
  }

  return {
    plan_type: 'free',
    can_use_personal: true,
    can_use_business: true,
    business_read_only: true,
    can_export: false,
    can_use_device_lock: false,
    can_use_cloud_sync: false,
    can_use_fx_scenario: false,
    can_use_profitability: false,
    can_use_collections_messaging: false,
  };
}

export function quotaConfigForPlan(plan: PlanType) {
  const config = planQuota[plan];
  return {
    categorize_transaction: { limit: config.categorize_transaction, used: 0 },
    weekly_summary: { limit: config.weekly_summary, used: 0 },
    nl_query: { limit: config.nl_query, used: 0 },
    collection_message: { limit: config.collection_message, used: 0 },
  };
}

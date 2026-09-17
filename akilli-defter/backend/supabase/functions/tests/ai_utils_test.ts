import { assertEquals, assertMatch } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { buildCollectionMessageDraft, buildWeeklySummary, heuristicCategory, maskPII, tokenizeContactName } from '../_shared/ai_utils.ts';
import { buildEntitlementsForPlan, planFromBillingRecord, quotaConfigForPlan, sanitizeAiPayload, sanitizeFreeText } from '../_shared/ai_guard.ts';

Deno.test('maskPII masks email and phone', () => {
  const masked = maskPII('mail: user@example.com phone:+90 532 111 22 33');
  assertMatch(masked, /\[email\]/);
  assertMatch(masked, /\[phone\]/);
});

Deno.test('sanitize free text masks names', () => {
  const masked = sanitizeFreeText('Ali Veli user@example.com');
  assertMatch(masked, /\[name\]/);
  assertMatch(masked, /\[email\]/);
});

Deno.test('tokenize contact name', () => {
  assertEquals(tokenizeContactName('Anadolu Trade'), 'Müşteri A');
});

Deno.test('sanitize payload tokenizes contact', () => {
  const sanitized = sanitizeAiPayload({ contact: 'Anadolu Trade', text: 'Ali Veli' });
  assertEquals(sanitized.contact, 'Müşteri A');
  assertMatch(String(sanitized.text), /\[name\]/);
});

Deno.test('heuristicCategory maps grocery text', () => {
  const result = heuristicCategory('Carrefour grocery');
  assertEquals(result.category, 'Market');
});

Deno.test('weekly summary shape', () => {
  const summary = buildWeeklySummary('2026-02-01', '2026-02-07');
  assertEquals(summary.action_items.length, 3);
  assertMatch(summary.summary_text_tr, /2026-02-01/);
});

Deno.test('collection message draft includes payment context', () => {
  const draft = buildCollectionMessageDraft({
    contact: 'Müşteri A',
    overdue_days: 7,
    amount: 1200,
    currency: 'USD',
    tone: 'net',
  });
  assertMatch(draft.whatsapp_tr, /1200.00 USD/);
  assertMatch(draft.whatsapp_en, /overdue by 7 days/);
});

Deno.test('business plan entitlements and quota config', () => {
  const entitlements = buildEntitlementsForPlan('business');
  const quotas = quotaConfigForPlan('business');
  assertEquals(entitlements.can_use_personal, false);
  assertEquals(entitlements.can_use_business, true);
  assertEquals(quotas.collection_message.limit, 200);
});


Deno.test('inactive billing record resolves to free', () => {
  const plan = planFromBillingRecord({
    plan_type: 'business',
    entitlement_status: 'inactive',
    expires_at: null,
  });
  assertEquals(plan, 'free');
});

Deno.test('active unexpired billing record resolves to plan', () => {
  const plan = planFromBillingRecord({
    plan_type: 'personalPremium',
    entitlement_status: 'active',
    expires_at: '2999-01-01T00:00:00.000Z',
  });
  assertEquals(plan, 'personalPremium');
});

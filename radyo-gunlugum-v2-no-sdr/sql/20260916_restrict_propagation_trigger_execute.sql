-- Trigger-only propagation enrichment functions must not be exposed as browser RPC surface.
-- Existing table triggers continue to invoke them; direct PUBLIC/anon/authenticated EXECUTE is unnecessary.

revoke execute on function public.radio_enrich_log_propagation_context() from public, anon, authenticated;
revoke execute on function public.radio_enrich_attempt_propagation_context() from public, anon, authenticated;

comment on function public.radio_enrich_log_propagation_context() is
'Trigger-only propagation enrichment for radio_logs; direct browser-role EXECUTE is intentionally revoked.';

comment on function public.radio_enrich_attempt_propagation_context() is
'Trigger-only propagation enrichment for radio_session_attempts; direct browser-role EXECUTE is intentionally revoked.';

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'cost_allocations'
    AND pg_get_constraintdef(c.oid) LIKE '%cost_type%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.cost_allocations DROP CONSTRAINT %I', con_name);
  END IF;
END;
$$;

ALTER TABLE public.cost_allocations
  ADD CONSTRAINT cost_allocations_cost_type_check
  CHECK (cost_type IN ('freight','customs','packing','commission','other'));

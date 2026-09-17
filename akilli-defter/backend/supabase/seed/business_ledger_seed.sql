-- Business ledger portfolio seed
-- Workspace: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

-- 3 contacts
insert into public.contacts (id, workspace_id, name, email, kind)
values
  ('90111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Anadolu Trade', 'ops@anadolutrade.com', 'customer'),
  ('90222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Balkan Foods', 'finance@balkanfoods.eu', 'customer'),
  ('90333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ege Supplies', 'sales@egesupplies.com', 'supplier')
on conflict (id) do nothing;

-- 2 deals
insert into public.deals (id, workspace_id, contact_id, code, amount, currency, status)
values
  ('90444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90111111-1111-1111-1111-111111111111', 'FOB-TR-001', 18000, 'USD', 'active'),
  ('90555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90222222-2222-2222-2222-222222222222', 'CIF-EU-014', 12500, 'EUR', 'active')
on conflict (id) do nothing;

-- 2 invoices
insert into public.invoices (id, workspace_id, deal_id, invoice_number, issue_date, due_date, total_amount, currency)
values
  ('90666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90444444-4444-4444-4444-444444444444', 'INV-2026-010', current_date - 15, current_date + 10, 18000, 'USD'),
  ('90777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90555555-5555-5555-5555-555555555555', 'INV-2026-011', current_date - 18, current_date + 6, 12500, 'EUR')
on conflict (id) do nothing;

-- 3 payment schedules (1 overdue)
insert into public.payment_schedules (id, workspace_id, invoice_id, due_date, amount, paid_amount, status)
values
  ('90888888-8888-8888-8888-888888888881', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90666666-6666-6666-6666-666666666666', current_date - 3, 8500, 0, 'overdue'),
  ('90888888-8888-8888-8888-888888888882', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90666666-6666-6666-6666-666666666666', current_date + 5, 9500, 0, 'pending'),
  ('90888888-8888-8888-8888-888888888883', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90777777-7777-7777-7777-777777777777', current_date + 2, 12500, 0, 'pending')
on conflict (id) do nothing;

-- 4 cost allocations
insert into public.cost_allocations (id, workspace_id, deal_id, cost_type, amount, currency)
values
  ('90999999-9999-9999-9999-999999999991', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90444444-4444-4444-4444-444444444444', 'freight', 1200, 'USD'),
  ('90999999-9999-9999-9999-999999999992', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90444444-4444-4444-4444-444444444444', 'customs', 450, 'USD'),
  ('90999999-9999-9999-9999-999999999993', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90555555-5555-5555-5555-555555555555', 'packing', 320, 'EUR'),
  ('90999999-9999-9999-9999-999999999994', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '90555555-5555-5555-5555-555555555555', 'commission', 280, 'EUR')
on conflict (id) do nothing;

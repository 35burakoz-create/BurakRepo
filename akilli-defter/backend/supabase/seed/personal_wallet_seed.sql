-- Personal wallet portfolio seed
-- Workspace: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

insert into public.accounts (id, workspace_id, name, currency, balance)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nakit', 'TRY', 18500),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'USD Hesabı', 'USD', 2400),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'EUR Hesabı', 'EUR', 1200)
on conflict (id) do nothing;

-- 5 categories
insert into public.categories (id, workspace_id, name, transaction_type)
values
  ('44444444-4444-4444-4444-444444444441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Market', 'expense'),
  ('44444444-4444-4444-4444-444444444442', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ulaşım', 'expense'),
  ('44444444-4444-4444-4444-444444444443', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Yeme-İçme', 'expense'),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Freelance', 'income'),
  ('44444444-4444-4444-4444-444444444445', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Maaş', 'income')
on conflict (id) do nothing;

-- 20 transactions
insert into public.transactions (id, workspace_id, account_id, type, amount, currency, category_id, merchant, note, occurred_at)
values
  ('66666666-6666-6666-6666-666666666601','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',380,'TRY','44444444-4444-4444-4444-444444444441','Migros','Haftalık market',now()-interval '20 day'),
  ('66666666-6666-6666-6666-666666666602','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',120,'TRY','44444444-4444-4444-4444-444444444442','Metro','Ofis ulaşım',now()-interval '19 day'),
  ('66666666-6666-6666-6666-666666666603','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',240,'TRY','44444444-4444-4444-4444-444444444443','Kahve Dünyası','Toplantı kahvesi',now()-interval '18 day'),
  ('66666666-6666-6666-6666-666666666604','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','income',350,'USD','44444444-4444-4444-4444-444444444444','Freelance','UI danışmanlık',now()-interval '17 day'),
  ('66666666-6666-6666-6666-666666666605','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','income',22000,'TRY','44444444-4444-4444-4444-444444444445','Şirket','Aylık maaş',now()-interval '16 day'),
  ('66666666-6666-6666-6666-666666666606','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',670,'TRY','44444444-4444-4444-4444-444444444441','Carrefour','Ev alışverişi',now()-interval '15 day'),
  ('66666666-6666-6666-6666-666666666607','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',90,'TRY','44444444-4444-4444-4444-444444444442','Marmaray','Kart dolumu',now()-interval '14 day'),
  ('66666666-6666-6666-6666-666666666608','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',310,'TRY','44444444-4444-4444-4444-444444444443','Yemeksepeti','Akşam yemeği',now()-interval '13 day'),
  ('66666666-6666-6666-6666-666666666609','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333','income',280,'EUR','44444444-4444-4444-4444-444444444444','Freelance','Çeviri işi',now()-interval '12 day'),
  ('66666666-6666-6666-6666-666666666610','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',155,'TRY','44444444-4444-4444-4444-444444444442','Taksi','Müşteri görüşmesi',now()-interval '11 day'),
  ('66666666-6666-6666-6666-666666666611','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',440,'TRY','44444444-4444-4444-4444-444444444441','A101','Market',now()-interval '10 day'),
  ('66666666-6666-6666-6666-666666666612','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',210,'TRY','44444444-4444-4444-4444-444444444443','BigChefs','Öğle yemeği',now()-interval '9 day'),
  ('66666666-6666-6666-6666-666666666613','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','income',420,'USD','44444444-4444-4444-4444-444444444444','Freelance','Landing page işi',now()-interval '8 day'),
  ('66666666-6666-6666-6666-666666666614','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',95,'TRY','44444444-4444-4444-4444-444444444442','İETT','Ulaşım kartı',now()-interval '7 day'),
  ('66666666-6666-6666-6666-666666666615','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',285,'TRY','44444444-4444-4444-4444-444444444443','Starbucks','Toplantı',now()-interval '6 day'),
  ('66666666-6666-6666-6666-666666666616','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',530,'TRY','44444444-4444-4444-4444-444444444441','Şok','Market',now()-interval '5 day'),
  ('66666666-6666-6666-6666-666666666617','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333','income',180,'EUR','44444444-4444-4444-4444-444444444444','Freelance','Revize ücreti',now()-interval '4 day'),
  ('66666666-6666-6666-6666-666666666618','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',160,'TRY','44444444-4444-4444-4444-444444444442','Uber','Havalimanı',now()-interval '3 day'),
  ('66666666-6666-6666-6666-666666666619','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',460,'TRY','44444444-4444-4444-4444-444444444441','Macrocenter','Market',now()-interval '2 day'),
  ('66666666-6666-6666-6666-666666666620','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','expense',230,'TRY','44444444-4444-4444-4444-444444444443','GetirYemek','Akşam siparişi',now()-interval '1 day')
on conflict (id) do nothing;

-- 2 budgets
insert into public.budgets (id, workspace_id, category_id, limit_amount, period_start, period_end)
values
  ('88888888-8888-8888-8888-888888888881', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444441', 6500, date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date),
  ('88888888-8888-8888-8888-888888888882', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444443', 3500, date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date)
on conflict (id) do nothing;

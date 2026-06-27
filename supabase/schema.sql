-- GenTech multi-device sync — run this once in your Supabase project's SQL editor.
-- Dashboard: Project → SQL Editor → New query → paste this whole file → Run.

-- Enable anonymous sign-in for this project (also required in
-- Dashboard → Authentication → Providers → Anonymous Sign-Ins → Enable).

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists shop_devices (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  device_id text not null,
  auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (shop_id, device_id)
);

create table if not exists sync_records (
  shop_id uuid not null references shops(id) on delete cascade,
  table_name text not null,
  record_uuid text not null,
  payload jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (shop_id, table_name, record_uuid)
);

create index if not exists sync_records_shop_updated_idx
  on sync_records (shop_id, updated_at);

alter table shops enable row level security;
alter table shop_devices enable row level security;
alter table sync_records enable row level security;

-- Any signed-in (including anonymous) user may look up a shop by code or
-- create one — pairing happens before a device has a shop_devices row yet.
create policy "shops_select_any_authenticated" on shops
  for select to authenticated using (true);

create policy "shops_insert_any_authenticated" on shops
  for insert to authenticated with check (true);

-- A device can see/manage shop_devices rows for shops it already belongs to,
-- and can always insert its own membership row (needed to join).
create policy "shop_devices_select_member" on shop_devices
  for select to authenticated using (
    shop_id in (select shop_id from shop_devices where auth_user_id = auth.uid())
  );

create policy "shop_devices_insert_self" on shop_devices
  for insert to authenticated with check (auth_user_id = auth.uid());

-- sync_records access is restricted to devices that belong to that shop.
create policy "sync_records_select_member" on sync_records
  for select to authenticated using (
    shop_id in (select shop_id from shop_devices where auth_user_id = auth.uid())
  );

create policy "sync_records_upsert_member" on sync_records
  for insert to authenticated with check (
    shop_id in (select shop_id from shop_devices where auth_user_id = auth.uid())
  );

create policy "sync_records_update_member" on sync_records
  for update to authenticated using (
    shop_id in (select shop_id from shop_devices where auth_user_id = auth.uid())
  );

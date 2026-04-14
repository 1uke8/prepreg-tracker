-- Pre-Preg Material Tracker — Initial Schema
-- Run this in your Supabase SQL editor or via `supabase db push`

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── MATERIALS ────────────────────────────────────────────────────────────────
create table materials (
  id uuid primary key default uuid_generate_v4(),
  part_number text not null,
  description text,
  category text check (category in ('Composite', 'Resin Film', 'Elastomer', 'Adhesive', 'Core')),
  consumption text,
  can_re_life boolean default false,
  track_hours boolean default false,
  track_expiry boolean default false,
  is_logged boolean default false,
  default_width numeric,
  default_preparation_time numeric,
  default_out_life numeric,
  out_life_remaining_short numeric,
  out_life_remaining_critical numeric,
  expiry_days_short numeric,
  expiry_days_critical numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── BATCHES ──────────────────────────────────────────────────────────────────
create table batches (
  id uuid primary key default uuid_generate_v4(),
  batch_number text,
  material_id uuid references materials(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── LOCATIONS ────────────────────────────────────────────────────────────────
create table locations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text check (type in ('Freezer', 'Clean Room', 'Production', 'Storage')),
  description text,
  is_freezer boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed default locations
insert into locations (name, type, is_freezer) values
  ('Freezer A', 'Freezer', true),
  ('Freezer B', 'Freezer', true),
  ('Freezer C', 'Freezer', true),
  ('Clean Room', 'Clean Room', false),
  ('Layup Area', 'Production', false),
  ('Cure Area', 'Production', false);

-- ─── STOCKS ───────────────────────────────────────────────────────────────────
create table stocks (
  id uuid primary key default uuid_generate_v4(),
  stock_id text not null unique,
  roll_number text,
  batch_id uuid references batches(id),
  batch_number text,
  material_id uuid references materials(id),
  material_name text,
  description text,
  location text,
  quantity numeric,
  width_mm numeric,
  length_m numeric,
  expiry_date date,
  manufacture_date date,
  out_life numeric,
  archived boolean default false,
  notes text,
  attachments text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── KITS ─────────────────────────────────────────────────────────────────────
create table kits (
  id uuid primary key default uuid_generate_v4(),
  part_number text not null,
  description text,
  order_number text,
  status text default 'Pending' check (status in ('Pending', 'In Progress', 'Ready', 'Issued', 'Cancelled')),
  location text,
  cure_by_date date,
  comments text,
  materials jsonb default '[]',
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── TRANSFERS ────────────────────────────────────────────────────────────────
create table transfers (
  id uuid primary key default uuid_generate_v4(),
  transfer_number text,
  group_id text,
  item_type text default 'stock' check (item_type in ('stock', 'kit')),
  stock_id text,
  kit_id uuid references kits(id),
  material_name text,
  batch_number text,
  from_location text not null,
  to_location text not null,
  quantity numeric,
  unit text,
  transfer_date timestamptz,
  out_time_start timestamptz,
  out_time_end timestamptz,
  reason text,
  transferred_by text,
  status text default 'Completed' check (status in ('Pending', 'In Transit', 'Completed', 'Cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── SETTINGS ─────────────────────────────────────────────────────────────────
create table settings (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── AUTO-UPDATE updated_at ───────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger materials_updated_at before update on materials for each row execute function update_updated_at();
create trigger batches_updated_at before update on batches for each row execute function update_updated_at();
create trigger locations_updated_at before update on locations for each row execute function update_updated_at();
create trigger stocks_updated_at before update on stocks for each row execute function update_updated_at();
create trigger kits_updated_at before update on kits for each row execute function update_updated_at();
create trigger transfers_updated_at before update on transfers for each row execute function update_updated_at();
create trigger settings_updated_at before update on settings for each row execute function update_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Start with public read/write for single-team use. Lock down per-user later.
alter table materials enable row level security;
alter table batches enable row level security;
alter table locations enable row level security;
alter table stocks enable row level security;
alter table kits enable row level security;
alter table transfers enable row level security;
alter table settings enable row level security;

-- Allow all for authenticated users (tighten later)
create policy "authenticated_all" on materials for all to authenticated using (true) with check (true);
create policy "authenticated_all" on batches for all to authenticated using (true) with check (true);
create policy "authenticated_all" on locations for all to authenticated using (true) with check (true);
create policy "authenticated_all" on stocks for all to authenticated using (true) with check (true);
create policy "authenticated_all" on kits for all to authenticated using (true) with check (true);
create policy "authenticated_all" on transfers for all to authenticated using (true) with check (true);
create policy "authenticated_all" on settings for all to authenticated using (true) with check (true);

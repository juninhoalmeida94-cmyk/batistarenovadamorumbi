-- PIBR Morumbi V3.3 — Interessados em Célula
-- A parte Mídia/Galeria já está aplicada no projeto Supabase conectado.

create table if not exists public.pibr_cell_interests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  location_text text,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','referred','integrated','archived')),
  assigned_leader_id uuid references public.pibr_leaders(id) on delete set null,
  assigned_cell_id uuid references public.pibr_cells(id) on delete set null,
  source text not null default 'site',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pibr_cell_interests enable row level security;
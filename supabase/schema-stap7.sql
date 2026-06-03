-- =============================================================================
-- Wandelapp — Stap 7: database-schema
-- =============================================================================
-- Wat doet dit bestand?
--   Maakt 3 tabellen: profielen, routes, wandelingen (geschiedenis).
--   Zet beveiliging aan (RLS) zodat niet iedereen alles kan lezen.
--
-- Hoe gebruiken?
--   1. Maak een Supabase-project aan (zie docs/07-supabase-setup.md)
--   2. Dashboard → SQL Editor → New query → plak ALLES → Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Uitbreidingen (standaard bij Supabase)
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tabel: profiles (profielen)
-- -----------------------------------------------------------------------------
-- Eén rij per ingelogde gebruiker. Koppelt aan Supabase Auth (stap 8).
-- Zonder account: deze tabel blijft leeg; wandelen kan nog lokaal in de app.
-- -----------------------------------------------------------------------------
create table public.profiles (
  -- Zelfde id als auth.users — zo weet Supabase wie bij welk profiel hoort
  id uuid primary key references auth.users (id) on delete cascade,

  -- Optionele weergavenaam (geen verplichting, geen gamification)
  display_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Gebruikersprofiel; gekoppeld aan Supabase Auth (stap 8).';

-- -----------------------------------------------------------------------------
-- Tabel: routes (dynamische rondwandelingen)
-- -----------------------------------------------------------------------------
-- Elke gegenereerde route van de API (POST /api/route).
-- coordinates = zelfde formaat als de app: [[lng, lat], [lng, lat], ...]
-- -----------------------------------------------------------------------------
create table public.routes (
  id uuid primary key default gen_random_uuid(),

  -- Ingelogde gebruiker (null = nog geen account)
  user_id uuid references auth.users (id) on delete set null,

  -- Tijdelijk id op dit apparaat (localStorage), tot je inlogt (stap 8)
  guest_id uuid,

  -- Gekozen duur-knop: 15, 20, 25 of 30
  chosen_minutes smallint not null
    check (chosen_minutes in (15, 20, 25, 30)),

  -- Geschatte looptijd en afstand van deze route (van OpenRouteService)
  duration_minutes integer not null check (duration_minutes > 0),
  distance_km numeric(6, 2) not null check (distance_km >= 0),

  -- Startpunt van de rondwandeling
  start_lat double precision not null,
  start_lng double precision not null,

  -- Volledige route als lijst punten (JSON)
  coordinates jsonb not null,

  -- Eerste aanwijzing, bv. "Ga naar rechts" (optioneel)
  start_instruction text,

  created_at timestamptz not null default now(),

  -- Ofwel ingelogd, ofwel gast-id — niet beide tegelijk leeg bij opslaan
  constraint routes_owner_check check (
    user_id is not null or guest_id is not null
  )
);

comment on table public.routes is 'Opgeslagen rondwandelingen (API + coördinaten).';
comment on column public.routes.coordinates is 'Array van [lng, lat] — zelfde als server/routeApi response.';

create index routes_user_id_idx on public.routes (user_id);
create index routes_guest_id_idx on public.routes (guest_id);
create index routes_created_at_idx on public.routes (created_at desc);

-- -----------------------------------------------------------------------------
-- Tabel: walks (wandelgeschiedenis)
-- -----------------------------------------------------------------------------
-- Eén rij per afgeronde wandeling. Geen scores, geen streaks — alleen feiten.
-- -----------------------------------------------------------------------------
create table public.walks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users (id) on delete set null,
  guest_id uuid,

  -- Welke route is gelopen (mag null als route later wordt opgeruimd)
  route_id uuid references public.routes (id) on delete set null,

  chosen_minutes smallint not null
    check (chosen_minutes in (15, 20, 25, 30)),

  -- Hoe lang je echt hebt gelopen (minuten, afgerond)
  walked_minutes integer not null check (walked_minutes > 0),

  started_at timestamptz not null,
  finished_at timestamptz not null,

  created_at timestamptz not null default now(),

  constraint walks_owner_check check (
    user_id is not null or guest_id is not null
  ),
  constraint walks_time_order check (finished_at >= started_at)
);

comment on table public.walks is 'Afgeronde wandelingen — geschiedenis zonder prestatiedruk.';

create index walks_user_id_idx on public.walks (user_id);
create index walks_guest_id_idx on public.walks (guest_id);
create index walks_finished_at_idx on public.walks (finished_at desc);

-- -----------------------------------------------------------------------------
-- Automatisch profiel aanmaken bij nieuwe gebruiker (stap 8)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

comment on function public.handle_new_user is 'Maakt een profielrij aan zodra iemand zich registreert.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- updated_at bijwerken op profiel
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS) — wie mag wat zien?
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.routes enable row level security;
alter table public.walks enable row level security;

-- --- Profielen: alleen je eigen profiel ---
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- --- Routes: ingelogde gebruiker = alleen eigen routes ---
create policy "routes_select_own_user"
  on public.routes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "routes_insert_own_user"
  on public.routes for insert
  to authenticated
  with check (auth.uid() = user_id and guest_id is null);

create policy "routes_update_own_user"
  on public.routes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "routes_delete_own_user"
  on public.routes for delete
  to authenticated
  using (auth.uid() = user_id);

-- --- Wandelingen: ingelogde gebruiker = alleen eigen geschiedenis ---
create policy "walks_select_own_user"
  on public.walks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "walks_insert_own_user"
  on public.walks for insert
  to authenticated
  with check (auth.uid() = user_id and guest_id is null);

create policy "walks_update_own_user"
  on public.walks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "walks_delete_own_user"
  on public.walks for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Na stap 8 in de app
-- -----------------------------------------------------------------------------
-- Zet in Supabase Authentication → Providers → Anonymous sign-ins AAN.
-- De app logt dan stil in (geen scherm) en vult user_id bij routes/walks.
-- Zie docs/08-supabase-auth.md
-- -----------------------------------------------------------------------------

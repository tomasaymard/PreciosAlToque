-- =====================================================================
-- Precios al Toque — puntuaciones de comercios (estrellas)
-- =====================================================================
-- Pegar este archivo entero en Supabase Dashboard → SQL Editor → Run.
-- Idempotente: se puede correr más de una vez sin romper nada.
--
-- Reglas de negocio:
--   - Cualquiera puede LEER las puntuaciones (para calcular promedios).
--   - Solo usuarios logueados pueden puntuar (clientes o comerciantes).
--   - Una puntuación por usuario por comercio (si vuelve a puntuar, pisa
--     la anterior vía upsert).
--   - Un comerciante NO puede puntuar su propio comercio.
-- =====================================================================

create table if not exists public.ratings (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  stars        int not null check (stars between 1 and 5),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists ratings_one_per_user
  on public.ratings(business_id, user_id);

create index if not exists ratings_business_idx
  on public.ratings(business_id);

-- Mantener updated_at al día cuando alguien cambia su puntuación
create or replace function public.touch_rating()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_rating on public.ratings;
create trigger trg_touch_rating
  before update on public.ratings
  for each row
  execute function public.touch_rating();

-- Row Level Security
alter table public.ratings enable row level security;

drop policy if exists "ratings_select_public" on public.ratings;
create policy "ratings_select_public"
  on public.ratings for select
  using (true);

-- Insertar: solo la propia puntuación, y nunca sobre el comercio propio
drop policy if exists "ratings_insert_own" on public.ratings;
create policy "ratings_insert_own"
  on public.ratings for insert
  with check (
    auth.uid() = user_id
    and business_id not in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

drop policy if exists "ratings_update_own" on public.ratings;
create policy "ratings_update_own"
  on public.ratings for update
  using (auth.uid() = user_id);

drop policy if exists "ratings_delete_own" on public.ratings;
create policy "ratings_delete_own"
  on public.ratings for delete
  using (auth.uid() = user_id);

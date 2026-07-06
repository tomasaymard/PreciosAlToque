-- ============================================================
-- Precios al Toque - TODO LO PENDIENTE EN UN SOLO ARCHIVO
-- (ratings + rubro de comercio + categorias de producto)
-- Pegar entero en Supabase SQL Editor y correr una sola vez.
-- Idempotente: correrlo de nuevo no rompe nada.
-- ============================================================


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


-- =====================================================================
-- Precios al Toque — rubro del comercio
-- =====================================================================
-- Pegar en Supabase Dashboard → SQL Editor → Run. Idempotente.
--
-- Agrega una columna `category` (rubro: panadería, kiosco, verdulería...) a
-- businesses. Es texto libre validado del lado de la app contra una lista fija
-- (lib/categories.ts). No hace falta tocar RLS: la política de UPDATE por dueño
-- que ya existe cubre esta columna.
-- =====================================================================

alter table public.businesses
  add column if not exists category text;

-- Etiquetas de rubro a los comercios demo, para que los filtros muestren algo
-- antes de que se registren comercios reales. Solo toca los seed (owner_id null).
update public.businesses set category = 'verduleria'
  where owner_id is null and name = 'Verdulería Don Pepe' and category is null;
update public.businesses set category = 'almacen'
  where owner_id is null and name = 'Supermercado Chino' and category is null;
update public.businesses set category = 'panaderia'
  where owner_id is null and name = 'Panadería El Sol' and category is null;
update public.businesses set category = 'almacen'
  where owner_id is null and name = 'Almacén de Doña Rosa' and category is null;


-- =====================================================================
-- Precios al Toque — categorías de productos
-- =====================================================================
-- Pegar en Supabase Dashboard → SQL Editor → Run. Idempotente.
--
-- Agrega categoría y subcategoría (opcionales) a cada precio. El nombre del
-- producto sigue siendo texto libre: la categoría lo complementa, no lo
-- reemplaza. La lista de categorías vive en la app (lib/product-categories.ts).
-- No hace falta tocar RLS: las policies de prices ya cubren estas columnas.
-- =====================================================================

alter table public.prices
  add column if not exists category text;

alter table public.prices
  add column if not exists subcategory text;

create index if not exists prices_category_idx
  on public.prices(category);

-- Etiquetamos los precios demo para que los filtros muestren algo desde el
-- primer día. Solo toca precios de los comercios seed (owner_id null).
update public.prices p set category = 'frutas-verduras', subcategory = 'frutas'
  from public.businesses b
  where p.business_id = b.id and b.owner_id is null
    and p.product_name in ('banana', 'manzana') and p.category is null;

update public.prices p set category = 'lacteos', subcategory = 'leches'
  from public.businesses b
  where p.business_id = b.id and b.owner_id is null
    and p.product_name = 'leche' and p.category is null;

update public.prices p set category = 'almacen', subcategory = 'arroz-legumbres'
  from public.businesses b
  where p.business_id = b.id and b.owner_id is null
    and p.product_name = 'arroz' and p.category is null;

update public.prices p set category = 'panificados', subcategory = 'pan'
  from public.businesses b
  where p.business_id = b.id and b.owner_id is null
    and p.product_name = 'pan' and p.category is null;

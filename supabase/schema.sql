-- =====================================================================
-- Precios al Toque — schema inicial
-- =====================================================================
-- Pegar este archivo entero en Supabase Dashboard → SQL Editor → Run.
-- Se puede correr varias veces sin romper nada (todo está con IF NOT
-- EXISTS / DROP IF EXISTS donde corresponde).
-- =====================================================================


-- ---------------------------------------------------------------------
-- TABLA: businesses
-- ---------------------------------------------------------------------
-- Cada fila es un comercio. owner_id apunta al usuario de auth.users
-- que lo creó (su "dueño"). Un usuario tiene un negocio (al menos por
-- ahora; la columna es nullable porque los negocios "seed" no tienen
-- dueño todavía).
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) on delete cascade,
  name        text not null,
  address     text,
  lat         numeric(9, 6),
  lon         numeric(9, 6),
  created_at  timestamptz not null default now()
);

-- Un usuario solo puede ser dueño de un negocio (simplificación de la v1).
create unique index if not exists businesses_one_per_owner
  on public.businesses(owner_id)
  where owner_id is not null;


-- ---------------------------------------------------------------------
-- TABLA: prices
-- ---------------------------------------------------------------------
-- Cada fila es un precio que un comercio cargó para un producto.
-- product_name es texto libre (banana, leche, etc.) y se normaliza a
-- minúsculas con un trigger para que la búsqueda funcione bien.
-- Un comercio solo puede tener un precio activo por producto: si vuelve
-- a cargar el mismo producto, se hace UPDATE (lo manejamos con un
-- unique constraint + upsert desde el cliente).
create table if not exists public.prices (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  product_name  text not null,
  price         numeric(12, 2) not null check (price >= 0),
  unit          text not null default 'la unidad',
  updated_at    timestamptz not null default now()
);

create unique index if not exists prices_business_product_unique
  on public.prices(business_id, product_name);

create index if not exists prices_product_name_idx
  on public.prices(product_name);


-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------
-- Normalizar product_name a minúsculas y trimear espacios al insertar/actualizar
create or replace function public.normalize_product_name()
returns trigger
language plpgsql
as $$
begin
  new.product_name := lower(trim(new.product_name));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_normalize_product_name on public.prices;
create trigger trg_normalize_product_name
  before insert or update on public.prices
  for each row
  execute function public.normalize_product_name();


-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------
-- RLS es el mecanismo de Postgres que controla qué filas puede ver/tocar
-- cada usuario. La política base de Supabase es: con RLS habilitado y
-- sin policies, NADIE puede leer nada. Hay que dejar explícito qué se
-- permite.
--
-- Para Precios al Toque:
--   - businesses + prices son LECTURA PÚBLICA (cualquier consumidor que
--     abre la app, esté logueado o no, ve todos los comercios y precios).
--   - Solo el dueño de un comercio puede modificar SU comercio o SUS
--     precios.

alter table public.businesses enable row level security;
alter table public.prices enable row level security;

-- Lectura pública de businesses
drop policy if exists "businesses_select_public" on public.businesses;
create policy "businesses_select_public"
  on public.businesses for select
  using (true);

-- Solo el dueño puede crear/modificar/borrar su negocio
drop policy if exists "businesses_insert_own" on public.businesses;
create policy "businesses_insert_own"
  on public.businesses for insert
  with check (auth.uid() = owner_id);

drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own"
  on public.businesses for update
  using (auth.uid() = owner_id);

drop policy if exists "businesses_delete_own" on public.businesses;
create policy "businesses_delete_own"
  on public.businesses for delete
  using (auth.uid() = owner_id);

-- Lectura pública de prices
drop policy if exists "prices_select_public" on public.prices;
create policy "prices_select_public"
  on public.prices for select
  using (true);

-- Solo el dueño del comercio puede insertar/modificar/borrar precios
drop policy if exists "prices_insert_own" on public.prices;
create policy "prices_insert_own"
  on public.prices for insert
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

drop policy if exists "prices_update_own" on public.prices;
create policy "prices_update_own"
  on public.prices for update
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

drop policy if exists "prices_delete_own" on public.prices;
create policy "prices_delete_own"
  on public.prices for delete
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------
-- DATOS DEMO (seed)
-- ---------------------------------------------------------------------
-- 4 comercios sin dueño + algunos precios, así la app tiene contenido
-- visible para los consumidores antes de que se registre el primer
-- comerciante real. Estos datos se pueden borrar más adelante.
--
-- Para que el seed sea idempotente usamos nombres fijos como "clave"
-- de detección de duplicado: si ya existe un comercio con ese nombre
-- y sin dueño, no lo insertamos de nuevo.

insert into public.businesses (name, address, lat, lon)
select v.name, v.address, v.lat, v.lon
from (values
  ('Verdulería Don Pepe',     'Av. Corrientes 3000',  -34.60::numeric,  -58.42::numeric),
  ('Supermercado Chino',      'Calle Honduras 150',   -34.61::numeric,  -58.41::numeric),
  ('Panadería El Sol',        'Esquina Rivadavia',    -34.605::numeric, -58.425::numeric),
  ('Almacén de Doña Rosa',    'Pasaje Sarmiento 12',  -34.615::numeric, -58.43::numeric)
) as v(name, address, lat, lon)
where not exists (
  select 1 from public.businesses b where b.name = v.name and b.owner_id is null
);

-- Precios demo: insertados con un select que vincula cada producto a su
-- comercio por nombre (porque no conocemos los uuid hasta que se crean)
insert into public.prices (business_id, product_name, price, unit)
select b.id, v.product, v.price, v.unit
from (values
  ('Verdulería Don Pepe',  'banana',  1500::numeric, 'el kilo'),
  ('Verdulería Don Pepe',  'manzana', 1800::numeric, 'el kilo'),
  ('Supermercado Chino',   'leche',    950::numeric, 'el litro'),
  ('Supermercado Chino',   'arroz',   2300::numeric, 'el kilo'),
  ('Panadería El Sol',     'pan',     2100::numeric, 'el kilo'),
  ('Almacén de Doña Rosa', 'leche',   1050::numeric, 'el litro'),
  ('Almacén de Doña Rosa', 'pan',     1900::numeric, 'el kilo')
) as v(business_name, product, price, unit)
join public.businesses b on b.name = v.business_name and b.owner_id is null
where not exists (
  select 1 from public.prices p
  where p.business_id = b.id and p.product_name = v.product
);

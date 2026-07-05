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

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

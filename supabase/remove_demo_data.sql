-- =====================================================================
-- Precios al Toque — eliminar los comercios demo
-- =====================================================================
-- Decisión de producto (2026-07-06): antes de sumar comercios reales, se
-- borran los 4 comercios de prueba sembrados por schema.sql.
--
-- Los comercios demo son los únicos con owner_id NULL (todo comercio real
-- se crea desde la app con su dueño). El borrado arrastra en cascada sus
-- precios y puntuaciones (FKs con ON DELETE CASCADE).
-- =====================================================================

delete from public.businesses where owner_id is null;

-- =====================================================================
-- Precios al Toque — tabla de "latido" para el keepalive
-- =====================================================================
-- Pegar en Supabase SQL Editor → Run. Idempotente.
--
-- Por qué existe: el plan gratuito de Supabase pausa el proyecto tras 7 días
-- sin actividad. Descubrimos (2026-07-14) que las consultas de SOLO LECTURA
-- NO cuentan como actividad — solo las ESCRITURAS resetean el reloj. Esta
-- tabla tiene una sola fila con un timestamp que el workflow de GitHub
-- actualiza periódicamente (un UPDATE = escritura real en la base).
--
-- Seguridad: la fila solo guarda una marca de tiempo. La policy permite UPDATE
-- anónimo únicamente (no insert/delete/select), así que lo peor que alguien
-- podría hacer es cambiar la fecha del latido. Inofensivo.
-- =====================================================================

create table if not exists public.keepalive (
  id         int primary key,
  last_ping  timestamptz not null default now()
);

-- Fila única (id = 1). Si ya existe, no la duplica.
insert into public.keepalive (id, last_ping)
  values (1, now())
  on conflict (id) do nothing;

alter table public.keepalive enable row level security;

-- Solo se permite UPDATE anónimo de la fila del latido. Sin policy de insert
-- ni delete, esas operaciones quedan bloqueadas para la clave pública.
drop policy if exists "keepalive_update_anon" on public.keepalive;
create policy "keepalive_update_anon"
  on public.keepalive for update
  using (true)
  with check (true);

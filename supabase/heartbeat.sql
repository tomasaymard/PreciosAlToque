-- =====================================================================
-- Precios al Toque — tabla de latido (keepalive)
-- =====================================================================
-- Pegar en Supabase Dashboard → SQL Editor → Run. Idempotente.
--
-- POR QUÉ EXISTE: el plan gratuito de Supabase pausa el proyecto tras ~7 días
-- sin actividad. Nuestro primer intento de keepalive hacía una LECTURA por la
-- API y no alcanzó: Supabase no cuenta los SELECT como actividad suficiente
-- (el proyecto se pausó igual el 2026-07-14 pese a que el workflow corría OK).
--
-- Esta tabla existe para que el workflow haga una ESCRITURA real dos veces por
-- semana. Guarda una sola fila que se va pisando (id fijo = 1).
--
-- Seguridad: la policy permite update anónimo SOLO de esta fila y SOLO de la
-- columna beat_at (por el WITH CHECK sobre id). No expone ningún dato del
-- negocio: es un contador de latidos.
-- =====================================================================

create table if not exists public.heartbeat (
  id      int primary key default 1,
  beat_at timestamptz not null default now(),
  constraint heartbeat_single_row check (id = 1)
);

insert into public.heartbeat (id, beat_at)
  values (1, now())
  on conflict (id) do nothing;

alter table public.heartbeat enable row level security;

drop policy if exists "heartbeat_select_public" on public.heartbeat;
create policy "heartbeat_select_public"
  on public.heartbeat for select
  using (true);

drop policy if exists "heartbeat_update_public" on public.heartbeat;
create policy "heartbeat_update_public"
  on public.heartbeat for update
  using (id = 1)
  with check (id = 1);

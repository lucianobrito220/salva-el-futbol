-- =========================================================
-- MIGRACIÓN 004 — correr en Supabase SQL Editor una sola vez.
-- Habilita: login con Google, página pública de partido sin login,
-- y deja preparado lo necesario para "repetir partido".
-- =========================================================

-- 1) El trigger de usuario nuevo ahora también entiende los datos
--    que manda Google (name/full_name, avatar_url/picture), no solo
--    los del registro por email.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, phone, city, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Jugador'),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'city', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 2) Permitir que cualquiera (sin cuenta) pueda VER los partidos —
--    necesario para que el link que se comparte por WhatsApp muestre
--    algo antes de pedir registro. No expone nada sensible: ciudad,
--    zona, cancha, fecha, precio y nivel ya eran datos para compartir.
drop policy if exists "matches_select_anon" on public.matches;
drop policy if exists "matches_select_public" on public.matches;
create policy "matches_select_public" on public.matches
  for select using (true);

-- 3) Función pública y acotada: da SOLO nombre y foto del organizador
--    de un partido puntual (nunca el teléfono, nunca la lista completa
--    de usuarios) para mostrar en la vista pública del partido.
create or replace function public.get_public_match_organizer(p_match_id uuid)
returns table(name text, avatar_url text) as $$
  select p.name, p.avatar_url
  from public.matches m
  join public.profiles p on p.id = m.organizer_id
  where m.id = p_match_id;
$$ language sql security definer stable;

grant execute on function public.get_public_match_organizer(uuid) to anon, authenticated;

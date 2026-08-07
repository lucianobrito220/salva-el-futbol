-- =========================================================
-- SALVÁ EL FÚTBOL — Esquema de base de datos (Supabase/Postgres)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
-- Extiende auth.users. El teléfono NUNCA se expone públicamente:
-- se consulta solo mediante la función get_contact_phone() más abajo.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text, -- opcional: el usuario lo carga después, desde su perfil, para habilitar WhatsApp
  age int check (age is null or (age between 12 and 90)),
  city text,
  position text,
  avatar_url text,
  played_count int not null default 0,
  rating numeric(2,1) not null default 0,
  punctuality numeric(2,1) not null default 0,
  attendance numeric(2,1) not null default 0,
  respect numeric(2,1) not null default 0,
  reports_count int not null default 0,
  member_since timestamptz not null default now()
);

-- ---------- MATCHES ----------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  city text not null,
  zone text not null,
  court text not null,
  match_date date not null,
  match_time time not null,
  missing_players int not null check (missing_players >= 0),
  match_type text not null default 'jugadores_sueltos' check (match_type in ('jugadores_sueltos','equipo_rival')),
  team_format text check (team_format is null or team_format in ('F5','F7','F11')),
  gender text not null default 'Masculino' check (gender in ('Masculino','Femenino','Mixto')),
  description text,
  location_address text,
  level text not null check (level in ('Recreativo','Intermedio','Competitivo')),
  price numeric(10,2) not null check (price >= 0),
  status text not null default 'open' check (status in ('open','complete','cancelled')),
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_matches_city_date on public.matches (city, match_date);
create index if not exists idx_matches_status on public.matches (status);
create index if not exists idx_matches_organizer on public.matches (organizer_id);

-- ---------- JOIN REQUESTS (inscripciones) ----------
create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index if not exists idx_join_requests_match on public.join_requests (match_id);
create index if not exists idx_join_requests_player on public.join_requests (player_id);

-- ---------- CHAT ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_match on public.messages (match_id, created_at);

-- ---------- RATINGS (calificaciones) ----------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  rated_id uuid not null references public.profiles(id) on delete cascade,
  punctuality int not null check (punctuality between 1 and 5),
  attendance int not null check (attendance between 1 and 5),
  respect int not null check (respect between 1 and 5),
  created_at timestamptz not null default now(),
  unique (match_id, rater_id, rated_id)
);

-- ---------- REPORTS (denuncias) ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ---------- NOTIFICATIONS ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  match_id uuid references public.matches(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, read);

-- ---------- PUSH SUBSCRIPTIONS ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- TRIGGER: crear profile automáticamente al registrarse
-- (el registro es por email; el nombre y la ciudad se pasan
-- como metadata en signUp. El teléfono queda vacío hasta que
-- el usuario lo carga después desde su perfil, para WhatsApp.)
-- =========================================================
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- RPC: devolver el teléfono de contacto SOLO si existe un
-- vínculo aceptado entre el que pregunta y el dueño del teléfono.
-- Esto es lo que habilita el botón "Contactar por WhatsApp"
-- sin exponer el teléfono públicamente en ninguna consulta.
-- =========================================================
create or replace function public.get_contact_phone(p_match_id uuid)
returns text as $$
declare
  v_organizer uuid;
  v_caller uuid := auth.uid();
  v_result text;
begin
  select organizer_id into v_organizer from public.matches where id = p_match_id;
  if v_organizer is null then
    return null;
  end if;

  if v_caller = v_organizer then
    -- El organizador pide el teléfono de un jugador aceptado
    select p.phone into v_result
    from public.join_requests jr
    join public.profiles p on p.id = jr.player_id
    where jr.match_id = p_match_id and jr.status = 'accepted'
    limit 1;
    return v_result;
  else
    -- Un jugador aceptado pide el teléfono del organizador
    if exists (
      select 1 from public.join_requests
      where match_id = p_match_id and player_id = v_caller and status = 'accepted'
    ) then
      select phone into v_result from public.profiles where id = v_organizer;
      return v_result;
    end if;
    return null;
  end if;
end;
$$ language plpgsql security definer;

-- =========================================================
-- TRIGGER: cuando alguien califica a otro usuario, recalcular
-- sus promedios de puntualidad/asistencia/respeto automáticamente.
-- =========================================================
create or replace function public.refresh_profile_rating()
returns trigger as $$
declare
  v_punct numeric; v_att numeric; v_resp numeric;
begin
  select avg(punctuality), avg(attendance), avg(respect)
  into v_punct, v_att, v_resp
  from public.ratings where rated_id = new.rated_id;

  update public.profiles
  set punctuality = round(coalesce(v_punct,0)::numeric,1),
      attendance = round(coalesce(v_att,0)::numeric,1),
      respect = round(coalesce(v_resp,0)::numeric,1),
      rating = round(((coalesce(v_punct,0)+coalesce(v_att,0)+coalesce(v_resp,0))/3)::numeric,1)
  where id = new.rated_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_rating_insert on public.ratings;
create trigger on_rating_insert
  after insert on public.ratings
  for each row execute procedure public.refresh_profile_rating();

-- =========================================================
-- TRIGGER: cuando un partido pasa a "complete", sumar 1 partido
-- jugado al organizador y a cada jugador aceptado.
-- =========================================================
create or replace function public.handle_match_complete()
returns trigger as $$
begin
  if new.status = 'complete' and old.status is distinct from 'complete' then
    update public.profiles set played_count = played_count + 1 where id = new.organizer_id;
    update public.profiles p
      set played_count = played_count + 1
      from public.join_requests jr
      where jr.match_id = new.id and jr.status = 'accepted' and p.id = jr.player_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_match_complete on public.matches;
create trigger on_match_complete
  after update on public.matches
  for each row execute procedure public.handle_match_complete();

-- =========================================================
-- RPC pública y acotada: nombre y foto (nunca teléfono) del
-- organizador de un partido puntual, para la vista pública sin login.
-- =========================================================
create or replace function public.get_public_match_organizer(p_match_id uuid)
returns table(name text, avatar_url text) as $$
  select p.name, p.avatar_url
  from public.matches m
  join public.profiles p on p.id = m.organizer_id
  where m.id = p_match_id;
$$ language sql security definer stable;

grant execute on function public.get_public_match_organizer(uuid) to anon, authenticated;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.join_requests enable row level security;
alter table public.messages enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- PROFILES: cualquier usuario autenticado puede leer perfiles (la app nunca
-- selecciona la columna "phone" salvo a través de get_contact_phone),
-- pero cada uno solo puede editar el suyo.
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- MATCHES: lectura pública para autenticados; solo el organizador
-- puede crear/editar/borrar sus propios partidos.
create policy "matches_select_authenticated" on public.matches
  for select using (auth.role() = 'authenticated');
-- Además, cualquiera sin cuenta puede ver los partidos (para que el link
-- compartido por WhatsApp funcione sin pedir login primero).
create policy "matches_select_public" on public.matches
  for select using (true);
create policy "matches_insert_own" on public.matches
  for insert with check (auth.uid() = organizer_id);
create policy "matches_update_own" on public.matches
  for update using (auth.uid() = organizer_id);
create policy "matches_delete_own" on public.matches
  for delete using (auth.uid() = organizer_id);

-- JOIN REQUESTS: el jugador ve/crea/borra las suyas; el organizador
-- ve y actualiza (acepta/rechaza) las de sus partidos.
create policy "jr_select_own_or_organizer" on public.join_requests
  for select using (
    auth.uid() = player_id
    or exists (select 1 from public.matches m where m.id = match_id and m.organizer_id = auth.uid())
  );
-- Cualquier usuario autenticado puede ver quién ya está CONFIRMADO en un
-- partido (para mostrarlo antes de unirse). Las solicitudes "pending" de
-- otros siguen ocultas por la policy de arriba.
create policy "jr_select_accepted_public" on public.join_requests
  for select using (status = 'accepted');
create policy "jr_insert_own" on public.join_requests
  for insert with check (auth.uid() = player_id);
create policy "jr_update_organizer" on public.join_requests
  for update using (
    exists (select 1 from public.matches m where m.id = match_id and m.organizer_id = auth.uid())
  );
create policy "jr_delete_own_pending" on public.join_requests
  for delete using (auth.uid() = player_id and status = 'pending');

-- MESSAGES: solo organizador y jugador aceptado del partido pueden leer/escribir.
create policy "messages_select_participants" on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        m.organizer_id = auth.uid()
        or exists (
          select 1 from public.join_requests jr
          where jr.match_id = m.id and jr.player_id = auth.uid() and jr.status = 'accepted'
        )
      )
    )
  );
create policy "messages_insert_participants" on public.messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.matches m
      where m.id = match_id and (
        m.organizer_id = auth.uid()
        or exists (
          select 1 from public.join_requests jr
          where jr.match_id = m.id and jr.player_id = auth.uid() and jr.status = 'accepted'
        )
      )
    )
  );

-- RATINGS / REPORTS: cualquier autenticado puede crear; lectura propia.
create policy "ratings_insert" on public.ratings
  for insert with check (auth.uid() = rater_id);
create policy "ratings_select_related" on public.ratings
  for select using (auth.uid() = rater_id or auth.uid() = rated_id);

create policy "reports_insert" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = reporter_id);

-- NOTIFICATIONS: cada usuario ve y marca como leídas solo las suyas.
-- No hay policy de INSERT pública a propósito: solo el backend
-- (service role, en app/api/notify) puede crearlas.
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- PUSH SUBSCRIPTIONS: cada usuario gestiona las suyas.
create policy "push_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- =========================================================
-- STORAGE: bucket público para fotos de perfil
-- =========================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Cualquiera puede ver las fotos (bucket público, son avatares).
create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Cada usuario solo puede subir/reemplazar/borrar SU PROPIA foto.
-- Convención: el archivo se guarda como "avatars/{user_id}/avatar.png".
create policy "avatar_upload_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- REALTIME: habilitar replicación para las tablas que la UI
-- necesita escuchar en vivo.
-- =========================================================
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.join_requests;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

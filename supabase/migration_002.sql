-- =========================================================
-- MIGRACIÓN 002 — correr en Supabase SQL Editor una sola vez
-- si tu base de datos ya estaba creada con una versión anterior.
-- =========================================================

alter table public.matches add column if not exists reminder_sent boolean not null default false;

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

drop policy if exists "jr_select_accepted_public" on public.join_requests;
create policy "jr_select_accepted_public" on public.join_requests
  for select using (status = 'accepted');

-- =========================================================
-- MIGRACIÓN 005 — correr en Supabase SQL Editor una sola vez.
-- Agrega: tipo de partido (jugadores sueltos / equipo rival),
-- formato (F5/F7/F11), descripción, género y ubicación.
-- =========================================================

alter table public.matches add column if not exists match_type text not null default 'jugadores_sueltos'
  check (match_type in ('jugadores_sueltos','equipo_rival'));

alter table public.matches add column if not exists team_format text
  check (team_format is null or team_format in ('F5','F7','F11'));

alter table public.matches add column if not exists description text;

alter table public.matches add column if not exists gender text not null default 'Masculino'
  check (gender in ('Masculino','Femenino','Mixto'));

alter table public.matches add column if not exists location_address text;

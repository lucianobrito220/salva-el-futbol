-- =========================================================
-- MIGRACIÓN 003 — correr en Supabase SQL Editor una sola vez.
-- =========================================================

alter table public.profiles add column if not exists age int check (age is null or (age between 12 and 90));

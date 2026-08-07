import { createClient } from '@supabase/supabase-js';

// Cliente para usar SOLO dentro de Server Components (sin 'use client').
// Usa la anon key (no la service role) — respeta las mismas reglas de
// seguridad (RLS) que el cliente del navegador, simplemente corre en el
// servidor para poder generar la vista pública/SEO del partido.
export function getPublicServerClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

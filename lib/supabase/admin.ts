import { createClient, SupabaseClient } from '@supabase/supabase-js';

// SOLO usar dentro de app/api/* (código de servidor).
// La service role key salta RLS: nunca debe llegar al navegador.
//
// Se crea "perezosamente" (recién cuando se usa, no al importar el
// archivo) para que un despliegue nunca falle en el paso de build por
// falta momentánea de variables de entorno.
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Cargalas en Vercel → Settings → Environment Variables (para Production, Preview y Development) y volvé a desplegar.'
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

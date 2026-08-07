'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cliente para el navegador: usa la anon key (segura para exponer).
// Todo el acceso real a los datos queda controlado por Row Level Security
// definido en supabase/schema.sql — esta key sola no permite saltarse nada.
//
// Se crea recién cuando algo lo usa (no al importar el archivo) para que
// el paso de build de Next.js nunca se caiga por variables de entorno
// que todavía no estén disponibles en ese momento.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. En Vercel: Settings → Environment Variables → revisá que estén tildadas para Production, Preview y Development, y volvé a desplegar.'
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

// Proxy: se comporta igual que el cliente real (supabase.from(...), supabase.auth...)
// pero recién crea la conexión la primera vez que se usa.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const real = getClient();
    // @ts-expect-error acceso dinámico a la propiedad real del cliente
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

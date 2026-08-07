# Salvá el Fútbol

App real (no prototipo local): Next.js 14 + Supabase (Postgres + Auth + Realtime) + Web Push.
Múltiples usuarios en distintos celulares comparten la misma base de datos y ven los
cambios en vivo (nuevo partido, jugador aceptado, mensajes de chat).

## 1. Crear el proyecto en Supabase

1. Andá a https://supabase.com → **New project** (es gratis para empezar).
2. Cuando esté listo, andá a **Project Settings → API** y copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (¡nunca la subas al frontend ni a git!)
3. Andá a **SQL Editor → New query**, pegá todo el contenido de `supabase/schema.sql`
   y ejecutalo. Esto crea las tablas, los índices, las políticas de seguridad (RLS)
   y activa Realtime en las tablas necesarias.

## 2. Registro por email (gratis, sin proveedores externos)

El registro es por **email + contraseña**, con Supabase Auth — no necesita
ningún servicio de pago ni cuenta de SMS.

Antes de probarlo, decidí cómo lo querés:

- **Modo rápido para probar (recomendado al principio):** Authentication →
  Providers → Email → desactivá **"Confirm email"**. Así, al registrarse un
  usuario queda logueado al instante, sin tener que abrir ningún correo.
- **Modo producción (más seguro):** dejá "Confirm email" activado. Supabase le
  manda un mail de confirmación a cada usuario nuevo; hasta que no lo confirma,
  no puede iniciar sesión. La app ya está preparada para este flujo (le avisa
  al usuario que revise su correo).

El número de WhatsApp es **opcional y sin validación**: cada usuario lo carga
después desde su perfil (`app/perfil`), y solo se revela a otro usuario cuando
ya están vinculados por un partido aceptado (misma función `get_contact_phone`
de antes).

## 3. Generar las claves de notificaciones push

Las push reales (las que llegan aunque la app esté cerrada) usan el protocolo
estándar Web Push, con un par de claves VAPID propias tuyas:

```bash
npx web-push generate-vapid-keys
```

Copiá el resultado en tu `.env.local`:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## 4. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Completá las 6 variables con los valores de los pasos 1 y 3.

## 5. Correr en local

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 desde dos navegadores/celulares distintos (o dos
pestañas en modo incógnito) para ver la actualización en tiempo real entre
"usuarios" reales.

## 6. Deploy a producción (Vercel)

1. Subí este proyecto a un repo de GitHub.
2. Andá a https://vercel.com → **New Project** → importá el repo.
3. En **Environment Variables** cargá las mismas 6 variables del `.env.local`.
4. Deploy. Vercel te da un dominio HTTPS (requisito para que funcionen las
   push y el registro de Service Worker).
5. Para instalarla como app (PWA) en iPhone/Android: abrí el link en el
   navegador del celular → "Agregar a pantalla de inicio". Reemplazá los
   íconos de ejemplo en `public/icon-192.png` y `public/icon-512.png` por
   los tuyos antes de publicar.

## Cómo funciona el flujo en tiempo real

1. Un usuario publica un partido (`app/publicar`) → se inserta una fila en la
   tabla `matches` de Supabase (base de datos compartida por todos).
2. Esa inserción dispara `app/api/notify/route.ts` (corre en el servidor), que:
   - crea una notificación en la tabla `notifications` para cada usuario de la
     misma ciudad, y
   - les manda una **push real** al navegador vía Web Push, si tienen las
     notificaciones activadas.
3. Todas las pantallas que listan partidos (`/`, `/buscar`, `/partido/[id]`)
   están suscriptas a Supabase Realtime (`postgres_changes`), así que el
   partido nuevo aparece al instante en todos los celulares conectados, sin
   recargar.
4. Cuando un jugador toca "Quiero unirme", se crea una fila en `join_requests`.
   El organizador la ve en vivo en su panel y puede aceptar/rechazar.
5. Al aceptar, se habilita el chat (tabla `messages`, también en tiempo real)
   y el botón de WhatsApp, que usa la función `get_contact_phone()` para
   revelar el teléfono solo entre las dos personas ya vinculadas — nunca
   públicamente.

## Seguridad implementada

- Row Level Security en todas las tablas (`supabase/schema.sql`): cada usuario
  solo puede editar sus propios datos.
- El teléfono es opcional (se carga desde el perfil, sin validación por SMS)
  y no se expone en consultas normales: solo se revela vía la función
  `get_contact_phone()`, y solo entre organizador ↔ jugador aceptado.
- Sistema de reputación limitado a puntualidad / asistencia / respeto (no
  califica nivel futbolístico), y tabla de denuncias (`reports`) lista para
  usar desde el perfil.

## Qué falta para una versión 1.0 "cerrada"

- Reemplazar los íconos placeholder del manifest por el arte final si querés algo distinto al logo de pelota generado.
- "Más cercano" en la búsqueda hoy es "más próximo en fecha/hora" y "más urgente" (menos jugadores faltantes) —
  para una distancia geográfica real hace falta guardar latitud/longitud de cada partido y pedir ubicación al usuario.

## Recordatorios automáticos (2 horas antes del partido)

Corre solo, sin que nadie abra la app, usando **Vercel Cron** (`vercel.json`),
que llama a `app/api/cron/reminders` una vez por hora. Para activarlo:

1. Agregá la variable `CRON_SECRET` en tu `.env.local` **y** en Vercel (cualquier
   texto largo al azar). Vercel se encarga solo de mandarlo en cada llamada.
2. Con el plan gratuito ("Hobby") de Vercel, los cron jobs corren con menos
   frecuencia — para que funcione cada hora como está configurado, necesitás
   el plan **Pro** (vos ya tenés uno en prueba). Si volvés al plan gratis más
   adelante, Vercel simplemente lo ejecuta con menor frecuencia, no se rompe.

## Migraciones (si ya tenías la base de datos creada)

Cada vez que sumamos una función nueva que toca la base de datos, vas a
encontrar un archivo `supabase/migration_00X.sql` — correlo una sola vez en
el SQL Editor de Supabase, además del `schema.sql` original (no hace falta
volver a correr el schema completo).

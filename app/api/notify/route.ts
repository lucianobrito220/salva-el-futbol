import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Este endpoint corre en el servidor con la service role key:
// es el único lugar autorizado a insertar en "notifications" (ver RLS)
// y el único lugar que conoce la clave privada VAPID para mandar push reales.
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { matchId } = await req.json();
    if (!matchId) {
      return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
    }

    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, city, zone, match_time, match_date, organizer_id')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    // Usuarios en la misma ciudad, excluyendo al organizador.
    // (La "disponibilidad horaria" del brief original se puede sumar más
    // adelante como columna de preferencias en profiles; por ahora se
    // filtra por ciudad, que es el criterio explícito del pedido.)
    const { data: candidates } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('city', match.city)
      .neq('id', match.organizer_id);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ notified: 0 });
    }

    const title = '⚽ Falta jugador cerca tuyo';
    const timeLabel = match.match_time.slice(0, 5);
    const body = `Faltan jugadores para hoy ${timeLabel} en ${match.zone}, ${match.city}.`;

    const rows = candidates.map((c) => ({
      user_id: c.id,
      title,
      body,
      match_id: match.id,
    }));
    await supabaseAdmin.from('notifications').insert(rows);

    // --- Web Push real ---
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    let pushed = 0;

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:hola@salvaelfutbol.app',
        vapidPublic,
        vapidPrivate
      );

      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth, user_id')
        .in('user_id', candidates.map((c) => c.id));

      if (subs) {
        await Promise.all(
          subs.map(async (s) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: s.endpoint,
                  keys: { p256dh: s.p256dh, auth: s.auth },
                },
                JSON.stringify({ title, body, url: `/partido/${match.id}` })
              );
              pushed++;
            } catch (err: any) {
              // Suscripción vencida o inválida: se limpia para no reintentar en vano.
              if (err.statusCode === 404 || err.statusCode === 410) {
                await supabaseAdmin.from('push_subscriptions').delete().eq('id', s.id);
              }
            }
          })
        );
      }
    }

    return NextResponse.json({ notified: candidates.length, pushed });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

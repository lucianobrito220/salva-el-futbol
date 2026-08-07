import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Vercel Cron llama a este endpoint periódicamente (ver vercel.json).
// Busca partidos que arrancan en ~2 horas y todavía no mandaron el
// recordatorio, y avisa al organizador + jugadores confirmados.
export async function GET(req: NextRequest) {
  // Protección simple: solo Vercel Cron (o vos manualmente) puede llamar esto.
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 90 * 60 * 1000); // +1h30
  const windowEnd = new Date(now.getTime() + 150 * 60 * 1000); // +2h30

  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('id, zone, city, match_date, match_time, organizer_id')
    .eq('status', 'open')
    .eq('reminder_sent', false);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ checked: 0, reminded: 0 });
  }

  const due = matches.filter((m) => {
    const dt = new Date(`${m.match_date}T${m.match_time}`);
    return dt >= windowStart && dt <= windowEnd;
  });

  let reminded = 0;

  for (const match of due) {
    const { data: accepted } = await supabaseAdmin
      .from('join_requests')
      .select('player_id')
      .eq('match_id', match.id)
      .eq('status', 'accepted');

    const userIds = [match.organizer_id, ...(accepted || []).map((a) => a.player_id)];
    const title = '⏰ Tu partido arranca en 2 horas';
    const body = `Hoy ${match.match_time.slice(0, 5)} en ${match.zone}, ${match.city}. ¡No te olvides!`;

    await supabaseAdmin.from('notifications').insert(
      userIds.map((uid) => ({ user_id: uid, title, body, match_id: match.id }))
    );

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:hola@salvaelfutbol.app',
        vapidPublic,
        vapidPrivate
      );
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .in('user_id', userIds);

      if (subs) {
        await Promise.all(
          subs.map((s) =>
            webpush
              .sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                JSON.stringify({ title, body, url: `/partido/${match.id}` })
              )
              .catch(() => {})
          )
        );
      }
    }

    await supabaseAdmin.from('matches').update({ reminder_sent: true }).eq('id', match.id);
    reminded++;
  }

  return NextResponse.json({ checked: matches.length, reminded });
}

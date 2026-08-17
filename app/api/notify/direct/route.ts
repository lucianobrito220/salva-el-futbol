import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId, matchId, body } = await req.json();

    if (!userId || !body) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const title = 'Notificación de Salvá el Fútbol';

    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      match_id: matchId || null,
      title,
      body,
      read: false
    });

    if (error) {
      console.error('Error insertando notificación:', error);
      return NextResponse.json({ error: 'Error al insertar notificación' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

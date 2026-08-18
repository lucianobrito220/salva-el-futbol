'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { AppNotification } from '@/lib/types';
import { ArrowLeft, Bell } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import Link from 'next/link';

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const time = new Date(dateString).getTime();
  const diffInSeconds = Math.max(0, Math.floor((now - time) / 1000));

  if (diffInSeconds < 60) {
    return 'Hace un momento';
  }
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) {
    return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  const years = Math.floor(days / 365);
  return `Hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

function getNotificationIcon(body: string, title?: string) {
  const text = `${title || ''} ${body || ''}`;
  const emojiRegex = /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}])/u;
  const match = text.match(emojiRegex);
  if (match) {
    return <span className="text-lg leading-none select-none">{match[0]}</span>;
  }

  const lower = text.toLowerCase();
  if (lower.includes('árbitro') || lower.includes('arbitro')) return <span className="text-lg leading-none select-none">🏁</span>;
  if (lower.includes('equipo') || lower.includes('reto')) return <span className="text-lg leading-none select-none">⚔️</span>;
  if (lower.includes('partido') || lower.includes('jugador') || lower.includes('arquero') || lower.includes('fútbol') || lower.includes('futbol') || lower.includes('sumás')) {
    return <span className="text-lg leading-none select-none">⚽</span>;
  }
  if (lower.includes('hora') || lower.includes('recordatorio') || lower.includes('tiempo')) return <span className="text-lg leading-none select-none">⏰</span>;
  if (lower.includes('torneo') || lower.includes('copa') || lower.includes('campeón')) return <span className="text-lg leading-none select-none">🏆</span>;
  if (lower.includes('punto') || lower.includes('salvapunto') || lower.includes('premio')) return <span className="text-lg leading-none select-none">🎁</span>;

  return <Bell size={18} strokeWidth={2.2} className="text-brand-dark" />;
}

export default function NotificacionesPage() {
  const router = useRouter();
  const { session, loading, clearUnreadNotifications } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    // Guest access allowed, handled in render
  }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setItems((data as AppNotification[]) || []);

      // Mark all as read locally and in DB
      clearUnreadNotifications();
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session!.user.id)
        .eq('read', false);
    }
    load();

    const channel = supabase
      .channel('my-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        (payload) => setItems((prev) => [payload.new as AppNotification, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  async function openNotification(n: AppNotification) {
    if (!n.read) await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    if (n.match_id) router.push(`/partido/${n.match_id}`);
  }

  if (loading) return null;
  
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center bg-bg pb-24">
        <Bell size={48} className="mb-4 text-inksoft opacity-20" />
        <h2 className="mb-2 font-display text-xl font-bold">Iniciá sesión</h2>
        <p className="text-sm text-inksoft">Necesitás una cuenta para ver tus notificaciones.</p>
        <Link href="/auth?next=/notificaciones" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white px-5 py-4">
        <button onClick={() => router.back()} className="press-fx text-ink"><ArrowLeft size={22} /></button>
        <h1 className="font-display text-lg font-extrabold text-ink">Notificaciones</h1>
      </header>

      <div className="pt-4">
        {items.length === 0 && (
          <div className="px-5 pt-4">
            <EmptyState icon="bell" title="Todavía no tenés notificaciones" subtitle="Te vamos a avisar cuando algo pase con tus partidos." />
          </div>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => openNotification(n)}
            className={`press-fx mx-5 mb-2.5 flex w-[calc(100%-40px)] items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
              !n.read
                ? 'border-brand/40 bg-brand-pale ring-2 ring-brand/30 shadow-sm'
                : 'border-line bg-white shadow-xs'
            }`}
          >
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
              !n.read ? 'bg-white shadow-xs' : 'bg-brand-pale text-brand-dark'
            }`}>
              {getNotificationIcon(n.body, n.title)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-snug ${!n.read ? 'font-bold text-ink' : 'font-medium text-ink'}`}>
                {n.body}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <small className="text-[11px] font-semibold text-inksoft">{getRelativeTime(n.created_at)}</small>
                {!n.read && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
